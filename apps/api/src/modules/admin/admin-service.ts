import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles } from '../auth/profile.js';
import { appendAdminAudit } from '../audit/audit.service.js';
import { documentId } from '../quotes/quote-repository.js';
import { prepareApplicationReview, prepareCustomerRestore, prepareDriverControl } from './admin-decision-rules.js';
import { enqueueNotification } from '../notifications/notifications.js';

export class AdminService {
  constructor(private readonly db: Firestore) {}

  change(adminId: string, id: string, entity: 'APPLICATION' | 'DRIVER' | 'CUSTOMER',
    action: string, reason: string, requestId: string, requestedChanges?: string[]) {
    const auditRef = this.db.collection('adminAuditLogs').doc(documentId('control-' + requestId));
    const collection = entity === 'APPLICATION' ? 'driverApplications' : entity === 'DRIVER' ? 'drivers' : 'users';
    const fingerprint = createHash('sha256').update(JSON.stringify({ id, entity, action, reason: reason.trim(),
      requestedChanges: requestedChanges ?? null })).digest('hex');
    const requestRef = this.db.collection('adminRequests').doc(documentId(requestId));
    const target = this.db.collection(collection).doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const admin = await tx.get(this.db.collection('users').doc(adminId));
      const roles = activeRoles(admin.data());
      if (!roles.includes('ADMIN')) throw new AppError(403, 'ROLE_FORBIDDEN', 'Admin role required.');
      const record = await tx.get(target);
      const audit = await tx.get(auditRef);
      const priorRequest = await tx.get(requestRef);
      if (audit.exists) {
        if (priorRequest.get('fingerprint') !== fingerprint) throw new AppError(409, 'ADMIN_REQUEST_CONFLICT', 'Decision payload changed.');
        if (audit.get('adminId') !== adminId || audit.get('entityId') !== id || audit.get('entityType') !== entity ||
            audit.get('action') !== action || audit.get('reason') !== reason.trim()) {
          throw new AppError(409, 'ADMIN_REQUEST_CONFLICT', 'Idempotency key was used for another decision.');
        }
        return audit.get('after') as string;
      }
      if (!record.exists) throw new AppError(404, 'ADMIN_TARGET_NOT_FOUND', 'Record unavailable.');
      let update: Record<string, unknown>, before: string, after: string;
      try {
        if (entity === 'APPLICATION') {
          before = record.get('status');
          const prepared = prepareApplicationReview(before, action, reason, requestedChanges);
          update = { ...prepared, reviewedBy: adminId, reviewedAt: new Date() };
          after = prepared.status;
        } else if (entity === 'DRIVER') {
          before = record.get('approvalStatus');
          const prepared = prepareDriverControl(before, action, reason);
          update = { ...prepared, ...(action === 'DEACTIVATE' ? { online: false } : {}), updatedAt: new Date() };
          after = prepared.approvalStatus;
        } else {
          before = record.get('status');
          const targetRoles = record.get('roles') ?? [record.get('role')];
          if (!Array.isArray(targetRoles) || !targetRoles.includes('CUSTOMER')) throw new Error('Customer profile required');
          if (action !== 'RESTORE') throw new Error('Unsupported action');
          const prepared = prepareCustomerRestore(before, reason);
          update = { status: prepared.status, restoredBy: adminId, restoredAt: new Date(), restorationReason: prepared.auditReason };
          after = prepared.status;
        }
      } catch {
        throw new AppError(422, 'INVALID_ADMIN_TRANSITION', 'The decision, current state or reason is invalid.');
      }
      const subjectId = entity === 'APPLICATION' ? record.get('driverId') ?? record.get('uid') : id;
      if (typeof subjectId !== 'string') throw new AppError(409, 'PROFILE_CONTRACT_PENDING', 'The application owner must be recorded.');
      if (entity === 'APPLICATION') {
        const driver = this.db.collection('drivers').doc(documentId(subjectId));
        const user = this.db.collection('users').doc(subjectId);
        const driverProfile = await tx.get(driver);
        const userProfile = await tx.get(user);
        if (!driverProfile.exists) throw new AppError(409, 'PROFILE_CONTRACT_PENDING', 'Driver profile is required for a decision.');
        tx.update(driver, { approvalStatus: after, ...(after !== 'APPROVED' ? { online: false } : {}), updatedAt: new Date() });
        if (userProfile.exists) tx.update(user, { applicationStatus: after, updatedAt: new Date().toISOString(),
          ...(after === 'APPROVED' ? { onboardingComplete: true } : {}) });
      }
      if (entity === 'DRIVER' && action === 'DEACTIVATE' || entity === 'APPLICATION' && after !== 'APPROVED') {
        tx.set(this.db.collection('driverAvailability').doc(subjectId), { online: false, updatedAt: Date.now() }, { merge: true });
      }
      tx.create(requestRef, { fingerprint });
      tx.update(target, update);
      appendAdminAudit(this.db, tx, { uid: adminId, roles }, auditRef.id, {
        action, entityType: entity, entityId: id, before, after, reason,
      });
      const notification = entity === 'APPLICATION' ? 'DRIVER_APPLICATION_DECISION'
        : entity === 'DRIVER' ? 'DRIVER_ACCOUNT_CONTROLLED' : 'CUSTOMER_ACCOUNT_RESTORED';
      enqueueNotification(this.db, tx, subjectId, auditRef.id, notification, id);
      return after;
    });
  }
}
