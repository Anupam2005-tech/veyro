import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../shared/http/response.js';

/** Collects express-validator errors into the canonical envelope. */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
    return;
  }
  sendError(res, 'Invalid request.', 'VALIDATION_ERROR', 400);
}

/** Limited-use App Check token check (BE-004). Enforced once bound. */
export function verifyAppCheck(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-firebase-appcheck'];
  if (!token || typeof token !== 'string' || !token.trim()) {
    sendError(res, 'App Check required.', 'APP_CHECK_REQUIRED', 401);
    return;
  }
  // TODO(BE-004): getAppCheck().verifyToken(token, { consume: true }).
  next();
}
