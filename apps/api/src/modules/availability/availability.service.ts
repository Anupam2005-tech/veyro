import {
  AVAILABILITY_ONLINE,
  DRIVER_APPROVED,
  LOCATION_FUTURE_TOLERANCE_MS,
  LOCATION_STALE_CUTOFF_MS,
  type AvailabilityBlockReason,
  type AvailabilitySignals,
  type AvailabilityStatus,
  type DriverAccountSnapshot,
} from './availability.types.js';

export interface OnlineGate {
  readonly allowed: boolean;
  readonly reason?: AvailabilityBlockReason;
}

export interface OfferEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly AvailabilityBlockReason[];
}

/**
 * Account gate for going ONLINE.
 * Enforces approval/account restrictions from Team 2 contracts.
 * Does not check GPS, trips, or service area — those are presence/offer signals.
 */
export function canSetOnline(account: DriverAccountSnapshot): OnlineGate {
  if (account.approvalStatus !== DRIVER_APPROVED) {
    return { allowed: false, reason: 'NOT_APPROVED' };
  }
  if (account.isSuspended) {
    return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
  }
  return { allowed: true };
}

/**
 * Presence freshness per Unified Spec §5.1 + §5.10.
 * Fresh = permission granted + sample within 30s + not implausibly in the future.
 * Stale GPS must freeze the marker, never animate as live (handled by Team 1 UI).
 */
export function isPresenceFresh(
  signals: Pick<AvailabilitySignals, 'hasLocationPermission' | 'lastLocationAt'>,
  now: Date = new Date(),
): boolean {
  if (!signals.hasLocationPermission) {
    return false;
  }
  const sample = signals.lastLocationAt;
  if (!(sample instanceof Date) || Number.isNaN(sample.getTime())) {
    return false;
  }
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || Number.isNaN(nowMs)) {
    throw new RangeError('Reference time must be a valid date');
  }
  const elapsedMs = nowMs - sample.getTime();
  if (elapsedMs < -LOCATION_FUTURE_TOLERANCE_MS) {
    return false;
  }
  return elapsedMs <= LOCATION_STALE_CUTOFF_MS;
}

/**
 * Presence + availability signals for offer display.
 * Final booking eligibility, reservation conflicts and atomic
 * assignment belong to BE-012 (Team 2) — this result is advisory
 * for search/display and must be re-checked transactionally.
 */
export function evaluateOfferEligibility(
  account: DriverAccountSnapshot,
  signals: AvailabilitySignals,
  requestedStatus: AvailabilityStatus,
  now: Date = new Date(),
): OfferEligibility {
  const reasons: AvailabilityBlockReason[] = [];

  const gate = canSetOnline(account);
  if (!gate.allowed && gate.reason) {
    reasons.push(gate.reason);
  }

  if (requestedStatus !== AVAILABILITY_ONLINE) {
    return { eligible: false, reasons };
  }

  if (!signals.hasLocationPermission) {
    reasons.push('LOCATION_PERMISSION_MISSING');
  } else if (!isPresenceFresh(signals, now)) {
    reasons.push('LOCATION_STALE');
  }

  if (signals.hasActiveTrip) {
    reasons.push('ACTIVE_TRIP_CONFLICT');
  }
  if (!signals.serviceAreaIncludesPickup) {
    reasons.push('OUT_OF_SERVICE_AREA');
  }
  if (!signals.supportsVehicle) {
    reasons.push('VEHICLE_UNSUPPORTED');
  }
  if (!signals.meetsLeadTime) {
    reasons.push('LEAD_TIME_UNMET');
  }

  return { eligible: reasons.length === 0, reasons: Object.freeze(reasons) };
}

export function parseAvailabilityStatus(value: unknown): AvailabilityStatus {
  if (value === AVAILABILITY_ONLINE) {
    return AVAILABILITY_ONLINE;
  }
  if (value === 'OFFLINE') {
    return 'OFFLINE';
  }
  throw new RangeError('Availability status must be ONLINE or OFFLINE');
}
