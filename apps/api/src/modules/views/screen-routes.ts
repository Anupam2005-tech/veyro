import { Router } from 'express';
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { requireRole } from '../../middleware/require-role.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { identifier } from '../profiles/profile-service.js';
import { driverNoShowGraceMs, publicTrip } from '../trips/trip-service.js';

const row = (d: DocumentSnapshot) => d.exists ? { ...d.data(), id: d.id } : null;
const live = ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const openBookingStates = ['SEARCHING', 'SCHEDULED_BROADCASTING'];

async function findDriverOffers(db: Firestore, uid: string, now: number): Promise<DocumentSnapshot[]> {
  try {
    return (await db.collectionGroup('offers').where('driverId', '==', uid).get()).docs;
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 9 || !/index/i.test(error.message)) throw error;
    // A named Firestore database may not have the collection-group index yet.
    // Only open bookings can contain an actionable offer. Read this driver's exact offer document.
    const active = await db.collection('bookings').where('status', 'in', openBookingStates)
      .select('closesAt', 'selectedDriverId', 'status').get();
    const candidates = active.docs.filter(booking => booking.get('closesAt') > now &&
      (booking.get('status') !== 'SEARCHING' || booking.get('selectedDriverId') === uid));
    const offers: DocumentSnapshot[] = [];
    for (let i = 0; i < candidates.length; i += 100) {
      offers.push(...await db.getAll(...candidates.slice(i, i + 100).map(booking => booking.ref.collection('offers').doc(uid))));
    }
    return offers;
  }
}

// Participant-only projection: no OTP vaults, private uploads, provider secrets or contact numbers.
export async function bookingScreen(db: Firestore, booking: DocumentSnapshot, viewer?: string) {
  const [route, vehicle, driver, trip, location, payable, rating] = await Promise.all([
    db.collection('routeQuotes').doc(booking.get('routeId')).get(),
    db.collection('vehicles').doc(booking.get('vehicleId')).get(),
    booking.get('driverId') ? db.collection('drivers').doc(booking.get('driverId')).get() : null,
    db.collection('trips').doc(booking.id).get(), db.collection('liveLocations').doc(booking.id).get(),
    db.collection('payables').doc(booking.id).get(), db.collection('tripRatings').doc(booking.id).get(),
  ]);
  const active = live.includes(trip.get('status'));
  const shares = active && viewer === booking.get('customerId') ? await db.collection('tripShares').where('tripId', '==', booking.id).get() : null;
  const share = shares?.docs.find(s => s.get('customerId') === viewer && s.get('revoked') !== true);
  const now = Date.now(), observedAt = location.get('observedAt'), eta = trip.get('pickupEta');
  const enRoute = trip.get('status') === 'DRIVER_EN_ROUTE';
  const promised = trip.get('promisedArrivalAt');
  return { booking: row(booking), route: row(route), vehicle: row(vehicle),
    driver: driver?.exists ? { id: driver.id, fullName: driver.get('fullName'), hourlyRateInr: driver.get('hourlyRateInr'),
      experienceYears: driver.get('experienceYears'), languages: driver.get('languages') ?? [] } : null,
    trip: trip.exists ? publicTrip(trip) : null, location: active ? row(location) : null,
    canRequestOtp: !!viewer && viewer === trip.get('customerId'),
    driverEtaMinutes: enRoute && Number.isSafeInteger(observedAt) && now >= observedAt && now - observedAt <= 30_000 &&
      Number.isSafeInteger(eta?.requestedAt) && Number.isSafeInteger(eta?.arrivalAt) &&
      now >= eta.requestedAt && now - eta.requestedAt <= 90_000
      ? Math.max(0, Math.ceil((eta.arrivalAt - now) / 60_000)) : null,
    driverNoShowEligible: enRoute && viewer === trip.get('customerId') &&
      Number.isSafeInteger(promised) && now >= promised + driverNoShowGraceMs,
    driverNoShowReportStatus: viewer && viewer === trip.get('customerId') ? trip.get('driverNoShowReportStatus') ?? null : null,
    payable: payable.exists ? { id: payable.id, amountPaise: payable.get('amountPaise'), currency: payable.get('currency'),
      status: payable.get('status'), source: payable.get('source'), isUnderActiveDispute: payable.get('isUnderActiveDispute') === true,
      ...(viewer === payable.get('customerId') && payable.get('status') === 'CAPTURED'
        ? { paymentReference: payable.get('paymentId') ?? null } : {}) } : null,
    rating: rating.get('rating') ?? null,
    share: share ? { shareId: share.id, createdAt: share.get('createdAt') } : null };
}

