import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../shared/http/response.js';

/**
 * Placeholder auth middleware (BE-001/BE-002).
 * Verifies `Authorization: Bearer <Firebase ID token>` via Admin SDK once
 * BE-FND-003 is bound. Until then, populates nothing and rejects protected
 * routes — controllers already return 401 without verified identity.
 * Never trust body-supplied uid/role.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
    return;
  }
  // TODO(BE-001): verifyIdToken via Admin SDK, load role/account state.
  (res.locals as { bearerToken?: string }).bearerToken = token;
  next();
}

export function requireRole(...allowed: readonly string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const role = (res.locals as { role?: string }).role;
    if (!role || !allowed.includes(role)) {
      sendError(res, 'Not authorised.', 'FORBIDDEN', 403);
      return;
    }
    next();
  };
}
