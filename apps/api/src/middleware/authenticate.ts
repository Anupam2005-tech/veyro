import type { RequestHandler } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../config/firebase-admin.js';
import { AppError } from '../shared/http/app-error.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { readonly uid: string };
    }
  }
}

const invalidCredentialCodes = new Set([
  'auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired',
  'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found',
]);

/** Mount before authorization and controllers on protected routes. */
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = /^Bearer +([A-Za-z0-9._~-]+)$/i.exec(req.get('Authorization') ?? '')?.[1];
  const unauthorized = () => {
    res.set('WWW-Authenticate', 'Bearer');
    next(new AppError(401, 'UNAUTHENTICATED', 'A valid sign-in is required.'));
  };
  if (!token || (req.headersDistinct?.authorization?.length ?? 0) > 1) return unauthorized();

  try {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(token, true);
    req.auth = { uid: decoded.uid };
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' &&
        invalidCredentialCodes.has(error.code)) return unauthorized();
    return next(error);
  }
  next();
};
