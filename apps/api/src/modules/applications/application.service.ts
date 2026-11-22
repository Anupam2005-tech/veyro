export type ApplicationStatus = 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'REJECTED' | 'APPROVED';

export interface DriverApplication {
  readonly id: string;
  readonly driverUid: string;
  readonly status: ApplicationStatus;
  readonly documentPaths: readonly string[];
  readonly reason: string | null;
}

export function submitApplication(id: string, driverUid: string, documentPaths: readonly string[]): DriverApplication {
  if (!id.trim() || !driverUid.trim()) throw new RangeError('Application id and driver are required');
  if (!documentPaths.length) throw new RangeError('At least one document is required');
  for (const path of documentPaths) {
    if (typeof path !== 'string' || !path.startsWith(`drivers/${driverUid}/`)) {
      throw new RangeError('Documents must live under the driver private path');
    }
  }
  return { id, driverUid, status: 'PENDING_REVIEW', documentPaths: Object.freeze([...documentPaths]), reason: null };
}

export function reviewApplication(
  app: DriverApplication,
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
  reason: string,
): DriverApplication {
  if (app.status !== 'PENDING_REVIEW') throw new Error('Only pending applications can be reviewed');
  if (!reason.trim()) throw new Error('An audit reason is required');
  switch (action) {
    case 'APPROVE':
      return { ...app, status: 'APPROVED', reason: reason.trim() };
    case 'REJECT':
      return { ...app, status: 'REJECTED', reason: reason.trim() };
    case 'REQUEST_CHANGES':
      return { ...app, status: 'NEEDS_CHANGES', reason: reason.trim() };
  }
}
