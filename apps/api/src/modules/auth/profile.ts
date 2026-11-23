import type { DocumentData } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';

export type Role = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

export function profileRef(uid: string) {
  if (!uid || uid.includes('/') || uid === '.' || uid === '..' || /^__.*__$/.test(uid)) {
    throw new AppError(403, 'PROFILE_UNAVAILABLE', 'Profile is unavailable.');
  }
  return getFirestore(getFirebaseAdminApp()).collection('users').doc(uid);
}

export function activeRoles(profile: DocumentData | undefined): Role[] {
  // Older profiles have one role. When present, the roles array is authoritative.
  const roles: unknown = profile?.roles === undefined ? [profile?.role] : profile.roles;
  if (profile?.status !== 'ACTIVE' || !Array.isArray(roles) || !roles.length ||
      !roles.every(role => role === 'CUSTOMER' || role === 'DRIVER' || role === 'ADMIN')) {
    throw new AppError(403, 'PROFILE_UNAVAILABLE', 'An active profile is required.');
  }
  return roles;
}
