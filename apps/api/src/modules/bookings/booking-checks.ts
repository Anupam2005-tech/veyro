import { bookingPolicyVersions, customerCancellationReasons, driverCancellationReasons } from '../../config/approved-policies.js';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles } from '../auth/profile.js';
import { createHourlyQuoteSnapshot } from '../quotes/hourly-quote-snapshot.js';
import { type BookingQuote } from '../quotes/quote-repository.js';
import { type BookingChecks } from './booking-core.js';

const unavailable = () => new AppError(409, 'BOOKING_INPUT_UNAVAILABLE', 'Verified vehicle, route or driver eligibility is unavailable.');

export function bookingChecks(db: Firestore, now: () => number = Date.now): BookingChecks {
  async function customer(tx: Transaction, quote: BookingQuote, fresh = true) {
    const user = await tx.get(db.collection('users').doc(quote.customerId));
    const vehicle = await tx.get(db.collection('vehicles').doc(quote.vehicleId));
    const route = await tx.get(db.collection('routeQuotes').doc(quote.routeId));
    if (!activeRoles(user.data()).includes('CUSTOMER') || vehicle.get('customerId') !== quote.customerId ||
        route.get('verified') !== true || route.get('customerId') !== quote.customerId ||
        route.get('vehicleId') !== quote.vehicleId || fresh && route.get('expiresAt') <= now()) throw unavailable();
    if (!Number.isSafeInteger(route.get('expiresAt'))) throw unavailable();
    return { vehicle, route };
  }

  async function driver(tx: Transaction, quote: BookingQuote, driverId: string, fresh = true) {
    const { vehicle, route } = await customer(tx, quote, fresh);
    const user = await tx.get(db.collection('users').doc(driverId));
    const profile = await tx.get(db.collection('drivers').doc(driverId));
    const availability = await tx.get(db.collection('driverAvailability').doc(driverId));
    const compatibility = await tx.get(db.collection('driverEligibility').doc(driverId)
      .collection('vehicles').doc(quote.vehicleId));
    const at = now();
    if (!activeRoles(user.data()).includes('DRIVER') || profile.get('approvalStatus') !== 'APPROVED' ||
        availability.get('online') !== true || !Number.isSafeInteger(availability.get('updatedAt')) ||
        at - availability.get('updatedAt') > 30_000 || at < availability.get('updatedAt') ||
        compatibility.get('eligible') !== true || compatibility.get('routeId') !== quote.routeId ||
        compatibility.get('vehicleCategory') !== vehicle.get('category') ||
        compatibility.get('transmission') !== vehicle.get('transmission') ||
        !Number.isSafeInteger(compatibility.get('expiresAt')) || compatibility.get('expiresAt') <= at) throw unavailable();
    if (compatibility.get('driverRevision') != null && compatibility.get('driverRevision') !== profile.updateTime?.toMillis()) throw unavailable();
    if (Array.isArray(profile.get('categories')) && !profile.get('categories').includes(vehicle.get('category'))) throw unavailable();
    if (Array.isArray(profile.get('transmissions')) && !profile.get('transmissions').includes(vehicle.get('transmission'))) throw unavailable();
    const distance = compatibility.get('pickupDistanceKm');
    const approvedRadius = route.get('searchRadiusKm') ?? 15;
    if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(approvedRadius) || approvedRadius < 15 ||
        distance > approvedRadius || (approvedRadius > 15 && route.get('customerExpandedRadius') !== true)) throw unavailable();
    const rate = profile.get('hourlyRateInr');
    if (!Number.isFinite(rate) || rate < 0 || rate > quote.fare.hourlyRateInr) throw unavailable();
    return createHourlyQuoteSnapshot({ ...quote.fare, hourlyRateInr: rate,
      quotedAt: new Date(quote.fare.quotedAt) });
  }

  return {
    async verifyCreation(tx, quote, pickupAt) {
      const { route } = await customer(tx, quote);
      if (pickupAt !== undefined && route.get('pickupAt') !== undefined && route.get('pickupAt') !== pickupAt) {
        throw new AppError(409, 'PICKUP_CHANGED', 'Obtain a new quote for the changed pickup time.');
      }
      if (quote.selectedDriverId) await driver(tx, quote, quote.selectedDriverId);
    },
    async verifyAcceptance(tx, booking, driverId) {
      return driver(tx, booking, driverId, false);
    },
    async promisedArrival(tx, booking, driverId) {
      if (booking.pickupAt !== null) return booking.pickupAt;
      const evidence = await tx.get(db.collection('driverEligibility').doc(driverId)
        .collection('vehicles').doc(booking.vehicleId));
      const minutes = evidence.get('pickupEtaMinutes');
      if (!Number.isFinite(minutes) || minutes < 0 || !Number.isSafeInteger(now() + Math.ceil(minutes * 60_000))) throw unavailable();
      return now() + Math.ceil(minutes * 60_000);
    },
    async cancellationFacts(tx, id, version, role, reason) {
      const policy = await tx.get(db.collection('cancellationPolicies').doc(version));
      const trip = await tx.get(db.collection('trips').doc(id));
      const approved = version === bookingPolicyVersions.cancellationPolicyVersion || version === 'DEC-05';
      if (!approved && policy.get('feeSchedule') !== 'DEC-05') {
        throw new AppError(422, 'CANCELLATION_POLICY_PENDING', 'Cancellation fee policy must be approved.');
      }
      let allowed: unknown = [];
      if (policy.exists) allowed = policy.get(role === 'CUSTOMER' ? 'customerReasons' : 'driverReasons');
      else if (approved && role === 'CUSTOMER') allowed = customerCancellationReasons;
      else if (approved && role === 'DRIVER') allowed = driverCancellationReasons;
      if (!Array.isArray(allowed) || !allowed.includes(reason)) {
        throw new AppError(422, 'CANCELLATION_POLICY_PENDING', 'Choose an approved cancellation reason.');
      }
      if (trip.exists && !['DRIVER_EN_ROUTE', 'ARRIVED', 'DRIVER_NO_SHOW'].includes(trip.get('status'))) {
        throw new AppError(409, 'TRIP_STATE_CONFLICT', 'Cancellation is unavailable at this trip stage.');
      }
      return { arrived: trip.get('arrivedAt') != null, verifiedDriverNoShow: trip.get('status') === 'DRIVER_NO_SHOW' };
    },
  };
}
