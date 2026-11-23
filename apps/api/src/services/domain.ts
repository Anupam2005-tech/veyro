import { POLICY } from '../config/policy.js';
import { appendAdminAudit } from '../modules/audit/audit.service.js';
import type { AdminAuditRecord } from '../modules/audit/audit.repository.js';
import { evaluateOfferEligibility, isPresenceFresh } from '../modules/availability/availability.service.js';
import type { AvailabilityBlockReason } from '../modules/availability/availability.types.js';
import { vehicleCompatible } from '../modules/vehicles/vehicle.service.js';
import { db, newId, nowIso } from '../store/db.js';
import type { Booking, Database, Driver, Place, Trip, User } from '../store/types.js';
import { distanceKm } from './geo.js';

export const ACTIVE_TRIP_STATUSES: readonly Trip['status'][] = ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
export const OPEN_BOOKING_STATUSES: readonly Booking['status'][] = [
  'SEARCHING',
  'SCHEDULED_QUEUED',
  'SCHEDULED_BROADCASTING',
  'ASSIGNED',
  'NEEDS_REBOOK',
];

export function notify(data: Database, userId: string, type: string, title: string, body: string, link: string | null = null): void {
  data.notifications.push({ id: newId('ntf'), userId, type, title, body, link, readAt: null, createdAt: nowIso() });
}

export function findUser(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}

export function findDriver(id: string): Driver | undefined {
  return db().drivers.find((d) => d.id === id);
}

export function rating(driver: Pick<Driver, 'ratingSum' | 'ratingCount'>): number | null {
  return driver.ratingCount ? Math.round((driver.ratingSum / driver.ratingCount) * 10) / 10 : null;
}

export function presenceFresh(driver: Driver, now = new Date()): boolean {
  if (!driver.presence) return false;
  return isPresenceFresh({ hasLocationPermission: true, lastLocationAt: new Date(driver.presence.capturedAt) }, now);
}

export function activeTripForDriver(driverId: string): Trip | undefined {
  return db().trips.find((t) => t.driverId === driverId && ACTIVE_TRIP_STATUSES.includes(t.status));
}

/** Confirmed unpaid balance; disputed entries under review are excluded (§5.5). */
export function outstandingBalance(customerId: string): number {
  return db()
    .ledger.filter(
      (e) => e.ownerId === customerId && e.ownerRole === 'CUSTOMER' && e.status === 'UNPAID' && e.disputeStatus !== 'UNDER_REVIEW',
    )
    .reduce((sum, e) => sum + e.amountInr, 0);
}

export interface EligibilityInput {
  pickup: Place;
  vehicle: { category: string; transmission: string };
  type: Booking['type'];
  pickupAt: Date;
  durationMin: number;
}

/** Whether a scheduled booking window overlaps another of the driver's assignments. */
function hasScheduleConflict(driverId: string, pickupAt: Date, durationMin: number): boolean {
  const start = pickupAt.getTime() - 60 * 60 * 1000;
  const end = pickupAt.getTime() + (durationMin + 60) * 60 * 1000;
  return db().bookings.some((b) => {
    if (b.driverId !== driverId || b.status !== 'ASSIGNED') return false;
    const t = new Date(b.pickupAt).getTime();
    const bEnd = t + (b.quoteSnapshot.estimatedRouteMinutes + 60) * 60 * 1000;
    return t < end && bEnd > start;
  });
}

/**
 * Driver eligibility (§5.1). Reuses the BE-010 availability evaluator and adds
 * service-area, vehicle and conflict signals from verified server state.
 */
