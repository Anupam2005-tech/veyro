export interface AdminAuditRecord {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  reason: string;
  createdAt: Date;
}

export interface AuditStore<Reference> {
  collection(path: string): { doc(id: string): Reference };
}

export interface AuditTransaction<Reference> {
  create(reference: Reference, record: AdminAuditRecord): unknown;
}

export function createAuditRecord<Reference>(
  store: AuditStore<Reference>,
  transaction: AuditTransaction<Reference>,
  auditId: string,
  record: AdminAuditRecord,
): void {
  const reference = store.collection('adminAuditLogs').doc(auditId);
  transaction.create(reference, record);
}
