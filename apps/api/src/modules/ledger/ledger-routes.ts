import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { identifier } from '../profiles/profile-service.js';
import { LedgerService } from './ledger.js';
import { requireRole } from '../../middleware/require-role.js';

export function createLedgerRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  router.get('/payables', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const rows = await db().collection('payables').where('customerId', '==', req.auth!.uid).limit(100).get();
      sendSuccess(res, rows.docs.map(r => ({ id: r.id, ...r.data() })));
    } catch (error) { next(error); }
  });
  router.get('/earnings', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const rows = await db().collection('driverEarnings').where('driverId', '==', req.auth!.uid).limit(100).get();
      sendSuccess(res, rows.docs.map(r => ({ id: r.id, ...r.data() })));
    } catch (error) { next(error); }
  });
  router.post('/payables/:id/dispute', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      if (typeof req.body?.reportId !== 'string') throw new AppError(400, 'REPORT_REQUIRED', 'Link your report.');
      await new LedgerService(db()).dispute(req.auth!.uid, identifier(req.params.id!), identifier(req.body.reportId));
      sendSuccess(res, { disputed: true });
    } catch (error) { next(error); }
  });
  router.post('/admin/:id/resolve', requireRole('ADMIN'), async (req, res, next) => {
    try {
      if (typeof req.body?.note !== 'string' || req.body.note.length > 2000) throw new AppError(400, 'REASON_REQUIRED', 'Provide a short reason.');
      await new LedgerService(db()).resolve(req.auth!.uid, identifier(req.params.id!), req.body.note);
      sendSuccess(res, { resolved: true });
    } catch (error) { next(error); }
  });
  router.post('/admin/:id/adjust', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const key = req.get('Idempotency-Key');
      if (!key || !/^[A-Za-z0-9_-]{1,100}$/.test(key) || typeof req.body?.reason !== 'string' || req.body.reason.length > 2000) {
        throw new AppError(400, 'INVALID_ADJUSTMENT', 'Provide an idempotency key and a short reason.');
      }
      await new LedgerService(db()).adjust(req.auth!.uid, identifier(req.params.id!), key, req.body.deltaPaise, req.body.reason);
      sendSuccess(res, { adjusted: true });
    } catch (error) { next(error); }
  });
  return router;
}
