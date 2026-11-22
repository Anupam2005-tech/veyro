import type { RequestHandler } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { activeRoles, profileRef, type Role } from './profile.js';

export const bootstrapSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new AppError(401, 'UNAUTHENTICATED', 'A valid sign-in is required.');
    const uid = req.auth.uid;
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
      let updatedAt = stored?.updatedAt;
      if (!stored) {
        updatedAt = now;
        tx.create(ref, { uid, roles, role, status: 'ACTIVE', name, phone, email,
          onboardingComplete: false, createdAt: now, updatedAt });
      } else if (stored.email !== email || stored.phone !== phone || !updatedAt) {
        updatedAt = now;
        tx.update(ref, { email, phone, updatedAt });
      }
      return { uid, roles, role, fullName: name, phone, onboardingComplete: stored?.onboardingComplete === true,
        updatedAt: typeof updatedAt === 'string' ? updatedAt : updatedAt.toDate().toISOString() };
    });
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, profile, 'Session ready.');
  } catch (error) { next(error); }
};