export function createScreenRouter(): Router {
  const router = Router(), db = () => getFirestore(getFirebaseAdminApp());
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.get('/bookings', requireRole('CUSTOMER', 'DRIVER'), async (req, res, next) => {
    try {
      const field = req.query.role === 'driver' ? 'driverId' : 'customerId';
      const records = await db().collection('bookings').where(field, '==', req.auth!.uid).limit(100).get();
      sendSuccess(res, await Promise.all(records.docs.map(b => bookingScreen(db(), b, req.auth!.uid))));
    } catch (e) { next(e); }
  });
  router.get('/trips/:id', requireRole('CUSTOMER', 'DRIVER'), async (req, res, next) => {
    try {
      const booking = await db().collection('bookings').doc(identifier(req.params.id)).get();
      if (!booking.exists || ![booking.get('customerId'), booking.get('driverId')].includes(req.auth!.uid)) {
        throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      }
      sendSuccess(res, await bookingScreen(db(), booking, req.auth!.uid));
    } catch (e) { next(e); }
  });
  router.post('/trips/:id/rating', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const rating = req.body?.rating, note = req.body?.note ?? '';
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof note !== 'string' || note.length > 2000) throw new AppError(400, 'INVALID_RATING', 'Choose one to five stars and a short note.');
      const id = identifier(req.params.id);
      await db().runTransaction(async tx => {
        const trip = await tx.get(db().collection('trips').doc(id));
        const ref = db().collection('tripRatings').doc(id), prior = await tx.get(ref);
        if (trip.get('customerId') !== req.auth!.uid || trip.get('status') !== 'COMPLETED') throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Owned completed trip required.');
        if (prior.exists) {
          if (prior.get('rating') === rating && prior.get('note') === note) return;
          throw new AppError(409, 'RATING_EXISTS', 'This trip is already rated.');
        }
        tx.create(ref, { customerId: req.auth!.uid, driverId: trip.get('driverId'), rating, note, createdAt: Date.now() });
      });
      sendSuccess(res, { saved: true });
    } catch (e) { next(e); }
  });
  router.post('/favourites', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const id = identifier(req.body?.driverId);
      if (typeof req.body?.favourite !== 'boolean') throw new AppError(400, 'INVALID_INPUT', 'Specify favourite state.');
      const ids = await db().runTransaction(async tx => {
        const user = db().collection('users').doc(req.auth!.uid), saved = await tx.get(user);
        const driver = await tx.get(db().collection('drivers').doc(id));
        if (!driver.exists) throw new AppError(404, 'DRIVER_UNAVAILABLE', 'Driver unavailable.');
        const previous: string[] = saved.get('favouriteDriverIds') ?? [];
        const result = req.body.favourite ? [...new Set([...previous, id])] : previous.filter(v => v !== id);
        if (result.length > 100) throw new AppError(409, 'FAVOURITES_LIMIT', 'Keep up to 100 favourites.');
        tx.update(user, { favouriteDriverIds: result }); return result;
      });
      sendSuccess(res, ids);
    } catch (e) { next(e); }
  });
  router.get('/driver-profile', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      const [user, driver, application, presence, bookings] = await Promise.all([
        db().collection('users').doc(uid).get(), db().collection('drivers').doc(uid).get(),
        db().collection('driverApplications').doc(uid).get(), db().collection('driverAvailability').doc(uid).get(),
        db().collection('bookings').where('driverId', '==', uid).get(),
      ]);
      let activeTripId: string | null = null;
      let activeTripStatus: string | null = null;
      for (const b of bookings.docs) {
        if (b.get('status') !== 'ASSIGNED' || b.get('pickupAt') != null && b.get('pickupAt') > Date.now()) continue;
        const trip = await db().collection('trips').doc(b.id).get();
        if (!trip.exists || live.includes(trip.get('status'))) { activeTripId = b.id; activeTripStatus = trip.get('status') ?? null; break; }
      }
      sendSuccess(res, { user: { fullName: user.get('fullName') ?? user.get('name'), phone: user.get('phone'),
        onboardingComplete: user.get('onboardingComplete') === true || driver.get('approvalStatus') === 'APPROVED',
        driverNoShowCount: user.get('verifiedNoShowCount') ?? 0 },
        driver: row(driver), application: row(application), presence: { online: presence.get('online') === true,
          updatedAt: presence.get('updatedAt') ?? null }, activeTripId, activeTripStatus });
    } catch (e) { next(e); }
  });
  router.get('/earnings', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const rows = await db().collection('driverEarnings').where('driverId', '==', req.auth!.uid).limit(100).get();
      sendSuccess(res, await Promise.all(rows.docs.map(async record => {
        const [trip, adjustments] = await Promise.all([db().collection('trips').doc(record.id).get(),
          db().collection('ledgerEntries').where('invoiceId', '==', record.id).get()]);
        return { ...row(record), waitingPaise: trip.get('waitingFeePaise') ?? 0,
          adjustmentPaise: adjustments.docs.filter(a => a.get('kind') === 'ADJUSTMENT').reduce((sum, a) => sum + a.get('deltaPaise'), 0) };
      })));
    } catch (e) { next(e); }
  });
  router.get('/offers', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const database = db(), uid = req.auth!.uid, now = Date.now();
      const driverProfile = await database.collection('drivers').doc(uid).get();
      if (driverProfile.get('approvalStatus') !== 'APPROVED') {
        sendSuccess(res, []);
        return;
      }
      const result = [];
      for (const offer of await findDriverOffers(database, uid, now)) {
        const closesAt = offer.get('closesAt');
        if (offer.get('driverId') !== uid || offer.get('status') !== 'OPEN' ||
          !Number.isFinite(closesAt) || closesAt <= Date.now()) continue;
        const parent = offer.ref.parent.parent;
        if (!parent || parent.parent.id !== 'bookings') continue;
        const booking = await parent.get();
        if (!openBookingStates.includes(booking.get('status'))) continue;
        const routeId = booking.get('routeId'), vehicleId = booking.get('vehicleId');
        if (typeof routeId !== 'string' || !routeId || routeId.includes('/') ||
          typeof vehicleId !== 'string' || !vehicleId || vehicleId.includes('/') || !booking.get('fare')) continue;
        const [route, vehicle] = await database.getAll(database.collection('routeQuotes').doc(routeId), database.collection('vehicles').doc(vehicleId));
        if (!route?.get('pickup') || !route.get('destination') || !vehicle?.exists) continue;
        result.push({
          booking: { id: booking.id, kind: booking.get('kind'), status: booking.get('status'), routeId,
            createdAt: booking.get('createdAt'), pickupAt: booking.get('pickupAt'), fare: booking.get('fare'),
            opensAt: booking.get('opensAt'), closesAt: booking.get('closesAt') },
          route: { id: route.id, pickup: route.get('pickup'), destination: route.get('destination'),
            points: route.get('points'), path: route.get('path'), distanceKm: route.get('distanceKm'),
            durationMinutes: route.get('durationMinutes'), createdAt: route.get('createdAt') },
          vehicle: { id: vehicle.id, make: vehicle.get('make'), model: vehicle.get('model'), category: vehicle.get('category'),
            transmission: vehicle.get('transmission'), fuelType: vehicle.get('fuelType') },
          offer: { closesAt }, offeredHourlyRateInr: driverProfile.get('hourlyRateInr') ?? null,
        });
      }
      sendSuccess(res, result);
    } catch (e) { next(e); }
  });
  const applicationView = async (record: DocumentSnapshot) => {
    const driverId = record.get('driverId') ?? record.get('uid') ?? record.id;
    const [driver, audit, user, incidents] = await Promise.all([db().collection('drivers').doc(driverId).get(),
      db().collection('adminAuditLogs').where('entityId', '==', record.id).limit(50).get(),
      db().collection('users').doc(driverId).get(), db().collection('verifiedIncidents').where('uid', '==', driverId).limit(50).get()]);
    const documents = await Promise.all((record.get('documents') ?? []).map(async (d: { id: string; generation: string; kind: string }) => {
      const upload = await db().collection('driverUploads').doc(identifier(d.id)).get();
      if (upload.get('uid') !== driverId || upload.get('generation') !== d.generation) return { ...d };
      return { ...d, contentType: upload.get('contentType'), size: upload.get('size'), createdAt: upload.get('createdAt') };
    }));
    return { ...row(record), documents, driver: { ...row(driver), driverNoShowCount: user.get('verifiedNoShowCount') ?? 0 },
      incidents: incidents.docs.map(row), audit: audit.docs.map(row) };
  };
  router.get('/admin/overview', requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const [applications, pending, approved, rejected, reports] = await Promise.all([
        db().collection('driverApplications').limit(100).get(),
        db().collection('driverApplications').where('status', '==', 'PENDING_REVIEW').count().get(),
        db().collection('drivers').where('approvalStatus', '==', 'APPROVED').count().get(),
        db().collection('driverApplications').where('status', '==', 'REJECTED').count().get(),
        db().collection('reports').where('status', 'in', ['OPEN', 'UNDER_REVIEW']).count().get(),
      ]);
      sendSuccess(res, { applications: await Promise.all(applications.docs.map(applicationView)),
        pendingApplications: pending.data().count, approvedDrivers: approved.data().count,
        rejectedApplications: rejected.data().count, openReports: reports.data().count });
    } catch (e) { next(e); }
  });
  router.get('/admin/applications/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const record = await db().collection('driverApplications').doc(identifier(req.params.id)).get();
      if (!record.exists) throw new AppError(404, 'ADMIN_TARGET_NOT_FOUND', 'Application unavailable.');
      sendSuccess(res, await applicationView(record));
    } catch (e) { next(e); }
  });
  router.get('/admin/customers', requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const [current, legacy] = await Promise.all([db().collection('users').where('roles', 'array-contains', 'CUSTOMER').limit(100).get(),
        db().collection('users').where('role', '==', 'CUSTOMER').limit(100).get()]);
      const records = [...new Map([...current.docs, ...legacy.docs].filter(d => d.get('roles') == null || d.get('roles').includes('CUSTOMER')).map(d => [d.id, d])).values()].slice(0, 100);
      sendSuccess(res, records.map(d => ({ id: d.id, fullName: d.get('fullName') ?? d.get('name') ?? '',
        phone: d.get('phone') ?? '', status: d.get('status'), customerCancellationCount: d.get('customerCancellationCount') ?? 0 })));
    } catch (e) { next(e); }
  });
  router.get('/admin/customers/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const id = identifier(req.params.id), user = await db().collection('users').doc(id).get();
      const roles = user.get('roles') ?? [user.get('role')];
      if (!user.exists || !Array.isArray(roles) || !roles.includes('CUSTOMER')) throw new AppError(404, 'ADMIN_TARGET_NOT_FOUND', 'Customer unavailable.');
      const [audit, incidents] = await Promise.all([db().collection('adminAuditLogs').where('entityId', '==', id).limit(50).get(),
        db().collection('verifiedIncidents').where('uid', '==', id).limit(50).get()]);
      sendSuccess(res, { id, status: user.get('status'), fullName: user.get('fullName') ?? user.get('name') ?? '', phone: user.get('phone') ?? '',
        suspensionReason: user.get('suspensionReason') ?? null, customerCancellationCount: user.get('customerCancellationCount') ?? 0,
        audit: audit.docs.map(row), incidents: incidents.docs.map(row) });
    } catch (e) { next(e); }
  });
  return router;
}
