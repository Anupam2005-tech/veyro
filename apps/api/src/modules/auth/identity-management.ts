import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles, type Role } from './profile.js';
import { appendAdminAudit } from '../audit/audit.service.js';
import { documentId } from '../quotes/quote-repository.js';

export async function verifyLinkedProviders(uid: string) {
  const user = await getAuth().getUser(uid);
  // Linking itself must complete with Firebase's signed-in credential linking flow.
  return { uid, providers: user.providerData.map(p => ({ providerId: p.providerId })),
    emailVerified: user.emailVerified, phoneLinked: !!user.phoneNumber };
}

export async function grantProductRole(db: Firestore, actorId: string, targetId: string,
  role: Role, reason: string, requestId: string) {
  const lead = process.env.ADMIN_GRANTER_UID;
  if (!lead || actorId !== lead) throw new AppError(403, 'LEAD_REQUIRED', 'The configured project lead must authorize grants.');
  if (!['CUSTOMER', 'DRIVER', 'ADMIN'].includes(role) || !reason.trim()) throw new AppError(400, 'INVALID_GRANT', 'Role and reason are required.');
  const target = db.collection('users').doc(documentId(targetId));
  return db.runTransaction(async tx => {
    const actor = await tx.get(db.collection('users').doc(actorId));
    const profile = await tx.get(target);
    const audit = await tx.get(db.collection('adminAuditLogs').doc('grant-' + documentId(requestId)));
    if (audit.exists) {
      if (audit.get('adminId') !== actorId || audit.get('entityId') !== targetId || audit.get('after') !== role ||
          audit.get('reason') !== reason.trim()) throw new AppError(409, 'GRANT_CONFLICT', 'Grant idempotency key conflicts.');
      return;
    }
    const actorRoles = activeRoles(actor.data());
    if (!actorRoles.includes('ADMIN')) throw new AppError(403, 'ROLE_FORBIDDEN', 'Active Admin role required.');
    if (!profile.exists) throw new AppError(404, 'PROFILE_UNAVAILABLE', 'Existing profile required.');
    const targetRoles = activeRoles(profile.data());
    if (targetRoles.includes(role)) return;
    tx.update(target, { roles: [...targetRoles, role], updatedAt: new Date().toISOString() });
    appendAdminAudit(db, tx, { uid: actorId, roles: actorRoles }, 'grant-' + requestId, {
      action: 'GRANT_ROLE', entityType: 'USER', entityId: targetId, before: targetRoles.join(','), after: role, reason,
    });
  });
}
