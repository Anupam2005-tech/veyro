import { createHash, randomInt } from 'node:crypto';
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, currentUser, issueSessionToken } from '../../middleware/authenticate.js';
import { db, mutate, newId, nowIso } from '../../store/db.js';
import type { Role, User } from '../../store/types.js';
import { checkValidation, handle, rateLimit, str } from '../../shared/http/handler.js';
import { sendSuccess } from '../../shared/http/response.js';
import { AppError, BusinessError, ValidationError } from '../../shared/errors/errors.js';
import { findDriver, outstandingBalance } from '../../services/domain.js';
import { driverSelfView } from '../../services/views.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email}:${code}`).digest('hex');
}

function devMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function meView(user: User) {
  const driver = user.role === 'DRIVER' ? findDriver(user.id) : undefined;
  const application = user.role === 'DRIVER' ? db().applications.find((a) => a.driverId === user.id) : undefined;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
    status: user.status,
    suspensionReason: user.suspensionReason,
    onboarded: user.onboarded,
    consentAt: user.consentAt,
    emergencyContacts: user.emergencyContacts,
    favouriteDriverIds: user.favouriteDriverIds,
    customerCancellationCount: user.customerCancellationCount,
    outstandingBalanceInr: user.role === 'CUSTOMER' ? outstandingBalance(user.id) : 0,
    driver: driver ? driverSelfView(driver) : null,
    applicationStatus: application?.status ?? null,
    unreadNotifications: db().notifications.filter((n) => n.userId === user.id && !n.readAt).length,
  };
}

export function authRouter(): Router {
  const router = Router();

  /**
   * Passwordless step 1: request a one-time sign-in code.
   * Production sends an email link through Firebase Auth; local development
   * returns the code in the response (`devCode`) so the demo works offline.
   */
  router.post(
    '/auth/email/start',
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false }),
    checkValidation,
    handle((req, res) => {
      const email = String(req.body.email).toLowerCase();
      if (!rateLimit(`signin:${email}`, 5, 10 * 60 * 1000) || !rateLimit(`signin-ip:${req.ip}`, 30, 10 * 60 * 1000)) {
        throw new AppError('Too many sign-in attempts. Try again in a few minutes.', 429, 'RATE_LIMITED');
      }
      const code = String(randomInt(100000, 1000000));
      mutate((data) => {
        data.signInCodes = data.signInCodes.filter((c) => c.email !== email && new Date(c.expiresAt).getTime() > Date.now());
        data.signInCodes.push({ email, hash: hashCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(), attempts: 0 });
      });
      const existing = db().users.find((u) => u.email === email);
      if (devMode()) console.log(`[Veyro API] Sign-in code for ${email}: ${code}`);
      return sendSuccess(
        res,
        { email, isNewAccount: !existing, expiresInSeconds: CODE_TTL_MS / 1000, ...(devMode() ? { devCode: code } : {}) },
        devMode() ? 'Development mode: your sign-in code is shown on screen.' : 'Check your inbox for a sign-in link.',
      );
    }),
  );

  /** Passwordless step 2: verify the code, create the profile on first sign-in. */
  router.post(
    '/auth/email/verify',
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('code').isString().matches(/^\d{6}$/).withMessage('Enter the 6-digit code.'),
    body('role').optional().isIn(['CUSTOMER', 'DRIVER']),
    checkValidation,
    handle((req, res) => {
      const email = String(req.body.email).toLowerCase();
      const code = String(req.body.code);
      const result = mutate((data) => {
        const record = data.signInCodes.find((c) => c.email === email);
        if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
          throw new BusinessError('That code has expired. Request a new one.', 'CODE_EXPIRED');
        }
        if (record.attempts >= CODE_MAX_ATTEMPTS) {
          throw new BusinessError('Too many incorrect attempts. Request a new code.', 'CODE_LOCKED');
        }
        if (record.hash !== hashCode(email, code)) {
          record.attempts += 1;
          throw new BusinessError('That code is not correct.', 'CODE_INVALID');
        }
        data.signInCodes = data.signInCodes.filter((c) => c !== record);
        let user = data.users.find((u) => u.email === email);
        if (!user) {
          const role: Role = req.body.role === 'DRIVER' ? 'DRIVER' : 'CUSTOMER';
          user = {
            id: newId('usr'),
            email,
            role,
            name: '',
            phone: '',
            status: 'ACTIVE',
            onboarded: false,
            consentAt: null,
            customerCancellationCount: 0,
            suspensionReason: null,
            suspendedAt: null,
            emergencyContacts: [],
            favouriteDriverIds: [],
            createdAt: nowIso(),
          };
          data.users.push(user);
        }
        return user;
      });
      return sendSuccess(res, { token: issueSessionToken(result.id), user: meView(result) }, 'Signed in.');
    }),
  );

  router.get('/me', authenticate, handle((_req, res) => sendSuccess(res, meView(currentUser(res)), 'Profile loaded.')));

  router.patch(
    '/me',
    authenticate,
    body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
    body('phone').optional().isString().trim().matches(PHONE_RE).withMessage('Use international format, e.g. +919812345678.'),
    body('consent').optional().isBoolean(),
    checkValidation,
    handle((req, res) => {
      const me = currentUser(res);
      const updated = mutate((data) => {
        const user = data.users.find((u) => u.id === me.id)!;
        if (typeof req.body.name === 'string') user.name = str(req.body.name, 80);
        if (typeof req.body.phone === 'string') user.phone = str(req.body.phone, 20);
        if (req.body.consent === true && !user.consentAt) user.consentAt = nowIso();
        if (user.role === 'CUSTOMER' && user.name && user.phone && user.consentAt) user.onboarded = true;
        return user;
      });
      return sendSuccess(res, meView(updated), 'Profile updated.');
    }),
  );

  router.put(
    '/me/emergency-contacts',
    authenticate,
    body('contacts').isArray({ max: 3 }).withMessage('Up to three emergency contacts.'),
    body('contacts.*.name').isString().trim().isLength({ min: 1, max: 60 }),
    body('contacts.*.phone').isString().trim().matches(PHONE_RE).withMessage('Use international format, e.g. +919812345678.'),
    checkValidation,
    handle((req, res) => {
      const me = currentUser(res);
      const contacts = (req.body.contacts as { name: string; phone: string }[]).map((c) => ({
        id: newId('ec'),
        name: str(c.name, 60),
        phone: str(c.phone, 20),
      }));
      const updated = mutate((data) => {
        const user = data.users.find((u) => u.id === me.id)!;
        user.emergencyContacts = contacts;
        return user;
      });
      return sendSuccess(res, meView(updated), 'Emergency contacts saved.');
    }),
  );

  router.post(
    '/me/favourites/:driverId',
    authenticate,
    handle((req, res) => {
      const me = currentUser(res);
      const driverId = String(req.params.driverId);
      if (!findDriver(driverId)) throw new ValidationError('Unknown driver.');
      const updated = mutate((data) => {
        const user = data.users.find((u) => u.id === me.id)!;
        user.favouriteDriverIds = user.favouriteDriverIds.includes(driverId)
          ? user.favouriteDriverIds.filter((d) => d !== driverId)
          : [...user.favouriteDriverIds, driverId];
        return user;
      });
      return sendSuccess(res, meView(updated), 'Favourites updated.');
    }),
  );

  return router;
}