export function evaluateDriver(driver: Driver, input: EligibilityInput, now = new Date()) {
  const fresh = presenceFresh(driver, now);
  const instant = input.type === 'INSTANT';
  const hasActiveTrip = instant
    ? Boolean(activeTripForDriver(driver.id))
    : hasScheduleConflict(driver.id, input.pickupAt, input.durationMin);
  const serviceAreaIncludesPickup = distanceKm(driver.serviceArea, input.pickup) <= driver.serviceArea.radiusKm;
  const supportsVehicle = vehicleCompatible(
    { category: input.vehicle.category as never, transmission: input.vehicle.transmission as never },
    driver.categories,
    driver.transmissions,
  );
  const result = evaluateOfferEligibility(
    { approvalStatus: driver.approvalStatus === 'DRAFT' ? 'PENDING_REVIEW' : driver.approvalStatus, isSuspended: driver.isSuspended },
    {
      // Scheduled offers are matched on profile; live GPS matters at pickup time.
      hasLocationPermission: instant ? driver.presence !== null : true,
      lastLocationAt: instant ? (driver.presence ? new Date(driver.presence.capturedAt) : null) : now,
      hasActiveTrip,
      serviceAreaIncludesPickup,
      supportsVehicle,
      meetsLeadTime: true,
    },
    instant ? (driver.isOnline ? 'ONLINE' : 'OFFLINE') : 'ONLINE',
    now,
  );
  const reasons: (AvailabilityBlockReason | 'OFFLINE')[] = [...result.reasons];
  if (instant && !driver.isOnline) reasons.push('OFFLINE');
  return {
    eligible: reasons.length === 0,
    reasons,
    fresh,
    pickupDistanceKm: driver.presence ? distanceKm(driver.presence, input.pickup) : distanceKm(driver.serviceArea, input.pickup),
  };
}

/** Admin audit write through the BE-029 audit service with a local-store adapter. */
export function audit(
  data: Database,
  admin: User,
  change: { action: string; entityType: string; entityId: string; before: string | null; after: string | null; reason: string },
): void {
  type Ref = { id: string };
  const store = { collection: (_path: string) => ({ doc: (id: string): Ref => ({ id }) }) };
  const tx = {
    create: (ref: Ref, record: AdminAuditRecord) => {
      data.auditLogs.push({ id: ref.id, ...record, createdAt: record.createdAt.toISOString() });
    },
  };
  appendAdminAudit(store, tx, { uid: admin.id, roles: [admin.role] }, newId('aud'), change);
}

/** System-initiated audit entry (automatic suspensions etc.). */
export function systemAudit(
  data: Database,
  change: { action: string; entityType: string; entityId: string; before: string | null; after: string | null; reason: string },
): void {
  data.auditLogs.push({ id: newId('aud'), adminId: 'SYSTEM', ...change, createdAt: nowIso() });
}

export function bookingDurationMin(b: Booking): number {
  return b.quoteSnapshot.estimatedRouteMinutes;
}

export const policyPublic = {
  versions: POLICY.versions,
  searchRadiusKm: POLICY.searchRadiusKm,
  radiusExpansionStepKm: POLICY.radiusExpansionStepKm,
  instantOfferMinutes: POLICY.instantOfferMs / 60_000,
  scheduledMinLeadHours: POLICY.scheduledMinLeadMs / 3_600_000,
  scheduledMaxLeadDays: POLICY.scheduledMaxLeadMs / 86_400_000,
  broadcastStartHoursBefore: POLICY.broadcastStartBeforePickupMs / 3_600_000,
  broadcastEndHoursBefore: POLICY.broadcastEndBeforePickupMs / 3_600_000,
  waitFreeMin: POLICY.waitFreeMin,
  waitMaxMin: POLICY.waitMaxMin,
  waitFeeInr: POLICY.waitFeeInr,
  noShowFeeInr: POLICY.noShowFeeInr,
  driverArrivalGraceMin: POLICY.driverArrivalGraceMin,
  cancelFreeAfterAcceptMin: POLICY.cancelFreeAfterAcceptMin,
  cancelBeforeArrivalFeeInr: POLICY.cancelBeforeArrivalFeeInr,
  cancelAfterArrivalFeeInr: POLICY.cancelAfterArrivalFeeInr,
  instantCancelFeeInr: POLICY.instantCancelFeeInr,
  driverCommissionPct: POLICY.driverCommissionPct,
  customerPlatformFeeInr: POLICY.customerPlatformFeeInr,
  arrivalGeofenceM: POLICY.arrivalGeofenceM,
  locationStaleSeconds: POLICY.locationStaleMs / 1000,
  sosMode: POLICY.sosMode,
};
