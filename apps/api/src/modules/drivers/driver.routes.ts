import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Router } from 'express';
import { body } from 'express-validator';
import { POLICY, TRANSMISSIONS, VEHICLE_CATEGORIES } from '../../config/policy.js';
import { authenticate, currentUser, requireRole } from '../../middleware/authenticate.js';
import { DATA_DIR, db, mutate, newId, nowIso } from '../../store/db.js';
import type { Database, Driver, DriverApplication, DriverDocument, User } from '../../store/types.js';
import { checkValidation, handle, param, str } from '../../shared/http/handler.js';
import { sendSuccess } from '../../shared/http/response.js';
import { BusinessError, ConflictError, NotFoundError, ValidationError } from '../../shared/errors/errors.js';
import { acceptOffer, rejectOffer } from '../../services/engine.js';
import { activeTripForDriver, evaluateDriver, presenceFresh } from '../../services/domain.js';
import { bookingView, driverSelfView, tripView } from '../../services/views.js';
import { canSetOnline } from '../availability/availability.service.js';
import { availabilityStatusValidators } from '../availability/availability.validator.js';
import { isImplausibleJump, validateLocationSample } from '../trips/location.service.js';
import { tripLocationValidators } from '../trips/location.validator.js';
import { isValidPoint } from '../../services/geo.js';

const DOC_KINDS = ['LICENCE', 'GOVERNMENT_ID', 'PHOTO'] as const;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

function blankDriver(id: string): Driver {
  return {
    id, approvalStatus: 'DRAFT', isSuspended: false, isOnline: false, hourlyRateInr: 0, perKmRateInr: null,
    categories: [], transmissions: [], serviceArea: { label: '', lat: 0, lng: 0, radiusKm: 15 }, languages: [],
    experienceYears: 0, bio: '', ratingSum: 0, ratingCount: 0, verifiedNoShowCount: 0, suspensionReason: null,
    suspendedAt: null, presence: null, simulated: false, lastDevicePostAt: null,
  };
}

function ensureApplication(data: Database, user: User): DriverApplication {
  let app = data.applications.find((a) => a.driverId === user.id);
  if (!app) {
    app = {
      id: newId('app'), driverId: user.id, status: 'DRAFT',
      profile: { name: user.name, phone: user.phone, experienceYears: 0, languages: [], bio: '' },
      capabilities: { categories: [], transmissions: [] },
      serviceArea: { label: '', lat: 0, lng: 0, radiusKm: 15 },
      rates: { hourlyRateInr: 0, perKmRateInr: null },
      documents: [], reviewReason: null, requestedChanges: [], reviewedBy: null, reviewedAt: null, submittedAt: null, updatedAt: nowIso(),
    };
    data.applications.push(app);
  }
  if (!data.drivers.some((d) => d.id === user.id)) data.drivers.push(blankDriver(user.id));
  return app;
}

