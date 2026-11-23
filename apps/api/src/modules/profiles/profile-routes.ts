import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import express, { Router } from 'express';
import { FieldPath } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { sendSuccess } from '../../shared/http/response.js';
import { AppError } from '../../shared/http/app-error.js';
import { requireRole } from '../../middleware/require-role.js';
import { ProfileService, identifier, text } from './profile-service.js';
import { uploadCustomerAvatar, uploadDocument } from './documents.js';

export function createProfileRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  const service = () => new ProfileService(db());

  const getFullCustomerDetails = async (uid: string) => {
    const userRef = db().collection('users').doc(uid);
    const record = await userRef.get();

    if (!record.exists) throw new AppError(404, 'PROFILE_UNAVAILABLE', 'Create your authenticated session first.');

    const vehicleRecords = await db().collection('vehicles').where('customerId', '==', uid).get();
    const vehicles = vehicleRecords.docs.map(r => ({
      id: r.id,
      make: r.get('make') || '',
      model: r.get('model') || '',
      category: r.get('category') || 'SEDAN',
      transmission: r.get('transmission') || 'AUTOMATIC',
      fuelType: r.get('fuelType') || 'PETROL',
      registrationNumber: r.get('registrationNumber') || '',
    }));

    const notifications = record.get('notifications') ?? {
      bookingUpdates: true,
      tripStatus: true,
      safetyAlerts: true,
      serviceMessages: false,
    };

    const privacy = record.get('privacy') ?? {
      tripSharing: true,
      matchingProfile: true,
      analytics: true,
    };

    const payables = await db().collection('payables').where('customerId', '==', uid).get();
    const unpaid = payables.docs.filter(p => p.get('status') === 'CONFIRMED' && p.get('isUnderActiveDispute') !== true);
    return {
      uid,
      role: 'CUSTOMER',
      roles: record.get('roles') ?? ['CUSTOMER'],
      status: record.get('status') ?? 'ACTIVE',
      fullName: record.get('fullName') ?? record.get('name') ?? '',
      phone: record.get('phone') ?? '',
      onboardingComplete: record.get('onboardingComplete') === true,
      vehicles,
      emergencyContacts: record.get('emergencyContacts') ?? [],
      unpaidBalance: unpaid.reduce((sum, p) => sum + (Number(p.get('amountPaise')) || 0), 0) / 100,
      unpaidInvoiceId: unpaid[0]?.id ?? null,
      disputedAmountUnderReview: false,
      favouriteDriverIds: record.get('favouriteDriverIds') ?? [],
      notifications,
      privacy,
      updatedAt: record.get('updatedAt') ?? new Date().toISOString(),
      hasAvatar: Boolean(record.get('avatar')),
    };
  };

  router.get('/customers/me', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const details = await getFullCustomerDetails(req.auth!.uid);
      sendSuccess(res, details);
    } catch (e) { next(e); }
  });
  router.post('/customers/me/avatar', requireRole('CUSTOMER'), express.raw({ type: ['image/jpeg', 'image/png'], limit: '10mb' }), async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_DOCUMENT_TYPE', 'Choose a JPEG or PNG photo.');
      sendSuccess(res, await uploadCustomerAvatar(req.auth!.uid, req.body, req.get('Content-Type')?.split(';')[0] ?? ''));
    } catch (e) { next(e); }
  });
  router.get('/customers/me/avatar', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const profile = await db().collection('users').doc(req.auth!.uid).get(), avatar = profile.get('avatar');
      if (!avatar) throw new AppError(404, 'PHOTO_UNAVAILABLE', 'No profile photo.');
      res.set('Cache-Control', 'private, no-store'); res.set('X-Content-Type-Options', 'nosniff'); res.type(avatar.contentType);
      getStorage(getFirebaseAdminApp()).bucket().file(avatar.storagePath, { generation: avatar.generation }).createReadStream().on('error', next).pipe(res);
    } catch (e) { next(e); }
  });
  router.delete('/customers/me/avatar', requireRole('CUSTOMER'), async (req, res, next) => {
    try { await db().collection('users').doc(req.auth!.uid).update({ avatar: null }); sendSuccess(res, { removed: true }); }
    catch (e) { next(e); }
  });

  router.route('/customers/me').all((req, res, next) => {
    if (!['PATCH', 'PUT'].includes(req.method)) return next();
    return requireRole('CUSTOMER')(req, res, next);
  }).patch(async (req, res, next) => {
    try { await service().updateCustomer(req.auth!.uid, req.body ?? {}); sendSuccess(res, await getFullCustomerDetails(req.auth!.uid)); }
    catch (e) { next(e); }
  }).put(async (req, res, next) => {
    try { await service().updateCustomer(req.auth!.uid, req.body ?? {}); sendSuccess(res, await getFullCustomerDetails(req.auth!.uid)); }
    catch (e) { next(e); }
  });
  router.post(['/customers/me/deletion-request', '/drivers/me/deletion-request'], requireRole('CUSTOMER', 'DRIVER'), async (req, res, next) => {
    try {
      const ref = db().collection('accountDeletionRequests').doc(req.auth!.uid);
      await db().runTransaction(async tx => {
        if (!(await tx.get(ref)).exists) tx.create(ref, { uid: req.auth!.uid, status: 'POLICY_REVIEW_REQUIRED', createdAt: Date.now() });
      });
      sendSuccess(res, { status: 'POLICY_REVIEW_REQUIRED' });
    } catch (e) { next(e); }
  });
  router.post('/customers/onboarding', requireRole('CUSTOMER'), async (req, res, next) => {
    try { sendSuccess(res, await service().customer(req.auth!.uid, req.body ?? {})); } catch (e) { next(e); }
  });
  router.get('/vehicles', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const records = await db().collection('vehicles').where('customerId', '==', req.auth!.uid).get();
      sendSuccess(res, records.docs.map(r => ({ id: r.id, ...r.data() })));
    } catch (e) { next(e); }
  });
  router.post('/vehicles', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const id = randomUUID();
      await service().vehicle(req.auth!.uid, id, req.body ?? {}, true);
      sendSuccess(res, { id });
    } catch (e) { next(e); }
  });
  router.post('/vehicles/:id', requireRole('CUSTOMER'), async (req, res, next) => {
    try { await service().vehicle(req.auth!.uid, identifier(req.params.id), req.body ?? {}); sendSuccess(res, { saved: true }); } catch (e) { next(e); }
  });
  router.delete('/vehicles/:id', requireRole('CUSTOMER'), async (req, res, next) => {
    try { await service().vehicle(req.auth!.uid, identifier(req.params.id), null); sendSuccess(res, { deleted: true }); } catch (e) { next(e); }
  });
  router.post('/drivers/profile', requireRole('DRIVER'), async (req, res, next) => {
    try { await service().driver(req.auth!.uid, req.body ?? {}); sendSuccess(res, { saved: true }); } catch (e) { next(e); }
  });
  router.get('/drivers', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      let query = db().collection('drivers').where('approvalStatus', '==', 'APPROVED').orderBy(FieldPath.documentId()).limit(50);
      if (req.query.after != null) query = query.startAfter(identifier(req.query.after));
      const records = await query.get();
      const drivers = [];
      const database = db();
      const related = records.empty ? [] : await database.getAll(...records.docs.flatMap(record => [
        database.collection('users').doc(record.id), database.collection('driverAvailability').doc(record.id),
      ]));
      const now = Date.now();
      for (const [index, record] of records.docs.entries()) {
        const user = related[index * 2]!, availability = related[index * 2 + 1]!;
        const roles = user.get('roles') ?? [user.get('role')];
        const observed = availability.get('updatedAt');
        if (user.get('status') !== 'ACTIVE' || !Array.isArray(roles) || !roles.includes('DRIVER') ||
            availability.get('online') !== true || !Number.isSafeInteger(observed) ||
            now < observed || now - observed > 30000) continue;
        drivers.push({ id: record.id, firstName: String(record.get('fullName') ?? '').split(' ')[0],
          categories: record.get('categories') ?? [], transmissions: record.get('transmissions') ?? [],
          hourlyRateInr: record.get('hourlyRateInr'), experienceYears: record.get('experienceYears') ?? 0,
          languages: record.get('languages') ?? [], eligibilityPending: true });
      }
      sendSuccess(res, { drivers, nextCursor: records.size === 50 ? records.docs[records.size - 1]!.id : null });
    } catch (e) { next(e); }
  });
  router.get('/drivers/profile', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const record = await db().collection('drivers').doc(req.auth!.uid).get();
      if (!record.exists) throw new AppError(404, 'PROFILE_UNAVAILABLE', 'Driver profile unavailable.');
      sendSuccess(res, record.data());
    } catch (e) { next(e); }
  });
  // Support both /drivers/applications and /driver-applications/me
  router.post(['/drivers/applications', '/driver-applications/me'], requireRole('DRIVER'), async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      await service().submitApplication(uid, req.body?.documents);
      const user = await db().collection('users').doc(uid).get();
      const application = await db().collection('driverApplications').doc(uid).get();
      const documents = application.get('documents');
      const now = user.get('updatedAt');
      sendSuccess(res, {
        uid,
        role: 'DRIVER',
        fullName: user.get('fullName') ?? user.get('name') ?? '',
        phone: user.get('phone') ?? '',
        onboardingComplete: true,
        applicationStatus: 'PENDING_REVIEW',
        documents,
        updatedAt: now,
      });
    } catch (e) {
      next(e);
    }
  });

  router.get(['/drivers/applications/me', '/driver-applications/me'], requireRole('DRIVER'), async (req, res, next) => {
    try {
      const uid = req.auth!.uid, database = db();
      const [record, driver] = await database.getAll(database.collection('driverApplications').doc(uid), database.collection('drivers').doc(uid));
      const approval = driver?.get('approvalStatus');
      sendSuccess(res, {
        status: approval === 'APPROVED' || approval === 'DEACTIVATED' ? approval : record?.get('status') ?? null,
        adminReason: approval === 'APPROVED' ? null : record?.get('reviewReason') ?? null,
        submittedAt: record?.get('submittedAt') ?? null,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/drivers/applications/resubmit', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      const application = await db().collection('driverApplications').doc(uid).get();
      await service().submitApplication(uid, req.body?.documents ?? application.get('documents'));
      const now = new Date().toISOString();
      sendSuccess(res, {
        uid,
        role: 'DRIVER',
        status: 'PENDING_REVIEW',
        updatedAt: now,
      });
    } catch (e) {
      next(e);
    }
  });
  router.post('/driver-applications/documents', requireRole('DRIVER'),
    express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: '10mb' }), async (req, res, next) => {
      try {
        if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_DOCUMENT_TYPE', 'Upload image or PDF bytes.');
        sendSuccess(res, await uploadDocument(req.auth!.uid, text(req.query.kind), req.body, req.get('Content-Type')?.split(';')[0] ?? ''));
      } catch (e) { next(e); }
    });
  return router;
}
