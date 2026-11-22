function requireReason(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('An Admin reason is required');
  }
  return value.trim();
}

export function prepareApplicationReview(
  currentStatus: string,
  action: unknown,
  reason: unknown,
  requestedChanges?: readonly unknown[],
) {
  if (currentStatus !== 'PENDING_REVIEW') {
    throw new Error('Only pending applications can be reviewed');
  }
  const reviewReason = requireReason(reason);

  switch (action) {
    case 'APPROVE':
      return { status: 'APPROVED' as const, reviewReason };
    case 'REJECT':
      return { status: 'REJECTED' as const, reviewReason };
    case 'REQUEST_CHANGES': {
      if (!Array.isArray(requestedChanges) || !requestedChanges.length) {
        throw new Error('At least one requested change is required');
      }
      const changes = Array.from(requestedChanges, (item) => {
        if (typeof item !== 'string' || !item.trim()) {
          throw new Error('Requested changes must be nonblank strings');
        }
        return item.trim();
      });
      return { status: 'NEEDS_CHANGES' as const, reviewReason, changes };
    }
    default:
      throw new Error('Unsupported application review action');
  }
}

export function prepareDriverControl(currentStatus: string, action: unknown, reason: unknown) {
  const auditReason = requireReason(reason);
  if (action === 'DEACTIVATE' && currentStatus === 'APPROVED') {
    return { approvalStatus: 'DEACTIVATED' as const, auditReason };
  }
  if (action === 'RESTORE' && currentStatus === 'DEACTIVATED') {
    return { approvalStatus: 'APPROVED' as const, auditReason };
  }
  throw new Error('Unsupported driver approval status transition');
}

export function prepareCustomerRestore(currentStatus: string, reason: unknown) {
  if (currentStatus !== 'SUSPENDED') {
    throw new Error('Only suspended customers can be restored');
  }
  return { status: 'ACTIVE' as const, auditReason: requireReason(reason) };
}
