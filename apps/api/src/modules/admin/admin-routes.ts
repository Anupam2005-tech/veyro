import { getStorage } from 'firebase-admin/storage';
import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAppCheck } from '../../middleware/require-app-check.js';
import { requireRole } from '../../middleware/require-role.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { identifier } from '../profiles/profile-service.js';
import { AdminService } from './admin-service.js';

export function createAdminRouter(): Router {
  const router = Router();
  router.use((req, _res, next) => {
    if (!/^\/(applications|driver-applications|drivers|customers|sos)(\/|$)/.test(req.path)) return next('router');
    next();
  });
  router.use(authenticate, requireAppCheck, requireRole('ADMIN'));
  const db = () => getFirestore(getFirebaseAdminApp());
  router.get('/applications', async (_req, res, next) => {
    try {
      const records = await db().collection('driverApplications').where('status', '==', 'PENDING_REVIEW').limit(50).get();
      sendSuccess(res, records.docs.map(record => ({ id: record.id, ...record.data() })));
    } catch (error) { next(error); }
  });
  for (const [path, collection] of [['applications', 'driverApplications'], ['drivers', 'drivers'], ['customers', 'users']] as const) {
    router.get('/' + path + '/:id', async (req, res, next) => {
      try {
        const record = await db().collection(collection).doc(identifier(req.params.id!)).get();
        if (!record.exists) throw new AppError(404, 'ADMIN_TARGET_NOT_FOUND', 'Record unavailable.');
        const data = record.data()!;
        const payload = collection === 'users' ? { id: record.id, status: data.status, fullName: data.fullName ?? data.name,
          roles: data.roles ?? [data.role], customerCancellationCount: data.customerCancellationCount ?? 0 } :
          { id: record.id, ...data };
        sendSuccess(res, payload);
      } catch (error) { next(error); }
    });
  }
  router.get('/sos', async (_req, res, next) => {
    try {
      const records = await db().collection('sosEvents').orderBy('createdAt', 'desc').limit(50).get();
      sendSuccess(res, records.docs.map(record => ({ id: record.id, ...record.data() })));
    } catch (error) { next(error); }
  });
  router.get('/sos/:id', async (req, res, next) => {
    try {
      const record = await db().collection('sosEvents').doc(identifier(req.params.id!)).get();
      if (!record.exists) throw new AppError(404, 'SOS_NOT_ACCESSIBLE', 'SOS event unavailable.');
      sendSuccess(res, { id: record.id, ...record.data() });
    } catch (error) { next(error); }
  });
  router.get('/applications/:id/documents/:uploadId', async (req, res, next) => {
    try {
      const application = await db().collection('driverApplications').doc(identifier(req.params.id!)).get();
      const documents: unknown = application.get('documents');
      const document = Array.isArray(documents) ? documents.find(d => d.id === req.params.uploadId) : null;
      if (!document || typeof document.storagePath !== 'string' || typeof document.generation !== 'string') {
        throw new AppError(404, 'DOCUMENT_UNAVAILABLE', 'Application document unavailable.');
      }
      const app = getFirebaseAdminApp();
      if (!app.options.storageBucket) throw new AppError(503, 'STORAGE_UNAVAILABLE', 'Private storage is not configured.');
      const file = getStorage(app).bucket().file(document.storagePath, { generation: document.generation });
      res.set('Cache-Control', 'private, no-store');
      res.set('Content-Disposition', 'attachment; filename="verification-document"');
      res.type('application/octet-stream');
      file.createReadStream().on('error', next).pipe(res);
    } catch (error) { next(error); }
  });
  const operations = [
    ['/driver-applications/:id/decision', 'APPLICATION'],
    ['/drivers/:id/control', 'DRIVER'],
    ['/customers/:id/restore', 'CUSTOMER'],
  ] as const;
  for (const [path, entity] of operations) {
    router.post(path, async (req, res, next) => {
      try {
        const key = req.get('Idempotency-Key');
        if (!key || !/^[A-Za-z0-9_-]{1,100}$/.test(key) || typeof req.body?.reason !== 'string' ||
            !req.body.reason.trim() || req.body.reason.length > 2000) {
          throw new AppError(400, 'INVALID_ADMIN_REQUEST', 'Provide an idempotency key and decision reason.');
        }
        const id = identifier(req.params.id!);
        const action = entity === 'CUSTOMER' ? 'RESTORE' : req.body.action;
        if (typeof action !== 'string') throw new AppError(400, 'INVALID_ADMIN_REQUEST', 'Provide a decision.');
        const status = await new AdminService(db()).change(req.auth!.uid, id, entity,
          action, req.body.reason, key, req.body.requestedChanges);
        sendSuccess(res, { id, status });
      } catch (error) { next(error); }
    });
  }
  return router;
}
