import type { RequestHandler } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { activeRoles, profileRef, type Role } from './profile.js';
import { enqueueNotification } from '../notifications/notifications.js';

export const bootstrapSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new AppError(401, 'UNAUTHENTICATED', 'A valid sign-in is required.');
    const uid = req.auth.uid;
    const authTime = req.auth.authTime;
    const intent = req.body?.roleIntent;
    if (intent != null && intent !== 'customer' && intent !== 'driver') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Unknown role intent.');
    }
    const requested = intent === 'driver' ? 'DRIVER' : intent === 'customer' ? 'CUSTOMER' : undefined;
    const user = await getAuth(getFirebaseAdminApp()).getUser(uid);
    const ref = profileRef(uid);
    const profile = await ref.firestore.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const stored = snapshot.data();
      const roles: Role[] = snapshot.exists ? activeRoles(stored) : [requested ?? 'CUSTOMER'];
      const role: Role = requested && roles.includes(requested) ? requested :
        roles.find(r => r === stored?.role) ?? roles[0]!;
      const name = stored?.fullName ?? stored?.name ?? user.displayName ?? '';
      const phone = user.phoneNumber ?? stored?.phone ?? '';
      const email = user.email ?? null;
      const now = new Date().toISOString();
      const seconds = Math.floor(Date.now() / 1000);
      const freshSignIn = typeof authTime === 'number' && Number.isSafeInteger(authTime) &&
        authTime <= seconds && seconds - authTime <= 300 && authTime > (stored?.lastNotifiedAuthTime ?? 0) && roles.length > 0;
      let updatedAt = stored?.updatedAt;
      if (!stored) {
        updatedAt = now;
        tx.create(ref, { uid, roles, role, status: 'ACTIVE', name, phone, email,
          onboardingComplete: false, createdAt: now, updatedAt, ...(freshSignIn ? { lastNotifiedAuthTime: authTime } : {}) });
        enqueueNotification(ref.firestore, tx, uid, 'account-registered', 'ACCOUNT_REGISTERED', uid, role);
      } else if (stored.email !== email || stored.phone !== phone || !updatedAt) {
        updatedAt = now;
        tx.update(ref, { email, phone, updatedAt });
      }
      if (stored && freshSignIn) {
        tx.update(ref, { lastNotifiedAuthTime: authTime });
        enqueueNotification(ref.firestore, tx, uid, 'signed-in-' + authTime, 'ACCOUNT_SIGNED_IN', uid, role);
      }
      const resolvedUpdatedAt =
        typeof updatedAt === 'string'
          ? updatedAt
          : updatedAt && typeof (updatedAt as { toDate?: () => Date }).toDate === 'function'
          ? (updatedAt as { toDate: () => Date }).toDate().toISOString()
          : updatedAt instanceof Date
          ? updatedAt.toISOString()
          : now;
      return { uid, roles, role, fullName: name, phone, onboardingComplete: stored?.onboardingComplete === true,
        updatedAt: resolvedUpdatedAt };
    });
    const driver = profile.role === 'DRIVER' ? await ref.firestore.collection('drivers').doc(uid).get() : null;
    res.set('Cache-Control', 'no-store');
    const approval = driver?.get('approvalStatus');
    sendSuccess(res, { ...profile, ...(driver?.exists ? {
      applicationStatus: approval, onboardingComplete: profile.onboardingComplete || approval === 'APPROVED',
    } : {}) }, 'Session ready.');
  } catch (error) { next(error); }
};
