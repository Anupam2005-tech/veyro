import type { RequestHandler } from 'express';
import { activeRoles, profileRef, type Role } from '../modules/auth/profile.js';
import { AppError } from '../shared/http/app-error.js';

export function requireRole(first: Role, ...others: Role[]): RequestHandler {
  const allowed = [first, ...others];
  return async (req, _res, next) => {
    try {
      if (!req.auth) throw new AppError(401, 'UNAUTHENTICATED', 'A valid sign-in is required.');
      const snapshot = await profileRef(req.auth.uid).get();
      if (!snapshot.exists) {
        throw new AppError(403, 'PROFILE_UNAVAILABLE', 'An active profile is required.');
      }
      const roles = activeRoles(snapshot.data());
      if (!allowed.some(role => roles.includes(role))) {
        throw new AppError(403, 'ROLE_FORBIDDEN', 'This action requires a different role.');
      }
    } catch (error) { return next(error); }
    next();
  };
}
