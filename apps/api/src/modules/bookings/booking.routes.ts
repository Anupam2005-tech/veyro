import { Router, type Request } from 'express';
import { body } from 'express-validator';
import { CANCELLATION_REASONS, POLICY } from '../../config/policy.js';
import { authenticate, currentUser, requireRole } from '../../middleware/authenticate.js';
import { db, mutate, newId } from '../../store/db.js';
import type { Booking, Place, User } from '../../store/types.js';
import { checkValidation, handle, param, str } from '../../shared/http/handler.js';
import { sendSuccess } from '../../shared/http/response.js';
import { BusinessError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/errors.js';
import {
  evaluateDriver,
  findDriver,
  notify,
  OPEN_BOOKING_STATUSES,
  outstandingBalance,
  policyPublic,
  rating,
} from '../../services/domain.js';
import { cancelBooking, driverEtaMinutes, recordDriverNoShow } from '../../services/engine.js';
import { isValidPoint, routePreview } from '../../services/geo.js';
import { buildQuoteSnapshot } from '../../services/quote.js';
import { bookingView, driverCard, locationView } from '../../services/views.js';
import { assertScheduledLeadTime, broadcastWindow, cancellationFee, driverNoShowDeadline } from './booking.service.js';

const placeRule = (name: string) => body(name).custom((v) => isValidPoint(v)).withMessage('Choose a valid location.');

const quoteRules = [
  placeRule('pickup'),
  placeRule('destination'),
  body('stops').optional().isArray({ max: 3 }).withMessage('Up to three stops.'),
  body('stops.*').custom((v) => isValidPoint(v)).withMessage('Each stop needs a valid location.'),
  body('vehicleId').isString().notEmpty().withMessage('Choose your vehicle.'),
  body('type').isIn(['INSTANT', 'SCHEDULED']),
  body('pickupAt').optional().isISO8601(),
  body('radiusKm').optional().isFloat({ min: 1, max: 200 }),
];

function place(v: Place): Place {
  return { label: str(v.label, 160), lat: Number(v.lat), lng: Number(v.lng) };
}

type EmptyReason =
  | 'NO_APPROVED_DRIVERS'
  | 'NO_ONLINE_DRIVERS'
  | 'STALE_GPS'
  | 'VEHICLE_INCOMPATIBLE'
  | 'ALL_BUSY'
  | 'OUT_OF_SERVICE_AREA'
  | 'OUTSIDE_RADIUS';

async function computeQuote(req: Request, customer: User) {
  const vehicle = db().vehicles.find((v) => v.id === req.body.vehicleId && v.customerId === customer.id);
  if (!vehicle) throw new ValidationError('Choose one of your vehicles.');
  const type = req.body.type as Booking['type'];
  const now = new Date();
  const pickupAt = type === 'SCHEDULED' ? new Date(String(req.body.pickupAt)) : now;
  if (type === 'SCHEDULED') {
    try {
      assertScheduledLeadTime(pickupAt, now);
    } catch (e) {
      throw new ValidationError((e as Error).message);
    }
  }
  const pickup = place(req.body.pickup);
  const destination = place(req.body.destination);
  const stops = ((req.body.stops ?? []) as Place[]).map(place);
  const route = await routePreview([pickup, ...stops, destination]);
  const radiusKm = Number(req.body.radiusKm) || POLICY.searchRadiusKm;

  const approved = db().drivers.filter((d) => d.approvalStatus === 'APPROVED' && !d.isSuspended && d.id !== customer.id);
  const input = { pickup, vehicle, type, pickupAt, durationMin: route.durationMin };
  const evaluated = approved.map((d) => ({ driver: d, check: evaluateDriver(d, input, now) }));
  const eligible = evaluated.filter((e) => e.check.eligible);
  const inRadius = type === 'INSTANT' ? eligible.filter((e) => e.check.pickupDistanceKm <= radiusKm) : eligible;

  let emptyReason: EmptyReason | null = null;
  if (!inRadius.length) {
    const has = (r: string) => evaluated.some((e) => e.check.reasons.includes(r as never));
    const onlyFail = (r: string) => evaluated.some((e) => e.check.reasons.length === 1 && e.check.reasons[0] === r);
    if (!approved.length) emptyReason = 'NO_APPROVED_DRIVERS';
    else if (eligible.length) emptyReason = 'OUTSIDE_RADIUS';
    else if (onlyFail('ACTIVE_TRIP_CONFLICT')) emptyReason = 'ALL_BUSY';
    else if (onlyFail('LOCATION_STALE')) emptyReason = 'STALE_GPS';
    else if (evaluated.every((e) => e.check.reasons.includes('VEHICLE_UNSUPPORTED'))) emptyReason = 'VEHICLE_INCOMPATIBLE';
    else if (evaluated.every((e) => e.check.reasons.includes('OUT_OF_SERVICE_AREA'))) emptyReason = 'OUT_OF_SERVICE_AREA';
    else if (has('OFFLINE') || has('LOCATION_STALE')) emptyReason = 'NO_ONLINE_DRIVERS';
    else emptyReason = 'ALL_BUSY';
  }

  const drivers = inRadius.map(({ driver, check }) => {
    const snap = buildQuoteSnapshot(driver.hourlyRateInr, { distanceKm: route.distanceKm, durationMin: route.durationMin, source: route.source }, now);
    return {
      ...driverCard(driver),
      favourite: customer.favouriteDriverIds.includes(driver.id),
      pickupDistanceKm: Math.round(check.pickupDistanceKm * 10) / 10,
      etaMin: type === 'INSTANT' && driver.presence ? driverEtaMinutes(driver.presence, pickup) : null,
      estimatedFareInr: snap.displayEstimatedFareInr,
      location: type === 'INSTANT' ? locationView(driver.presence) : null,
    };
  });
  // Recommended = pickup distance, then rating, then fare (§5.1). Client may re-sort.
  drivers.sort((a, b) => a.pickupDistanceKm - b.pickupDistanceKm || (b.rating ?? 0) - (a.rating ?? 0) || a.estimatedFareInr - b.estimatedFareInr);

  const fares = drivers.map((d) => d.estimatedFareInr);
  const window = type === 'SCHEDULED' ? broadcastWindow(pickupAt, now) : null;
  return {
    vehicle,
    pickup,
    destination,
    stops,
    pickupAt,
    route,
    radiusKm,
    nextRadiusKm: radiusKm + POLICY.radiusExpansionStepKm,
    drivers,
    eligibleCount: drivers.length,
    emptyReason,
    fareRange: fares.length ? { minInr: Math.min(...fares), maxInr: Math.max(...fares) } : null,
    rateCapInr: drivers.length ? Math.max(...inRadius.map((e) => e.driver.hourlyRateInr)) : null,
    broadcast: window ? { startAt: window.start.toISOString(), endAt: window.end.toISOString() } : null,
  };
}

function assertCanBook(customer: User): void {
  if (customer.status === 'SUSPENDED') throw new ForbiddenError('Your account is suspended. Contact support.');
  if (!customer.onboarded) throw new BusinessError('Complete your profile before booking.', 'ONBOARDING_REQUIRED');
  const balance = outstandingBalance(customer.id);
  if (balance > 0) throw new BusinessError(`Settle your previous fare of ₹${balance} before booking again.`, 'OUTSTANDING_BALANCE');
}

function loadBookingFor(req: Request, user: User): Booking {
  const booking = db().bookings.find((b) => b.id === param(req, 'id'));
  if (!booking) throw new NotFoundError('Booking not found.');
  const allowed =
    user.role === 'ADMIN' ||
    booking.customerId === user.id ||
    booking.driverId === user.id ||
    booking.offeredDriverId === user.id;
  if (!allowed) throw new NotFoundError('Booking not found.');
  return booking;
}

export function bookingRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/policy', handle((_req, res) => sendSuccess(res, { ...policyPublic, cancellationReasons: CANCELLATION_REASONS }, 'Policy loaded.')));

  router.post('/quote', requireRole('CUSTOMER'), ...quoteRules, checkValidation, handle(async (req, res) => {
    const customer = currentUser(res);
    const q = await computeQuote(req, customer);
    return sendSuccess(res, {
      type: req.body.type,
      pickupAt: q.pickupAt.toISOString(),
      route: q.route,
      radiusKm: q.radiusKm,
      nextRadiusKm: q.nextRadiusKm,
      drivers: q.drivers,
      eligibleCount: q.eligibleCount,
      emptyReason: q.emptyReason,
      fareRange: q.fareRange,
      broadcast: q.broadcast,
      pricingMode: 'HOURLY',
      perKmActive: false,
      outstandingBalanceInr: outstandingBalance(customer.id),
      policyVersions: POLICY.versions,
    }, q.eligibleCount ? 'Quote ready.' : 'No eligible drivers right now.');
  }));

  router.post('/', requireRole('CUSTOMER'), ...quoteRules, body('driverId').optional().isString(), checkValidation, handle(async (req, res) => {
    const customer = currentUser(res);
    assertCanBook(customer);
    const type = req.body.type as Booking['type'];
    const openInstant = db().bookings.some(
      (b) => b.customerId === customer.id && (b.status === 'SEARCHING' || (b.type === 'INSTANT' && b.status === 'ASSIGNED')),
    );
    if (type === 'INSTANT' && openInstant) throw new ConflictError('You already have an active instant booking.');

    const q = await computeQuote(req, customer);
    const now = new Date();
    let snapshot;
    let offeredDriverId: string | null = null;
    if (type === 'INSTANT') {
      const choice = q.drivers.find((d) => d.id === req.body.driverId);
      if (!choice) throw new BusinessError('That driver is no longer available. Refresh the list and pick again.', 'DRIVER_UNAVAILABLE');
      const driver = findDriver(choice.id)!;
      snapshot = buildQuoteSnapshot(driver.hourlyRateInr, { distanceKm: q.route.distanceKm, durationMin: q.route.durationMin, source: q.route.source }, now);
      offeredDriverId = driver.id;
    } else {
      if (!q.eligibleCount || q.rateCapInr === null) throw new BusinessError('No eligible drivers cover this scheduled request.', 'BOOKING_NOT_ELIGIBLE');
      snapshot = buildQuoteSnapshot(q.rateCapInr, { distanceKm: q.route.distanceKm, durationMin: q.route.durationMin, source: q.route.source }, now);
    }
    const booking = mutate((data) => {
      const b: Booking = {
        id: newId('bkg'),
        customerId: customer.id,
        driverId: null,
        offeredDriverId,
        vehicleSnapshot: {
          id: q.vehicle.id, make: q.vehicle.make, model: q.vehicle.model, plate: q.vehicle.plate,
          category: q.vehicle.category, transmission: q.vehicle.transmission, fuelType: q.vehicle.fuelType,
        },
        pickup: q.pickup,
        destination: q.destination,
        stops: q.stops,
        routePolyline: q.route.polyline,
        type,
        pickupAt: q.pickupAt.toISOString(),
        status: type === 'INSTANT' ? 'SEARCHING' : q.broadcast && new Date(q.broadcast.startAt) <= now ? 'SCHEDULED_BROADCASTING' : 'SCHEDULED_QUEUED',
        offerExpiresAt: type === 'INSTANT' ? new Date(now.getTime() + POLICY.instantOfferMs).toISOString() : null,
        offerOutcome: null,
        declinedBy: [],
        rateCapInr: type === 'SCHEDULED' ? q.rateCapInr : null,
        broadcastStartAt: q.broadcast?.startAt ?? null,
        broadcastEndAt: q.broadcast?.endAt ?? null,
        quoteSnapshot: snapshot,
        acceptedAt: null,
        promisedArrivalAt: null,
        cancellation: null,
        tripId: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      data.bookings.push(b);
      if (offeredDriverId) {
        notify(data, offeredDriverId, 'OFFER_RECEIVED', 'New instant request', `Pickup at ${b.pickup.label}. Respond within 5 minutes.`, '/driver');
      }
      return b;
    });
    return sendSuccess(res, bookingView(booking, customer), type === 'INSTANT' ? 'Request sent to your driver.' : 'Scheduled request created.', 201);
  }));

  router.get('/', handle((_req, res) => {
    const user = currentUser(res);
    const list = db()
      .bookings.filter((b) => b.customerId === user.id || b.driverId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => bookingView(b, user));
    return sendSuccess(res, list, 'Bookings loaded.');
  }));

  router.get('/:id', handle((req, res) => {
    const user = currentUser(res);
    const b = loadBookingFor(req, user);
    const trip = b.tripId ? db().trips.find((t) => t.id === b.tripId) : undefined;
    const previewFee =
      user.id === b.customerId && OPEN_BOOKING_STATUSES.includes(b.status)
        ? cancellationFee({ type: b.type, acceptedAt: b.acceptedAt ? new Date(b.acceptedAt) : null, arrivedAt: trip?.arrivedAt ? new Date(trip.arrivedAt) : null })
        : null;
    return sendSuccess(res, { ...bookingView(b, user), cancellationFeePreviewInr: previewFee }, 'Booking loaded.');
  }));

  router.post(
    '/:id/cancel',
    body('reason').isString().notEmpty().withMessage('Choose a reason.'),
    body('note').optional().isString().isLength({ max: 300 }),
    checkValidation,
    handle((req, res) => {
      const user = currentUser(res);
      const b = loadBookingFor(req, user);
      const role = b.customerId === user.id ? 'CUSTOMER' : b.driverId === user.id ? 'DRIVER' : null;
      if (!role) throw new ForbiddenError();
      const allowed: readonly string[] = CANCELLATION_REASONS[role];
      if (!allowed.includes(req.body.reason)) throw new ValidationError('Choose a reason from the list.');
      const result = mutate((data) => cancelBooking(data, data.bookings.find((x) => x.id === b.id)!, { id: user.id, role }, req.body.reason, str(req.body.note, 300)));
      return sendSuccess(res, result, result.feeInr ? `Booking cancelled. A ₹${result.feeInr} cancellation fee applies.` : 'Booking cancelled. No charge.');
    }),
  );

  /** NEEDS_REBOOK recovery: choose another pickup time → new broadcast window. */
  router.post('/:id/reschedule', requireRole('CUSTOMER'), body('pickupAt').isISO8601(), checkValidation, handle((req, res) => {
    const user = currentUser(res);
    const b = loadBookingFor(req, user);
    if (b.status !== 'NEEDS_REBOOK') throw new ConflictError('Only requests that need rebooking can be rescheduled.');
    const pickupAt = new Date(String(req.body.pickupAt));
    try {
      assertScheduledLeadTime(pickupAt);
    } catch (e) {
      throw new ValidationError((e as Error).message);
    }
    const now = new Date();
    const window = broadcastWindow(pickupAt, now);
    const updated = mutate((data) => {
      const x = data.bookings.find((y) => y.id === b.id)!;
      x.pickupAt = pickupAt.toISOString();
      x.broadcastStartAt = window.start.toISOString();
      x.broadcastEndAt = window.end.toISOString();
      x.status = window.start <= now ? 'SCHEDULED_BROADCASTING' : 'SCHEDULED_QUEUED';
      x.declinedBy = [];
      x.updatedAt = now.toISOString();
      return x;
    });
    return sendSuccess(res, bookingView(updated, user), 'New pickup time saved. We will broadcast at the right time.');
  }));

  /** Customer reports a driver no-show after the DEC-07 grace deadline; the server verifies it. */
  router.post('/:id/driver-no-show', requireRole('CUSTOMER'), handle((req, res) => {
    const user = currentUser(res);
    const b = loadBookingFor(req, user);
    if (b.customerId !== user.id || b.status !== 'ASSIGNED') throw new ConflictError('This booking has no assigned driver.');
    const trip = db().trips.find((t) => t.id === b.tripId);
    if (trip?.arrivedAt) throw new ConflictError('Your driver has already arrived.');
    const deadline = driverNoShowDeadline({ type: b.type, pickupAt: new Date(b.pickupAt), promisedArrivalAt: b.promisedArrivalAt ? new Date(b.promisedArrivalAt) : null });
    if (Date.now() < deadline.getTime()) {
      throw new BusinessError(`You can report a no-show after ${deadline.toLocaleTimeString('en-IN')}.`, 'TOO_EARLY');
    }
    mutate((data) => recordDriverNoShow(data, data.bookings.find((x) => x.id === b.id)!));
    return sendSuccess(res, { id: b.id }, 'We have recorded that your driver did not arrive. You have not been charged and can book another driver now.');
  }));

  return router;
}

export function placesRouter(): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/search', handle(async (req, res) => {
    const { searchPlaces } = await import('../../services/geo.js');
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '';
    return sendSuccess(res, await searchPlaces(q), 'Places loaded.');
  }));
  router.get('/nearby-drivers', handle((req, res) => {
    // Map context for the booking studio: online drivers with fresh GPS only.
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new ValidationError('lat/lng required');
    const list = db()
      .drivers.filter((d) => d.approvalStatus === 'APPROVED' && !d.isSuspended && d.isOnline && d.presence)
      .map((d) => ({ id: d.id, rating: rating(d), location: locationView(d.presence) }))
      .filter((d) => d.location && !d.location.stale);
    return sendSuccess(res, list, 'Drivers loaded.');
  }));
  return router;
}
