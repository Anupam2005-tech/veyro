import { createAuditRecord, type AdminAuditRecord, type AuditStore, type AuditTransaction } from './audit.repository.js';

interface AuditActor {
  uid: string;
  roles: readonly string[];
}

type AuditChange = Omit<AdminAuditRecord, 'adminId' | 'createdAt'>;

// The caller supplies the verified request identity and the transaction for the state change.
export function appendAdminAudit<Reference>(
  store: AuditStore<Reference>,
  transaction: AuditTransaction<Reference>,
  actor: AuditActor | null | undefined,
  auditId: string,
  change: AuditChange,
): void {
  if (typeof actor?.uid !== 'string' || !actor.uid.trim() || !Array.isArray(actor.roles) || !actor.roles.includes('ADMIN')) {
    throw new Error('Verified Admin authorization is required');
  }

  const reason = change.reason.trim();
  if (!reason) {
    throw new Error('An audit reason is required');
  }

  if (!auditId.trim() || auditId.includes('/')) {
    throw new Error('A single audit document ID is required');
  }

  const { before, after } = change;
  if (
    (before !== null && typeof before !== 'string') ||
    (after !== null && typeof after !== 'string')
  ) {
    throw new Error('Audit state must be a status string or null');
  }

  createAuditRecord(store, transaction, auditId, {
    adminId: actor.uid,
    action: change.action,
    entityType: change.entityType,
    entityId: change.entityId,
    before,
    after,
    reason,
    createdAt: new Date(),
  });
}
