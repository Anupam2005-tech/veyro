import { Router } from 'express';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { requireRole } from '../../middleware/require-role.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { documentId } from '../quotes/quote-repository.js';
import { SafetyService } from './safety-service.js';
import { notificationTitle } from '../notifications/email.js';
import { notificationAudience, notificationRole, registerNotificationDevice, removeNotificationDevice } from '../notifications/notifications.js';

function text(value: unknown, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new AppError(400, 'INVALID_REQUEST', 'A required field is missing or invalid.');
  }
  return value;
}
function identifier(value: unknown): string {
  try { return documentId(text(value, 128)); }
  catch { throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid resource identifier.'); }
}

export function createSafetyRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  const service = () => new SafetyService(db());
  router.post('/reports', async (req, res, next) => {
    try {
      const id = identifier(req.get('Idempotency-Key'));
      await service().report(req.auth!.uid, id, identifier(req.body?.tripId),
        text(req.body?.category, 80), text(req.body?.description));
      sendSuccess(res, { id }, 'Report recorded.');
    } catch (error) { next(error); }
  });
  router.get('/reports/:id', async (req, res, next) => {
    try {
      const record = await db().collection('reports').doc(identifier(req.params.id)).get();
      if (!record.exists || record.get('reporterId') !== req.auth!.uid) {
        throw new AppError(404, 'REPORT_NOT_FOUND', 'Report unavailable.');
      }
      sendSuccess(res, { id: record.id, status: record.get('status'), category: record.get('category'),
        description: record.get('description'), resolutionNote: record.get('resolutionNote') ?? null });
    } catch (error) { next(error); }
  });
  router.get('/admin/reports', requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const records = await db().collection('reports').limit(100).get();
      sendSuccess(res, records.docs.map(record => ({ id: record.id, ...record.data() })));
    } catch (error) { next(error); }
  });
  router.get('/admin/audit/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const record = await db().collection('adminAuditLogs').doc(identifier(req.params.id)).get();
      if (!record.exists) throw new AppError(404, 'AUDIT_NOT_FOUND', 'Audit record unavailable.');
      sendSuccess(res, { id: record.id, ...record.data() });
    } catch (error) { next(error); }
  });
  router.get('/admin/reports/:id', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const record = await db().collection('reports').doc(identifier(req.params.id)).get();
      if (!record.exists) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report unavailable.');
      sendSuccess(res, { id: record.id, ...record.data() });
    } catch (error) { next(error); }
  });
  router.post('/admin/reports/:id/resolve', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const status = req.body?.status;
      if (status !== 'RESOLVED' && status !== 'DISMISSED' && status !== 'UNDER_REVIEW') throw new AppError(400, 'INVALID_RESOLUTION', 'Invalid resolution.');
      await service().resolveReport(req.auth!.uid, identifier(req.params.id), status, text(req.body?.note));
      sendSuccess(res, { status });
    } catch (error) { next(error); }
  });
  router.post('/sos', async (req, res, next) => {
    try {
      const id = identifier(req.get('Idempotency-Key'));
      await service().sos(req.auth!.uid, id, identifier(req.body?.tripId));
      sendSuccess(res, { id, mode: 'DEMO', deliveryStatus: 'SIMULATED' }, 'Demo SOS recorded.');
    } catch (error) { next(error); }
  });
  router.post('/sos/:id/cancel', async (req, res, next) => {
    try {
      await service().cancelSos(req.auth!.uid, identifier(req.params.id));
      sendSuccess(res, { cancelled: true, mode: 'DEMO' });
    } catch (error) { next(error); }
  });
  router.post('/notifications/device/remove', async (req, res, next) => {
    try {
      const token = text(req.body?.token, 4096);
      await removeNotificationDevice(db(), req.auth!.uid, token);
      sendSuccess(res, { removed: true });
    } catch (error) { next(error); }
  });
  router.get('/notifications', async (req, res, next) => {
    try {
      const owner = await db().collection('users').doc(req.auth!.uid).get();
      const primary = notificationRole(owner);
      const role = notificationRole(owner, req.query.role);
      const query = owner.ref.collection('notifications').orderBy('createdAt', 'desc').limit(50);
      let cursor: QueryDocumentSnapshot | undefined;
      const items = [];
      do {
        const page = await (cursor ? query.startAfter(cursor) : query).get();
        for (const d of page.docs) {
          if (notificationAudience(d, primary) !== role) continue;
          items.push({ id: d.id, type: d.get('type'), title: notificationTitle(d.get('type') ?? 'UPDATE'),
            resourceId: d.get('resourceId'), read: d.get('read') === true, createdAt: d.get('createdAt') });
          if (items.length === 50) break;
        }
        cursor = page.size === 50 ? page.docs.at(-1) : undefined;
      } while (cursor && items.length < 50);
      sendSuccess(res, items);
    } catch (error) { next(error); }
  });
  router.post('/notifications/:id/read', async (req, res, next) => {
    try {
      const owner = db().collection('users').doc(req.auth!.uid);
      const ref = owner.collection('notifications').doc(identifier(req.params.id));
      await db().runTransaction(async tx => {
        const [item, account] = await Promise.all([tx.get(ref), tx.get(owner)]);
        const role = notificationRole(account, req.body?.role);
        if (!item.exists || notificationAudience(item, notificationRole(account)) !== role) {
          throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification unavailable.');
        }
        tx.update(ref, { read: true });
      });
      sendSuccess(res, { read: true });
    } catch (error) { next(error); }
  });
  router.post('/notifications/device', async (req, res, next) => {
    try {
      const token = text(req.body?.token, 4096);
      const channel = await registerNotificationDevice(db(), req.auth!.uid, token, req.body?.role);
      sendSuccess(res, { registered: true, channel });
    } catch (error) { next(error); }
  });
  return router;
}