function sniffMime(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG') return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}

function me(res: Parameters<typeof currentUser>[0]): { user: User; driver: Driver } {
  const user = currentUser(res);
  const driver = db().drivers.find((d) => d.id === user.id);
  if (!driver) throw new NotFoundError('Complete your driver application first.');
  return { user, driver };
}

function offersFor(driver: Driver, now = new Date()) {
  const data = db();
  return data.bookings.filter((b) => {
    if (b.type === 'INSTANT') {
      return b.status === 'SEARCHING' && b.offeredDriverId === driver.id && b.offerExpiresAt && new Date(b.offerExpiresAt) > now;
    }
    if (b.status !== 'SCHEDULED_BROADCASTING' || b.declinedBy.includes(driver.id) || b.customerId === driver.id) return false;
    if (b.rateCapInr !== null && driver.hourlyRateInr > b.rateCapInr) return false;
    return evaluateDriver(driver, {
      pickup: b.pickup, vehicle: b.vehicleSnapshot, type: 'SCHEDULED', pickupAt: new Date(b.pickupAt),
      durationMin: b.quoteSnapshot.estimatedRouteMinutes,
    }, now).eligible;
  });
}

export function driverRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRole('DRIVER'));

  router.get('/application', handle((_req, res) => {
    const user = currentUser(res);
    const app = db().applications.find((a) => a.driverId === user.id) ?? null;
    const driver = db().drivers.find((d) => d.id === user.id);
    return sendSuccess(res, {
      application: app && { ...app, documents: app.documents.map(({ storagePath: _p, ...d }) => d) },
      driver: driver ? driverSelfView(driver) : null,
    }, 'Application loaded.');
  }));

  /** Private document upload (base64 JSON). Validated by size, declared type and magic bytes. */
  router.post(
    '/documents',
    body('kind').isIn([...DOC_KINDS]).withMessage('Unknown document type.'),
    body('filename').isString().trim().isLength({ min: 1, max: 120 }),
    body('mime').isIn([...POLICY.allowedDocumentMimes]).withMessage('Upload a JPG, PNG or PDF file.'),
    body('dataBase64').isString().isLength({ min: 10 }),
    checkValidation,
    handle((req, res) => {
      const user = currentUser(res);
      const buf = Buffer.from(String(req.body.dataBase64), 'base64');
      if (buf.length > POLICY.maxDocumentBytes) throw new ValidationError('Files must be 5 MB or smaller.');
      const sniffed = sniffMime(buf);
      if (!sniffed || sniffed !== req.body.mime) throw new ValidationError('The file content does not match its type. Upload a JPG, PNG or PDF.');
      const doc = mutate((data) => {
        const app = ensureApplication(data, user);
        if (app.status === 'PENDING_REVIEW' || app.status === 'APPROVED') {
          throw new ConflictError('Documents are locked while your application is under review or approved.');
        }
        const id = newId('doc');
        const storagePath = `drivers/${user.id}/${id}.${EXT[sniffed]}`;
        const dir = resolve(DATA_DIR, 'uploads', user.id);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, `${id}.${EXT[sniffed]}`), buf);
        const record: DriverDocument = {
          id, kind: req.body.kind, filename: str(req.body.filename, 120), mime: sniffed, size: buf.length, storagePath, uploadedAt: nowIso(),
        };
        app.documents = [...app.documents.filter((d) => d.kind !== record.kind), record];
        app.updatedAt = nowIso();
        return record;
      });
      const { storagePath: _p, ...publicDoc } = doc;
      return sendSuccess(res, publicDoc, 'Document uploaded.', 201);
    }),
  );

  router.post(
    '/application',
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name.'),
    body('phone').isString().trim().matches(/^\+[1-9]\d{7,14}$/).withMessage('Use international format, e.g. +919812345678.'),
    body('experienceYears').isInt({ min: 0, max: 60 }).withMessage('Experience must be 0–60 years.'),
    body('languages').isArray({ min: 1, max: 8 }).withMessage('Add at least one language.'),
    body('bio').optional().isString().isLength({ max: 300 }),
    body('categories').isArray({ min: 1 }).withMessage('Choose at least one vehicle category.'),
    body('categories.*').isIn([...VEHICLE_CATEGORIES]),
    body('transmissions').isArray({ min: 1 }).withMessage('Choose at least one transmission.'),
    body('transmissions.*').isIn([...TRANSMISSIONS]),
    body('serviceArea').custom((v) => isValidPoint(v)).withMessage('Choose your service area.'),
    body('serviceArea.radiusKm').isFloat({ min: 2, max: 60 }).withMessage('Service radius must be 2–60 km.'),
    body('hourlyRateInr').isFloat({ min: 0, max: 100000 }).withMessage('Hourly rate must be a non-negative amount.'),
    body('perKmRateInr').optional({ values: 'null' }).isFloat({ min: 0, max: 10000 }),
    checkValidation,
    handle((req, res) => {
      const user = currentUser(res);
      const app = mutate((data) => {
        const a = ensureApplication(data, user);
        if (a.status === 'PENDING_REVIEW') throw new ConflictError('Your application is already under review.');
        if (a.status === 'APPROVED' || a.status === 'DEACTIVATED') throw new ConflictError('Your application has already been decided. Edit your profile instead.');
        const missing = DOC_KINDS.filter((k) => !a.documents.some((d) => d.kind === k));
        if (missing.length) throw new BusinessError(`Upload all required documents: ${missing.join(', ')}.`, 'DOCUMENTS_MISSING');
        const languages = (req.body.languages as unknown[]).map((l) => str(l, 30)).filter(Boolean);
        a.profile = { name: str(req.body.name, 80), phone: str(req.body.phone, 20), experienceYears: Number(req.body.experienceYears), languages, bio: str(req.body.bio, 300) };
        a.capabilities = { categories: [...new Set(req.body.categories as string[])], transmissions: [...new Set(req.body.transmissions as string[])] };
        a.serviceArea = { label: str(req.body.serviceArea.label, 120), lat: Number(req.body.serviceArea.lat), lng: Number(req.body.serviceArea.lng), radiusKm: Number(req.body.serviceArea.radiusKm) };
        a.rates = { hourlyRateInr: Math.round(Number(req.body.hourlyRateInr)), perKmRateInr: req.body.perKmRateInr == null ? null : Math.round(Number(req.body.perKmRateInr)) };
        a.status = 'PENDING_REVIEW';
        a.submittedAt = nowIso();
        a.updatedAt = nowIso();
        const u = data.users.find((x) => x.id === user.id)!;
        u.name = a.profile.name;
        u.phone = a.profile.phone;
        u.onboarded = true;
        if (!u.consentAt) u.consentAt = nowIso();
        const d = data.drivers.find((x) => x.id === user.id)!;
        Object.assign(d, {
          approvalStatus: 'PENDING_REVIEW', hourlyRateInr: a.rates.hourlyRateInr, perKmRateInr: a.rates.perKmRateInr,
          categories: a.capabilities.categories, transmissions: a.capabilities.transmissions, serviceArea: a.serviceArea,
          languages, experienceYears: a.profile.experienceYears, bio: a.profile.bio, isOnline: false,
        });
        return a;
      });
      return sendSuccess(res, { status: app.status }, 'Application submitted for review.');
    }),
  );

  router.get('/me', handle((_req, res) => sendSuccess(res, driverSelfView(me(res).driver), 'Driver profile loaded.')));

  /** Approved drivers manage rates/capabilities; rate changes apply to future quotes only. */
  router.patch(
    '/me',
    body('hourlyRateInr').optional().isFloat({ min: 0, max: 100000 }),
    body('perKmRateInr').optional({ values: 'null' }).isFloat({ min: 0, max: 10000 }),
    body('categories').optional().isArray({ min: 1 }),
    body('categories.*').optional().isIn([...VEHICLE_CATEGORIES]),
    body('transmissions').optional().isArray({ min: 1 }),
    body('transmissions.*').optional().isIn([...TRANSMISSIONS]),
    body('languages').optional().isArray({ min: 1, max: 8 }),
    body('bio').optional().isString().isLength({ max: 300 }),
    body('serviceArea').optional().custom((v: { radiusKm?: unknown }) => isValidPoint(v) && Number(v.radiusKm) >= 2 && Number(v.radiusKm) <= 60),
    checkValidation,
    handle((req, res) => {
      const { user } = me(res);
      const driver = mutate((data) => {
        const d = data.drivers.find((x) => x.id === user.id)!;
        if (req.body.hourlyRateInr !== undefined) d.hourlyRateInr = Math.round(Number(req.body.hourlyRateInr));
        if (req.body.perKmRateInr !== undefined) d.perKmRateInr = req.body.perKmRateInr === null ? null : Math.round(Number(req.body.perKmRateInr));
        if (req.body.categories) d.categories = [...new Set(req.body.categories as string[])];
        if (req.body.transmissions) d.transmissions = [...new Set(req.body.transmissions as string[])];
        if (req.body.languages) d.languages = (req.body.languages as unknown[]).map((l) => str(l, 30)).filter(Boolean);
        if (typeof req.body.bio === 'string') d.bio = str(req.body.bio, 300);
        if (req.body.serviceArea) {
          d.serviceArea = { label: str(req.body.serviceArea.label, 120), lat: Number(req.body.serviceArea.lat), lng: Number(req.body.serviceArea.lng), radiusKm: Number(req.body.serviceArea.radiusKm) };
        }
        return d;
      });
      return sendSuccess(res, driverSelfView(driver), 'Profile updated. New rates apply to future bookings only.');
    }),
  );

  /** PATCH /drivers/availability — server-side eligibility gate (BE-010). */
  router.patch('/availability', ...availabilityStatusValidators(), checkValidation, handle((req, res) => {
    const { user, driver } = me(res);
    const status = req.body.status as 'ONLINE' | 'OFFLINE';
    if (status === 'OFFLINE') {
      const active = activeTripForDriver(user.id);
      if (active && active.status === 'IN_PROGRESS') throw new BusinessError('You cannot go offline during an active trip.', 'ACTIVE_TRIP');
      const updated = mutate((data) => {
        const d = data.drivers.find((x) => x.id === user.id)!;
        d.isOnline = false;
        return d;
      });
      return sendSuccess(res, driverSelfView(updated), 'You are offline.');
    }
    const gate = canSetOnline({ approvalStatus: driver.approvalStatus === 'DRAFT' ? 'PENDING_REVIEW' : driver.approvalStatus, isSuspended: driver.isSuspended });
    if (!gate.allowed) {
      throw new BusinessError(
        gate.reason === 'ACCOUNT_SUSPENDED' ? 'Your account is suspended.' : 'Only approved drivers can go online.',
        'AVAILABILITY_BLOCKED',
      );
    }
    if (!presenceFresh(driver)) {
      throw new BusinessError('Turn on location so we have a fresh GPS fix (within 30 seconds) before going online.', 'LOCATION_STALE');
    }
    const updated = mutate((data) => {
      const d = data.drivers.find((x) => x.id === user.id)!;
      d.isOnline = true;
      return d;
    });
    return sendSuccess(res, driverSelfView(updated), 'You are online and visible for offers.');
  }));

  /** Foreground GPS sample — updates presence and, during a trip, the live trip location. */
  router.post('/presence', ...tripLocationValidators(), checkValidation, handle((req, res) => {
    const { user, driver } = me(res);
    const active = activeTripForDriver(user.id);
    const sample = validateLocationSample({
      tripId: active?.id ?? 'presence',
      driverId: user.id,
      lat: Number(req.body.lat),
      lng: Number(req.body.lng),
      accuracyM: Number(req.body.accuracyM),
      timestamp: new Date(String(req.body.timestamp)),
    });
    const prev = driver.presence;
    if (prev && Date.now() - new Date(prev.capturedAt).getTime() < 120_000) {
      const prevSample = { lat: prev.lat, lng: prev.lng, timestamp: new Date(prev.capturedAt) };
      if (sample.timestamp.getTime() <= prevSample.timestamp.getTime()) {
        return sendSuccess(res, { accepted: false, reason: 'OUT_OF_ORDER' }, 'Duplicate or out-of-order sample ignored.');
      }
      if (isImplausibleJump(prevSample, sample)) {
        return sendSuccess(res, { accepted: false, reason: 'IMPLAUSIBLE_JUMP' }, 'Sample rejected as an implausible jump.');
      }
    }
    mutate((data) => {
      const d = data.drivers.find((x) => x.id === user.id)!;
      const presence = {
        lat: sample.lat, lng: sample.lng, accuracyM: sample.accuracyM, capturedAt: sample.timestamp.toISOString(), receivedAt: nowIso(),
        source: req.body.source === 'DEMO' ? ('DEMO' as const) : ('DEVICE' as const),
      };
      d.presence = presence;
      d.lastDevicePostAt = nowIso();
      if (active) {
        const t = data.trips.find((x) => x.id === active.id)!;
        t.location = presence;
      }
    });
    return sendSuccess(res, { accepted: true, stale: sample.stale, tripId: active?.id ?? null }, 'Location accepted.');
  }));

  router.get('/offers', handle((_req, res) => {
    const { user, driver } = me(res);
    const offers = offersFor(driver).map((b) => ({
      ...bookingView(b, user),
      estimatedEarningsInr: b.quoteSnapshot.displayEstimatedFareInr,
    }));
    return sendSuccess(res, offers, 'Offers loaded.');
  }));

  router.post('/offers/:id/accept', handle((req, res) => {
    const { user } = me(res);
    const booking = mutate((data) => acceptOffer(data, param(req, 'id'), user.id));
    return sendSuccess(res, bookingView(booking, user), 'Offer accepted.');
  }));

  router.post('/offers/:id/reject', handle((req, res) => {
    const { user } = me(res);
    const booking = mutate((data) => rejectOffer(data, param(req, 'id'), user.id));
    return sendSuccess(res, { id: booking.id }, 'Offer declined.');
  }));

  router.get('/trips', handle((_req, res) => {
    const { user } = me(res);
    const trips = db().trips.filter((t) => t.driverId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sendSuccess(res, trips.map((t) => tripView(t, user)), 'Trips loaded.');
  }));

  router.get('/earnings', handle((_req, res) => {
    const { user, driver } = me(res);
    const entries = db().ledger.filter((e) => e.ownerId === user.id && e.ownerRole === 'DRIVER').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const gross = entries.reduce((s, e) => s + e.amountInr, 0);
    const commission = Math.round((gross * POLICY.driverCommissionPct) / 100);
    const completed = db().trips.filter((t) => t.driverId === user.id && t.status === 'COMPLETED').length;
    return sendSuccess(res, {
      entries,
      totals: { grossInr: gross, commissionInr: commission, commissionPct: POLICY.driverCommissionPct, adjustmentsInr: 0, netInr: gross - commission, completedTrips: completed },
      rates: { hourlyRateInr: driver.hourlyRateInr, perKmRateInr: driver.perKmRateInr, perKmActive: false },
      demo: true,
    }, 'Earnings loaded.');
  }));

  return router;
}
