import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { db } from '../store/db.js';
import type { Role, User } from '../store/types.js';
import { AuthError, ForbiddenError } from '../shared/errors/errors.js';

/**
 * Session verification (BE-001/BE-002).
 *
 * Production design: verify a Firebase ID token with the Admin SDK. Firebase
 * is not provisioned yet, so local development issues short HMAC-signed
 * session tokens after a passwordless one-time-code sign-in. The middleware
 * contract is identical either way: identity and role come from the verified
 * server-side profile, never from the request body.
 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  return process.env.SESSION_SECRET || db().meta.sessionSecret;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSessionToken(uid: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string; exp?: number };
    if (typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

/** Short-lived signed URL token for private files (driver documents). */
export function signFileAccess(path: string, ttlMs = 5 * 60 * 1000): { exp: number; sig: string } {
  const exp = Date.now() + ttlMs;
  return { exp, sig: sign(`file:${path}:${exp}`) };
}

export function verifyFileAccess(path: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = Buffer.from(sign(`file:${path}:${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function currentUser(res: Response): User {
  const user = (res.locals as { user?: User }).user;
  if (!user) throw new AuthError();
  return user;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const uid = token ? verifySessionToken(token) : null;
  const user = uid ? db().users.find((u) => u.id === uid) : undefined;
  if (!user) {
    next(new AuthError('Your session has expired. Please sign in again.'));
    return;
  }
  (res.locals as { user?: User }).user = user;
  next();
}

export function requireRole(...allowed: readonly Role[]): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = (res.locals as { user?: User }).user;
    if (!user || !allowed.includes(user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
