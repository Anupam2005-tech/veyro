export const AVAILABILITY_ONLINE = 'ONLINE' as const;
export const AVAILABILITY_OFFLINE = 'OFFLINE' as const;

export type AvailabilityStatus =
  | typeof AVAILABILITY_ONLINE
  | typeof AVAILABILITY_OFFLINE;

export const DRIVER_APPROVED = 'APPROVED' as const;

export type DriverApprovalStatus =
  | typeof DRIVER_APPROVED
  | 'PENDING_REVIEW'
  | 'NEEDS_CHANGES'
  | 'REJECTED'
  | 'DEACTIVATED'
  | 'SUSPENDED';

/**
 * Minimal verified driver account snapshot.
 * Owned by BE-007 (Team 1) + BE-001/BE-002 (Team 2 auth).
 * BE-010 must receive this from the caller after verified auth;
 * it never trusts client-supplied roles.
 */
export interface DriverAccountSnapshot {
  readonly approvalStatus: DriverApprovalStatus;
  readonly isSuspended: boolean;
}

/**
 * Presence/freshness signals for offer eligibility.
 * Firestore remains authoritative for trip assignment;
 * RTDB holds only ephemeral presence/location.
 */
export interface AvailabilitySignals {
  readonly hasLocationPermission: boolean;
  readonly lastLocationAt: Date | null;
  readonly hasActiveTrip: boolean;
  readonly serviceAreaIncludesPickup: boolean;
  readonly supportsVehicle: boolean;
  readonly meetsLeadTime: boolean;
}

export type AvailabilityBlockReason =
  | 'NOT_APPROVED'
  | 'ACCOUNT_SUSPENDED'
  | 'LOCATION_PERMISSION_MISSING'
  | 'LOCATION_STALE'
  | 'ACTIVE_TRIP_CONFLICT'
  | 'OUT_OF_SERVICE_AREA'
  | 'VEHICLE_UNSUPPORTED'
  | 'LEAD_TIME_UNMET';

/** Suggested stale cutoff: 30 seconds without a valid sample. */
export const LOCATION_STALE_CUTOFF_MS = 30_000;

/** Max tolerated future clock skew before a sample is treated as invalid. */
export const LOCATION_FUTURE_TOLERANCE_MS = 5_000;
