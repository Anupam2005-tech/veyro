import { bookingPolicyVersions } from '../../config/approved-policies.js';
import { requireRole } from '../../middleware/require-role.js';
import { MobilityService } from '../mobility/mobility-service.js';
import { googleRoadProvider } from '../mobility/geo.js';
import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { activeRoles } from '../auth/profile.js';
import { documentId, storeBookingQuote } from '../quotes/quote-repository.js';
import { BookingCore } from './booking-core.js';
import { bookingChecks } from './booking-checks.js';
import { TripService } from '../trips/trip-service.js';

function id(value: unknown): string {
  try { if (typeof value !== 'string') throw Error(); return documentId(value); }
  catch { throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid resource identifier.'); }
}
export function createBookingRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  const service = () => new BookingCore(db(), bookingChecks(db()));
  router.post('/bookings/quotes', async (req, res, next) => {
    try {
      const customerId = req.auth!.uid;
      const vehicleId = id(req.body?.vehicleId), routeId = id(req.body?.routeId);
      const selectedDriverId = req.body?.driverId == null ? null : id(req.body.driverId);
      const cap = req.body?.maxHourlyRateInr;
      if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 0) {
        throw new AppError(400, 'INVALID_RATE_CAP', 'Provide a non-negative maximum hourly rate.');
      }
      const quote = await db().runTransaction(async tx => {
        const route = await tx.get(db().collection('routeQuotes').doc(routeId));
        const policy = await tx.get(db().collection('runtimePolicies').doc('booking'));
        if (route.get('pickupAt') != null && selectedDriverId !== null) {
          throw new AppError(400, 'SCHEDULED_DRIVER_SELECTION', 'Scheduled offers use a rate cap and eligible broadcast.');
        }
        const versions = policy.exists ? policy.data()! : bookingPolicyVersions;
        if (![route.get('distanceKm'), route.get('durationMinutes')].every(v => Number.isFinite(v) && v >= 0) ||
            !['waitingPolicyVersion', 'cancellationPolicyVersion', 'platformFeeConfigVersion'].every(k =>
              typeof versions[k as keyof typeof bookingPolicyVersions] === 'string' && versions[k as keyof typeof bookingPolicyVersions].trim())) {
          throw new AppError(503, 'BOOKING_CONFIG_UNAVAILABLE', 'Verified route and policy configuration are required.');
        }
        const fare = {
          hourlyRateInr: cap, estimatedRouteKm: route.get('distanceKm'), estimatedRouteMinutes: route.get('durationMinutes'),
          waitingPolicyVersion: versions.waitingPolicyVersion, cancellationPolicyVersion: versions.cancellationPolicyVersion,
          platformFeeConfigVersion: versions.platformFeeConfigVersion, quotedAt: new Date().toISOString(),
          pricing_mode: 'HOURLY' as const, estimatedBaseFareInr: 0,
        };
        const record = { customerId, vehicleId, routeId, selectedDriverId, fare };
        await bookingChecks(db()).verifyCreation(tx, record);
        // The selected driver's actual rate becomes the instant quote rate.
        if (selectedDriverId) {
          const driver = await tx.get(db().collection('drivers').doc(selectedDriverId));
          fare.hourlyRateInr = driver.get('hourlyRateInr');
        }
        return record;
      });
      const quoteId = await storeBookingQuote(db(), quote, { ...quote.fare });
      const stored = await db().collection('bookingQuotes').doc(quoteId).get();
      sendSuccess(res, { quoteId, fare: stored.get('fare') }, 'Quote ready.');
    } catch (error) { next(error); }
  });
  router.post('/bookings', async (req, res, next) => {
    try {
      const pickup = req.body?.pickupAt ?? null;
      if (pickup !== null && !Number.isSafeInteger(pickup)) throw new AppError(400, 'INVALID_PICKUP_TIME', 'Pickup must be a server-compatible millisecond timestamp.');
      const bookingId = await service().create(req.auth!.uid, id(req.body?.quoteId), pickup);
      sendSuccess(res, { bookingId }, 'Booking created.');
    } catch (error) { next(error); }
  });
  router.get('/bookings/:id', async (req, res, next) => {
    try {
      const record = await db().collection('bookings').doc(id(req.params.id)).get();
      if (!record.exists || ![record.get('customerId'), record.get('driverId')].includes(req.auth!.uid)) {
        throw new AppError(404, 'BOOKING_NOT_ACCESSIBLE', 'Booking unavailable.');
      }
      sendSuccess(res, { id: record.id, ...record.data() });
    } catch (error) { next(error); }
  });
  router.post('/driver-offers/:id/accept', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const bookingId = id(req.params.id), uid = req.auth!.uid;
      const booking = await db().collection('bookings').doc(bookingId).get();
      if (booking.get('status') === 'ASSIGNED' && booking.get('driverId') === uid) {
        await new TripService(db()).initialize(bookingId, uid);
        sendSuccess(res, { assigned: true }); return;
      }
      const offer = await booking.ref.collection('offers').doc(uid).get();
      if (!offer.exists || offer.get('status') !== 'OPEN' || !['SEARCHING', 'SCHEDULED_BROADCASTING'].includes(booking.get('status')) || booking.get('closesAt') <= Date.now()) throw new AppError(404, 'OFFER_UNAVAILABLE', 'Offer unavailable.');
      const eligibility = await db().collection('driverEligibility').doc(uid).collection('vehicles').doc(booking.get('vehicleId')).get();
      if (eligibility.get('routeId') !== booking.get('routeId') || eligibility.get('expiresAt') <= Date.now() || !eligibility.exists) {
        await new MobilityService(db(), googleRoadProvider()).eligibility(booking.get('customerId'), uid, booking.get('routeId'), true);
      }
      await service().accept(bookingId, uid);
      await new TripService(db()).initialize(bookingId, uid);
      sendSuccess(res, { assigned: true });
    }
    catch (error) { next(error); }
  });
  router.post('/driver-offers/:id/reject', requireRole('DRIVER'), async (req, res, next) => {
    try { await service().rejectOffer(id(req.params.id), req.auth!.uid); sendSuccess(res, { rejected: true }); }
    catch (error) { next(error); }
  });
  router.post('/bookings/:id/cancel', async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      const roles = activeRoles((await db().collection('users').doc(uid).get()).data());
      const record = await db().collection('bookings').doc(id(req.params.id)).get();
      const role = record.get('customerId') === uid ? 'CUSTOMER' : 'DRIVER';
      if (!roles.includes(role)) throw new AppError(403, 'ROLE_FORBIDDEN', 'Booking role required.');
      if (typeof req.body?.reason !== 'string' || req.body.reason.length > 100 ||
          (req.body.description != null && (typeof req.body.description !== 'string' || req.body.description.length > 2000))) {
        throw new AppError(400, 'INVALID_REASON', 'Provide an approved reason and optional short description.');
      }
      const feeInr = await service().cancel(id(req.params.id), uid, role, req.body.reason, req.body.description ?? '');
      sendSuccess(res, { cancelled: true, feeInr });
    } catch (error) { next(error); }
  });
  return router;
}
