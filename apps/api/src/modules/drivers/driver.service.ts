export type DriverApprovalStatus = 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'REJECTED' | 'APPROVED' | 'DEACTIVATED' | 'SUSPENDED';

export interface DriverProfile {
  readonly uid: string;
  readonly approvalStatus: DriverApprovalStatus;
  readonly hourlyRateInr: number;
  readonly perKmRateInr: number | null;
  readonly serviceAreas: readonly string[];
  readonly categories: readonly string[];
  readonly transmissions: readonly string[];
}

export function createDriver(uid: string, hourlyRateInr: number): DriverProfile {
  if (!uid.trim()) throw new RangeError('UID is required');
  if (!Number.isFinite(hourlyRateInr) || hourlyRateInr < 0) {
    throw new RangeError('Hourly rate must be a non-negative number');
  }
  return {
    uid,
    approvalStatus: 'PENDING_REVIEW',
    hourlyRateInr,
    perKmRateInr: null,
    serviceAreas: [],
    categories: [],
    transmissions: [],
  };
}

export function approveDriver(profile: DriverProfile): DriverProfile {
  if (profile.approvalStatus !== 'PENDING_REVIEW' && profile.approvalStatus !== 'NEEDS_CHANGES') {
    throw new Error('Only pending drivers can be approved');
  }
  return { ...profile, approvalStatus: 'APPROVED' };
}

export function isDriverApprovable(profile: Pick<DriverProfile, 'approvalStatus'>): boolean {
  return profile.approvalStatus === 'APPROVED';
}
