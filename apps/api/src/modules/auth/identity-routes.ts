import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { grantProductRole, verifyLinkedProviders } from './identity-management.js';

export function createIdentityRouter(): Router {
  const router = Router();
  router.get('/providers', async (req, res, next) => {
    try { sendSuccess(res, await verifyLinkedProviders(req.auth!.uid)); }
    catch (error) { next(error); }
  });
  router.post('/role-grants', async (req, res, next) => {
    try {
      const key = req.get('Idempotency-Key');
      const { uid, role, reason } = req.body ?? {};
      if (!key || !/^[A-Za-z0-9_-]{1,100}$/.test(key) || typeof uid !== 'string' ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || typeof reason !== 'string' || reason.length > 2000) {
        throw new AppError(400, 'INVALID_GRANT', 'Grant identity, role, reason and idempotency key are required.');
      }
      await grantProductRole(getFirestore(getFirebaseAdminApp()), req.auth!.uid, uid, role, reason, key);
      sendSuccess(res, { granted: true });
    } catch (error) { next(error); }
  });
  return router;
}
