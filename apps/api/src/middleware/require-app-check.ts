import type { RequestHandler } from 'express';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirebaseAdminApp } from '../config/firebase-admin.js';
import { AppError } from '../shared/http/app-error.js';

export const requireAppCheck: RequestHandler = async (req, _res, next) => {
  const token = req.get('X-Firebase-AppCheck');
  const denied = () => new AppError(403, 'APP_CHECK_FAILED', 'App verification failed.');
  if (!token || /[\s,]/.test(token)) return next(denied());
  try {
    const result = await getAppCheck(getFirebaseAdminApp()).verifyToken(token, { consume: true });
    if (result.alreadyConsumed !== false) return next(denied());
  } catch (error) {
    if (error instanceof Error && 'code' in error &&
        (error.code === 'app-check/invalid-argument' || error.code === 'app-check/app-check-token-expired')) {
      return next(denied());
    }
    return next(error);
  }
  next();
};
