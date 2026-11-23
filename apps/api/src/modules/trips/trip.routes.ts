import { randomInt } from 'node:crypto';
import { Router, type Request } from 'express';
import { body } from 'express-validator';
import { POLICY } from '../../config/policy.js';
import { authenticate, currentUser } from '../../middleware/authenticate.js';
import { db, mutate, newId, nowIso } from '../../store/db.js';
import type { Database, OtpState, Trip, User } from '../../store/types.js';
import { checkValidation, handle, param, rateLimit, str } from '../../shared/http/handler.js';
import { sendSuccess } from '../../shared/http/response.js';
import { AppError, BusinessError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/errors.js';
import { ACTIVE_TRIP_STATUSES, notify } from '../../services/domain.js';
import { distanceKm } from '../../services/geo.js';
import { tripView } from '../../services/views.js';
import { calculateFinalHourlyBaseFare } from '../quotes/hourly-fare.js';
import { createShareLink, revokeShareLink } from '../share-links/share-link.service.js';
import { recordDemoSos } from '../safety/safety.service.js';
import { hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MS, verifyOtp } from './otp.service.js';

function loadTrip(req: Request, user: User): Trip {
  const trip = db().trips.find((t) => t.id === param(req, 'id'));
  if (!trip || (user.role !== 'ADMIN' && trip.customerId !== user.id && trip.driverId !== user.id)) {
    throw new NotFoundError('Trip not found.');
  }
  return trip;
}

function asDriver(trip: Trip, user: User): void {
  if (trip.driverId !== user.id) throw new ForbiddenError('Only the assigned driver can do this.');
}
function asCustomer(trip: Trip, user: User): void {
  if (trip.customerId !== user.id) throw new ForbiddenError('Only the customer can do this.');
}

function issueOtp(): { code: string; state: OtpState } {
  const code = String(randomInt(100000, 1000000));
  return { code, state: { hash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(), attempts: 0 } };
}

/** Single-use, expiring, attempt-limited OTP consumption inside one atomic mutation. */
function consumeOtp(state: OtpState | null, code: string): { ok: boolean; state: OtpState | null; message?: string } {
  if (!state) return { ok: false, state, message: 'Ask the customer to open their trip screen to generate a code.' };
  if (state.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, state, message: 'Too many attempts. The customer must generate a new code.' };
  if (new Date(state.expiresAt).getTime() < Date.now()) return { ok: false, state, message: 'This code has expired. Ask the customer to refresh it.' };
  if (!/^\d{6}$/.test(code)) return { ok: false, state: { ...state, attempts: state.attempts + 1 }, message: 'Enter all 6 digits.' };
  const result = verifyOtp({ hash: state.hash, expiresAt: new Date(state.expiresAt), attempts: state.attempts }, code);
  if (!result.ok) return { ok: false, state: { ...state, attempts: result.attempts }, message: `Incorrect code. ${OTP_MAX_ATTEMPTS - result.attempts} attempts left.` };
  return { ok: true, state: null };
}

function completeTrip(data: Database, trip: Trip, now: Date): void {
  const booking = data.bookings.find((b) => b.id === trip.bookingId)!;
  const base = calculateFinalHourlyBaseFare(
    { pricing_mode: 'HOURLY', hourlyRateInr: booking.quoteSnapshot.hourlyRateInr },
    new Date(trip.startedAt!),
    now,
  );
  const platformFeeInr = POLICY.customerPlatformFeeInr;
  const totalInr = base.displayBaseFareInr + trip.waitingFeeInr + platformFeeInr;
  trip.status = 'COMPLETED';
  trip.endedAt = now.toISOString();
  trip.endOtp = null;
  trip.fare = {
    baseFareInr: base.displayBaseFareInr,
    waitingFeeInr: trip.waitingFeeInr,
    noShowFeeInr: 0,
    platformFeeInr,
    totalInr,
    billableMinutes: Math.round(((now.getTime() - new Date(trip.startedAt!).getTime()) / 60_000) * 10) / 10,
  };
  trip.updatedAt = now.toISOString();
  booking.status = 'COMPLETED';
  booking.updatedAt = now.toISOString();
  if (totalInr > 0) {
    data.ledger.push({
      id: newId('led'), ownerId: trip.customerId, ownerRole: 'CUSTOMER', tripId: trip.id, bookingId: booking.id, type: 'TRIP_FARE',
      amountInr: totalInr, status: 'UNPAID', reason: 'Driver service fare (fuel, tolls and parking excluded)', disputeStatus: 'NONE',
      linkedReportId: null, paymentId: null, createdAt: now.toISOString(),
    });
    data.ledger.push({
      id: newId('led'), ownerId: trip.driverId, ownerRole: 'DRIVER', tripId: trip.id, bookingId: booking.id, type: 'DRIVER_EARNING',
      amountInr: totalInr - platformFeeInr, status: 'CREDITED', reason: `Trip earnings (commission ${POLICY.driverCommissionPct}%)`,
      disputeStatus: 'NONE', linkedReportId: null, paymentId: null, createdAt: now.toISOString(),
    });
  }
  notify(data, trip.customerId, 'TRIP_COMPLETED', 'Trip completed', `Final fare ₹${totalInr}. Pay from your trip summary.`, `/customer/trips/${trip.id}/summary`);
}

export function tripRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/:id', handle((req, res) => {
    const user = currentUser(res);
    return sendSuccess(res, tripView(loadTrip(req, user), user), 'Trip loaded.');
  }));

  /** Scheduled trips: driver starts heading to the pickup (up to 3h before pickup). */
  router.post('/:id/depart', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asDriver(trip, user);
    if (trip.status !== 'NOT_STARTED') throw new ConflictError('This trip is already under way.');
    const booking = db().bookings.find((b) => b.id === trip.bookingId)!;
    if (new Date(booking.pickupAt).getTime() - Date.now() > 3 * 3_600_000) {
      throw new BusinessError('You can start heading to the pickup within 3 hours of the scheduled time.', 'TOO_EARLY');
    }
    const updated = mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      t.status = 'DRIVER_EN_ROUTE';
      t.updatedAt = nowIso();
      notify(data, t.customerId, 'DRIVER_EN_ROUTE', 'Driver on the way', 'Your scheduled driver is heading to the pickup.', `/customer/trips/${t.id}`);
      return t;
    });
    return sendSuccess(res, tripView(updated, user), 'Heading to pickup.');
  }));

  /** Driver taps Arrived — backend checks assignment, GPS geofence and accuracy (§5.5). */
  router.post('/:id/arrive', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asDriver(trip, user);
    if (trip.status !== 'DRIVER_EN_ROUTE') throw new ConflictError('Arrival can only be confirmed while en route.');
    const booking = db().bookings.find((b) => b.id === trip.bookingId)!;
    const loc = trip.location;
    const fresh = loc && Date.now() - new Date(loc.capturedAt).getTime() <= POLICY.locationStaleMs;
    if (!loc || !fresh) {
      throw new BusinessError('No fresh GPS fix. Keep this screen open with location on, or ask the customer to confirm your arrival.', 'GPS_UNAVAILABLE');
    }
    if (loc.accuracyM > POLICY.arrivalMaxAccuracyM) {
      throw new BusinessError(`GPS accuracy is too low (±${Math.round(loc.accuracyM)} m). Ask the customer to confirm your arrival in their app.`, 'GPS_INACCURATE');
    }
    const distM = distanceKm(loc, booking.pickup) * 1000;
    if (distM > POLICY.arrivalGeofenceM) {
      throw new BusinessError(`You are ${Math.round(distM)} m from the pickup. Move within ${POLICY.arrivalGeofenceM} m, or ask the customer to confirm.`, 'OUTSIDE_GEOFENCE');
    }
    const updated = mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      t.status = 'ARRIVED';
      t.arrivedAt = nowIso();
      t.arrivalMethod = 'GPS';
      t.updatedAt = nowIso();
      notify(data, t.customerId, 'DRIVER_ARRIVED', 'Your driver has arrived', `Waiting is free for ${POLICY.waitFreeMin} minutes. Share your start code when you are ready.`, `/customer/trips/${t.id}`);
      return t;
    });
    return sendSuccess(res, tripView(updated, user), 'Arrival confirmed. Waiting clock started.');
  }));

  /** Fallback arrival path: the customer confirms the driver is at the pickup. */
  router.post('/:id/confirm-arrival', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    if (trip.status !== 'DRIVER_EN_ROUTE') throw new ConflictError('Arrival can only be confirmed while the driver is en route.');
    const updated = mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      t.status = 'ARRIVED';
      t.arrivedAt = nowIso();
      t.arrivalMethod = 'CUSTOMER_CONFIRMED';
      t.updatedAt = nowIso();
      notify(data, t.driverId, 'DRIVER_ARRIVED', 'Customer confirmed your arrival', 'The waiting clock has started.', `/driver/trips/${t.id}`);
      return t;
    });
    return sendSuccess(res, tripView(updated, user), 'Arrival confirmed.');
  }));

  /** Customer reveals a fresh Start OTP (only the hash is stored). */
  router.post('/:id/start-otp', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    if (trip.status !== 'ARRIVED') throw new ConflictError('The start code is available once your driver has arrived.');
    const { code, state } = issueOtp();
    mutate((data) => {
      data.trips.find((x) => x.id === trip.id)!.startOtp = state;
    });
    return sendSuccess(res, { code, expiresAt: state.expiresAt }, 'Start code ready. Share it with your driver in person.');
  }));

  router.post('/:id/start-otp/verify', body('code').isString(), checkValidation, handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asDriver(trip, user);
    if (!rateLimit(`otp:${trip.id}`, 20, 60_000)) throw new AppError('Slow down and try again.', 429, 'RATE_LIMITED');
    const outcome = mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      if (t.status !== 'ARRIVED') throw new ConflictError('The trip can start only after arrival.');
      const r = consumeOtp(t.startOtp, String(req.body.code));
      t.startOtp = r.state;
      if (!r.ok) return r;
      const now = new Date();
      const waitedMin = (now.getTime() - new Date(t.arrivedAt!).getTime()) / 60_000;
      // DEC-06: one ₹50 charge if started after the free 15 minutes; never multiplied.
      t.waitingFeeInr = waitedMin > POLICY.waitFreeMin ? POLICY.waitFeeInr : 0;
      t.status = 'IN_PROGRESS';
      t.startedAt = now.toISOString();
      t.updatedAt = now.toISOString();
      notify(data, t.customerId, 'TRIP_STARTED', 'Trip started', 'Have a safe ride. SOS and trip sharing are on your trip screen.', `/customer/trips/${t.id}`);
      return r;
    });
    if (!outcome.ok) throw new BusinessError(outcome.message ?? 'Incorrect code.', 'OTP_INVALID');
    return sendSuccess(res, tripView(db().trips.find((x) => x.id === trip.id)!, user), 'Trip started.');
  }));

  router.post('/:id/end-otp', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    if (trip.status !== 'IN_PROGRESS') throw new ConflictError('The end code is available during a trip.');
    const { code, state } = issueOtp();
    mutate((data) => {
      data.trips.find((x) => x.id === trip.id)!.endOtp = state;
    });
    return sendSuccess(res, { code, expiresAt: state.expiresAt }, 'End code ready. Share it when you reach your destination.');
  }));

  router.post('/:id/end-otp/verify', body('code').isString(), checkValidation, handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asDriver(trip, user);
    if (!rateLimit(`otp:${trip.id}`, 20, 60_000)) throw new AppError('Slow down and try again.', 429, 'RATE_LIMITED');
    const outcome = mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      if (t.status !== 'IN_PROGRESS') throw new ConflictError('Only an active trip can be ended.');
      const r = consumeOtp(t.endOtp, String(req.body.code));
      t.endOtp = r.state;
      if (r.ok) completeTrip(data, t, new Date());
      return r;
    });
    if (!outcome.ok) throw new BusinessError(outcome.message ?? 'Incorrect code.', 'OTP_INVALID');
    return sendSuccess(res, tripView(db().trips.find((x) => x.id === trip.id)!, user), 'Trip completed.');
  }));

  /** DEC-06: customer no-show at 30 minutes; ₹150 replaces the ₹50 wait fee. */
  router.post('/:id/customer-no-show', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asDriver(trip, user);
    if (trip.status !== 'ARRIVED' || !trip.arrivedAt) throw new ConflictError('No-show can be recorded only while waiting at the pickup.');
    const waited = (Date.now() - new Date(trip.arrivedAt).getTime()) / 60_000;
    if (waited < POLICY.waitMaxMin) {
      throw new BusinessError(`You can record a no-show after waiting ${POLICY.waitMaxMin} minutes (${Math.floor(waited)} so far).`, 'TOO_EARLY');
    }
    mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      const b = data.bookings.find((x) => x.id === t.bookingId)!;
      const now = nowIso();
      t.status = 'CUSTOMER_NO_SHOW';
      t.startOtp = null;
      t.fare = { baseFareInr: 0, waitingFeeInr: 0, noShowFeeInr: POLICY.noShowFeeInr, platformFeeInr: 0, totalInr: POLICY.noShowFeeInr, billableMinutes: 0 };
      t.updatedAt = now;
      b.status = 'CUSTOMER_NO_SHOW';
      b.updatedAt = now;
      data.ledger.push({
        id: newId('led'), ownerId: t.customerId, ownerRole: 'CUSTOMER', tripId: t.id, bookingId: b.id, type: 'NO_SHOW_FEE',
        amountInr: POLICY.noShowFeeInr, status: 'UNPAID',
        reason: `Customer no-show: driver waited ${Math.floor(waited)} min from confirmed arrival at ${new Date(t.arrivedAt!).toLocaleTimeString('en-IN')}`,
        disputeStatus: 'NONE', linkedReportId: null, paymentId: null, createdAt: now,
      });
      data.ledger.push({
        id: newId('led'), ownerId: t.driverId, ownerRole: 'DRIVER', tripId: t.id, bookingId: b.id, type: 'DRIVER_NO_SHOW_CREDIT',
        amountInr: POLICY.noShowFeeInr, status: 'CREDITED', reason: 'Customer no-show credit (not a Veyro commission)',
        disputeStatus: 'NONE', linkedReportId: null, paymentId: null, createdAt: now,
      });
      notify(data, t.customerId, 'CUSTOMER_NO_SHOW', 'No-show fee recorded',
        `Your driver waited ${POLICY.waitMaxMin} minutes. A ₹${POLICY.noShowFeeInr} no-show fee applies. If this is wrong, report it from the trip summary.`,
        `/customer/trips/${t.id}/summary`);
    });
    return sendSuccess(res, tripView(db().trips.find((x) => x.id === trip.id)!, user), 'Customer no-show recorded.');
  }));

  router.post('/:id/rating', body('stars').isInt({ min: 1, max: 5 }), body('comment').optional().isString().isLength({ max: 300 }), body('favourite').optional().isBoolean(), checkValidation, handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    if (trip.status !== 'COMPLETED') throw new ConflictError('You can rate completed trips only.');
    if (trip.rating) throw new ConflictError('You have already rated this trip.');
    mutate((data) => {
      const t = data.trips.find((x) => x.id === trip.id)!;
      t.rating = { stars: Number(req.body.stars), comment: str(req.body.comment, 300), at: nowIso() };
      const d = data.drivers.find((x) => x.id === t.driverId);
      if (d) {
        d.ratingSum += t.rating.stars;
        d.ratingCount += 1;
      }
      const u = data.users.find((x) => x.id === user.id)!;
      if (req.body.favourite === true && !u.favouriteDriverIds.includes(t.driverId)) u.favouriteDriverIds.push(t.driverId);
    });
    return sendSuccess(res, tripView(db().trips.find((x) => x.id === trip.id)!, user), 'Thanks for rating your driver.');
  }));

  // ---- Trip sharing (§5.11, DEC-10) ----
  router.get('/:id/share-links', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    const links = db().shareLinks.filter((l) => l.tripId === trip.id && !l.revokedAt).map(({ tokenHash: _h, ...l }) => l);
    return sendSuccess(res, links, 'Share links loaded.');
  }));

  router.post('/:id/share-links', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    if (!ACTIVE_TRIP_STATUSES.includes(trip.status)) throw new ConflictError('You can share an active trip only.');
    const { record, token } = createShareLink(trip.id, user.id);
    mutate((data) => {
      data.shareLinks.push({
        ...record,
        createdAt: record.createdAt.toISOString(),
        expiresAt: record.expiresAt.toISOString(),
        revokedAt: null,
      });
    });
    // The raw token is returned exactly once and never stored.
    return sendSuccess(res, { id: record.id, token, path: `/share/${token}`, expiresAt: record.expiresAt.toISOString() }, 'Share link created.', 201);
  }));

  router.delete('/:id/share-links/:shareId', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    asCustomer(trip, user);
    mutate((data) => {
      const link = data.shareLinks.find((l) => l.id === param(req, 'shareId') && l.tripId === trip.id);
      if (!link) throw new NotFoundError('Share link not found.');
      const revoked = revokeShareLink({ ...link, createdAt: new Date(link.createdAt), expiresAt: new Date(link.expiresAt), revokedAt: link.revokedAt ? new Date(link.revokedAt) : null });
      link.revokedAt = revoked.revokedAt!.toISOString();
    });
    return sendSuccess(res, { id: param(req, 'shareId') }, 'Share link revoked.');
  }));

  // ---- Demo SOS (§5.12, DEC-09) ----
  router.get('/:id/sos', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    return sendSuccess(res, db().sosEvents.filter((s) => s.tripId === trip.id), 'SOS events loaded.');
  }));

  router.post('/:id/sos', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    if (!ACTIVE_TRIP_STATUSES.includes(trip.status)) throw new ConflictError('SOS is available during an active trip.');
    const customer = db().users.find((u) => u.id === trip.customerId)!;
    const event = mutate((data) => {
      const sos = recordDemoSos(newId('sos'), trip.id);
      const record = {
        id: sos.id,
        tripId: trip.id,
        customerId: trip.customerId,
        raisedBy: user.id,
        status: 'ACTIVE' as const,
        locationSnapshot: trip.location,
        deliveryAttempts: customer.emergencyContacts.map((c) => ({ contactId: c.id, name: c.name, phone: c.phone, status: 'DEMO_NOT_SENT' as const })),
        createdAt: sos.createdAt.toISOString(),
        cancelledAt: null,
      };
      data.sosEvents.push(record);
      for (const admin of data.users.filter((u) => u.role === 'ADMIN')) {
        notify(data, admin.id, 'SOS', 'Demo SOS raised', `Trip ${trip.id.slice(-6)} raised an SOS. No external message was sent.`, '/admin/reports');
      }
      return record;
    });
    return sendSuccess(res, event, 'SOS alert recorded and the Veyro team has been notified. If you are in danger, call 112.', 201);
  }));

  router.post('/:id/sos/:sosId/cancel', handle((req, res) => {
    const user = currentUser(res);
    const trip = loadTrip(req, user);
    const event = mutate((data) => {
      const s = data.sosEvents.find((x) => x.id === param(req, 'sosId') && x.tripId === trip.id);
      if (!s) throw new NotFoundError('SOS event not found.');
      if (s.status !== 'ACTIVE') throw new ConflictError('This SOS is already closed.');
      s.status = 'CANCELLED';
      s.cancelledAt = nowIso();
      data.auditLogs.push({ id: newId('aud'), adminId: user.id, action: 'SOS_CANCELLED', entityType: 'sos', entityId: s.id, before: 'ACTIVE', after: 'CANCELLED', reason: 'Marked as false alarm by trip participant', createdAt: nowIso() });
      return s;
    });
    return sendSuccess(res, event, 'SOS marked as a false alarm.');
  }));

  return router;
}
