import { POLICY } from '../config/policy.js';
import { cancellationFee } from '../modules/bookings/booking.service.js';
import { shouldSuspend } from '../modules/safety/safety.service.js';
import { newId, nowIso } from '../store/db.js';
import type { Booking, Database, Role, Trip, User } from '../store/types.js';
import { BusinessError, ConflictError, ForbiddenError } from '../shared/errors/errors.js';
import { ACTIVE_TRIP_STATUSES, evaluateDriver, notify, systemAudit } from './domain.js';
import { distanceKm } from './geo.js';
import { buildQuoteSnapshot } from './quote.js';

/**
 * Booking/trip state machine (docs/veyro.md §11). Every function runs inside a
 * single synchronous `mutate()` call, which makes it atomic.
 */

function etaMinutes(fromKm: number): number {
  return Math.max(3, Math.round(((fromKm * 1.35) / 22) * 60));
}

/** Atomic first acceptance (§5.2 step 5, §5.3). */
export function acceptOffer(data: Database, bookingId: string, driverUserId: string, now = new Date()): Booking {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new BusinessError('This offer is no longer available.', 'OFFER_GONE');
  const driver = data.drivers.find((d) => d.id === driverUserId);
  if (!driver) throw new ForbiddenError('Driver profile not found.');

  if (booking.type === 'INSTANT') {
    if (booking.offeredDriverId !== driverUserId) throw new ForbiddenError('This offer was sent to another driver.');
    if (booking.status !== 'SEARCHING') throw new ConflictError('Already accepted or no longer available.');
    if (booking.offerExpiresAt && now.getTime() > new Date(booking.offerExpiresAt).getTime()) {
      throw new ConflictError('This offer has expired.');
    }
  } else {
    if (booking.status === 'ASSIGNED') throw new ConflictError('Already accepted by another driver.');
    if (booking.status !== 'SCHEDULED_BROADCASTING') throw new ConflictError('This scheduled request is not open for acceptance.');
  }

  const check = evaluateDriver(driver, {
    pickup: booking.pickup,
    vehicle: booking.vehicleSnapshot,
    type: booking.type,
    pickupAt: new Date(booking.pickupAt),
    durationMin: booking.quoteSnapshot.estimatedRouteMinutes,
  }, now);
  if (!check.eligible) {
    throw new BusinessError(`You are not currently eligible for this request (${check.reasons.join(', ')}).`, 'DRIVER_NOT_ELIGIBLE');
  }

  const trip: Trip = {
    id: newId('trp'),
    bookingId: booking.id,
    customerId: booking.customerId,
    driverId: driverUserId,
    status: booking.type === 'INSTANT' ? 'DRIVER_EN_ROUTE' : 'NOT_STARTED',
    arrivedAt: null,
    arrivalMethod: null,
    startedAt: null,
    endedAt: null,
    startOtp: null,
    endOtp: null,
    waitingFeeInr: 0,
    location: driver.presence,
    fare: null,
    rating: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  data.trips.push(trip);

  booking.status = 'ASSIGNED';
  booking.driverId = driverUserId;
  booking.acceptedAt = now.toISOString();
  booking.tripId = trip.id;
  booking.updatedAt = now.toISOString();
  if (booking.type === 'INSTANT') {
    booking.promisedArrivalAt = new Date(now.getTime() + etaMinutes(check.pickupDistanceKm) * 60_000).toISOString();
  } else {
    // Scheduled: freeze the accepting driver's rate (never above the customer's quoted cap).
    booking.quoteSnapshot = buildQuoteSnapshot(
      driver.hourlyRateInr,
      { distanceKm: booking.quoteSnapshot.estimatedRouteKm, durationMin: booking.quoteSnapshot.estimatedRouteMinutes, source: booking.quoteSnapshot.routeSource },
      now,
    );
  }
  const driverName = data.users.find((u) => u.id === driverUserId)?.name ?? 'Your driver';
  notify(
    data,
    booking.customerId,
    'BOOKING_CONFIRMED',
    'Driver confirmed',
    booking.type === 'INSTANT'
      ? `${driverName} accepted and is heading to your pickup.`
      : `${driverName} accepted your scheduled ride for ${new Date(booking.pickupAt).toLocaleString('en-IN')}.`,
    `/customer/trips/${trip.id}`,
  );
  return booking;
}

export function rejectOffer(data: Database, bookingId: string, driverUserId: string): Booking {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new BusinessError('This offer is no longer available.', 'OFFER_GONE');
  if (booking.type === 'INSTANT') {
    if (booking.offeredDriverId !== driverUserId) throw new ForbiddenError('This offer was sent to another driver.');
    if (booking.status !== 'SEARCHING') throw new ConflictError('This offer is no longer open.');
    booking.status = 'EXPIRED';
    booking.offerOutcome = 'REJECTED';
    booking.updatedAt = nowIso();
    notify(data, booking.customerId, 'OFFER_DECLINED', 'Driver unavailable', 'Your selected driver declined. Choose another driver from the list.', `/customer/bookings/${booking.id}`);
  } else if (!booking.declinedBy.includes(driverUserId)) {
    booking.declinedBy.push(driverUserId);
  }
  return booking;
}

function suspendCustomerIfNeeded(data: Database, customer: User): void {
  if (customer.status === 'ACTIVE' && shouldSuspend(customer.customerCancellationCount)) {
    customer.status = 'SUSPENDED';
    customer.suspendedAt = nowIso();
    customer.suspensionReason = `Automatic suspension: ${customer.customerCancellationCount} qualifying cancellations (DEC-05).`;
    systemAudit(data, {
      action: 'CUSTOMER_AUTO_SUSPENDED',
      entityType: 'customer',
      entityId: customer.id,
      before: 'ACTIVE',
      after: 'SUSPENDED',
      reason: customer.suspensionReason,
    });
    notify(data, customer.id, 'ACCOUNT_STATUS', 'Account suspended', 'Your account was suspended after repeated cancellations. Contact support to request a review.');
  }
}

export function cancelBooking(
  data: Database,
  booking: Booking,
  actor: { id: string; role: Role },
  reason: string,
  note: string,
  now = new Date(),
): { feeInr: number } {
  const trip = booking.tripId ? data.trips.find((t) => t.id === booking.tripId) : undefined;
  if (trip && (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED')) {
    throw new ConflictError('A trip that has started cannot be cancelled.');
  }
  if (!['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED', 'NEEDS_REBOOK'].includes(booking.status)) {
    throw new ConflictError('This booking can no longer be cancelled.');
  }

  let feeInr = 0;
  if (actor.role === 'CUSTOMER') {
    feeInr = cancellationFee(
      {
        type: booking.type,
        acceptedAt: booking.acceptedAt ? new Date(booking.acceptedAt) : null,
        arrivedAt: trip?.arrivedAt ? new Date(trip.arrivedAt) : null,
      },
      now,
      reason,
    );
  }
  booking.status = actor.role === 'DRIVER' ? 'CANCELLED_BY_DRIVER' : 'CANCELLED_BY_CUSTOMER';
  booking.cancellation = { by: actor.role, reason, note, feeInr, at: now.toISOString() };
  booking.updatedAt = now.toISOString();
  if (trip) {
    trip.status = 'CANCELLED';
    trip.updatedAt = now.toISOString();
    trip.startOtp = null;
    trip.endOtp = null;
  }

  if (feeInr > 0) {
    data.ledger.push({
      id: newId('led'), ownerId: booking.customerId, ownerRole: 'CUSTOMER', tripId: trip?.id ?? null, bookingId: booking.id,
      type: 'CANCELLATION_FEE', amountInr: feeInr, status: 'UNPAID', reason: `Cancellation fee (${POLICY.versions.cancellation})`,
      disputeStatus: 'NONE', linkedReportId: null, paymentId: null, createdAt: now.toISOString(),
    });
    if (booking.driverId) {
      data.ledger.push({
        id: newId('led'), ownerId: booking.driverId, ownerRole: 'DRIVER', tripId: trip?.id ?? null, bookingId: booking.id,
        type: 'DRIVER_EARNING', amountInr: feeInr, status: 'CREDITED', reason: 'Late cancellation compensation (0% commission)',
        disputeStatus: 'NONE', linkedReportId: null, paymentId: null, createdAt: now.toISOString(),
      });
    }
  }

  // Qualifying customer incidents: cancellations after a driver was assigned,
  // excluding cancellations caused by driver lateness/no-show.
  if (actor.role === 'CUSTOMER' && booking.acceptedAt && reason !== 'DRIVER_LATE' && reason !== 'DRIVER_NO_SHOW') {
    const customer = data.users.find((u) => u.id === booking.customerId);
    if (customer) {
      customer.customerCancellationCount += 1;
      suspendCustomerIfNeeded(data, customer);
    }
  }

  const otherParty = actor.role === 'CUSTOMER' ? booking.driverId : booking.customerId;
  if (otherParty) {
    notify(
      data,
      otherParty,
      'BOOKING_CANCELLED',
      'Booking cancelled',
      actor.role === 'CUSTOMER'
        ? 'The customer cancelled this booking.'
        : 'Your driver had to cancel. You have not been charged and can book another driver now.',
      actor.role === 'CUSTOMER' ? '/driver' : `/customer/bookings/${booking.id}`,
    );
  }
  return { feeInr };
}

/** Verified driver no-show (§5.6) — counts toward the 5th-incident suspension. */
export function recordDriverNoShow(data: Database, booking: Booking, now = new Date()): void {
  const trip = booking.tripId ? data.trips.find((t) => t.id === booking.tripId) : undefined;
  booking.status = 'DRIVER_NO_SHOW';
  booking.cancellation = { by: 'CUSTOMER', reason: 'DRIVER_NO_SHOW', note: 'Driver not confirmed arrived by the grace deadline.', feeInr: 0, at: now.toISOString() };
  booking.updatedAt = now.toISOString();
  if (trip) {
    trip.status = 'DRIVER_NO_SHOW';
    trip.updatedAt = now.toISOString();
  }
  const driver = data.drivers.find((d) => d.id === booking.driverId);
  if (!driver) return;
  driver.verifiedNoShowCount += 1;
  systemAudit(data, {
    action: 'DRIVER_NO_SHOW_RECORDED', entityType: 'driver', entityId: driver.id,
    before: String(driver.verifiedNoShowCount - 1), after: String(driver.verifiedNoShowCount),
    reason: `Booking ${booking.id}: not arrived by deadline.`,
  });
  notify(data, driver.id, 'ACCOUNT_STATUS', 'No-show recorded', `You did not arrive for booking ${booking.id.slice(-6)} in time. Incident ${driver.verifiedNoShowCount} of 5.`);
  if (!driver.isSuspended && shouldSuspend(driver.verifiedNoShowCount)) {
    driver.isSuspended = true;
    driver.isOnline = false;
    driver.suspendedAt = now.toISOString();
    driver.suspensionReason = `Automatic suspension: ${driver.verifiedNoShowCount} verified no-shows (DEC-05).`;
    systemAudit(data, {
      action: 'DRIVER_AUTO_SUSPENDED', entityType: 'driver', entityId: driver.id,
      before: 'ACTIVE', after: 'SUSPENDED', reason: driver.suspensionReason,
    });
  }
}

/**
 * Time-based transitions (would be Cloud Scheduler functions in production):
 * instant offer expiry, scheduled broadcast start, NEEDS_REBOOK at pickup − 2h.
 */
export function sweep(data: Database, now = new Date()): void {
  const t = now.getTime();
  for (const b of data.bookings) {
    if (b.status === 'SEARCHING' && b.offerExpiresAt && t > new Date(b.offerExpiresAt).getTime()) {
      b.status = 'EXPIRED';
      b.offerOutcome = 'EXPIRED';
      b.updatedAt = now.toISOString();
      notify(data, b.customerId, 'OFFER_EXPIRED', 'No response from driver', 'The driver did not respond within 5 minutes. Pick another driver.', `/customer/bookings/${b.id}`);
    } else if (b.status === 'SCHEDULED_QUEUED' && b.broadcastStartAt && t >= new Date(b.broadcastStartAt).getTime()) {
      b.status = 'SCHEDULED_BROADCASTING';
      b.updatedAt = now.toISOString();
    }
    if (b.status === 'SCHEDULED_BROADCASTING' && b.broadcastEndAt && t >= new Date(b.broadcastEndAt).getTime()) {
      b.status = 'NEEDS_REBOOK';
      b.updatedAt = now.toISOString();
      notify(data, b.customerId, 'NEEDS_REBOOK', 'No driver accepted', 'No driver accepted your scheduled request. Choose a new time, try an instant driver or cancel at no charge.', `/customer/bookings/${b.id}`);
    }
  }
  // Active-location retention (DEC-11): clear live location once trips end.
  for (const trip of data.trips) {
    if (!ACTIVE_TRIP_STATUSES.includes(trip.status) && trip.status !== 'NOT_STARTED' && trip.location) {
      trip.location = null;
    }
  }
  // Share links expire at trip completion.
  for (const link of data.shareLinks) {
    if (link.revokedAt) continue;
    const trip = data.trips.find((x) => x.id === link.tripId);
    if (trip && !ACTIVE_TRIP_STATUSES.includes(trip.status) && trip.status !== 'NOT_STARTED') link.revokedAt = now.toISOString();
  }
}

export function driverEtaMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  return etaMinutes(distanceKm(from, to));
}
