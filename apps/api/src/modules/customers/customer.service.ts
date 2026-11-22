export type CustomerStatus = 'ACTIVE' | 'SUSPENDED';

export interface CustomerProfile {
  readonly uid: string;
  readonly displayName: string;
  readonly phoneE164: string | null;
  readonly status: CustomerStatus;
  readonly incidentCount: number;
}

export function createCustomer(uid: string, displayName: string): CustomerProfile {
  if (!uid.trim()) throw new RangeError('UID is required');
  if (!displayName.trim()) throw new RangeError('Display name is required');
  return { uid, displayName: displayName.trim(), phoneE164: null, status: 'ACTIVE', incidentCount: 0 };
}

export function suspendCustomer(profile: CustomerProfile): CustomerProfile {
  if (profile.status === 'SUSPENDED') throw new Error('Customer already suspended');
  return { ...profile, status: 'SUSPENDED' };
}

export function restoreCustomer(profile: CustomerProfile): CustomerProfile {
  if (profile.status !== 'SUSPENDED') throw new Error('Only suspended customers can be restored');
  return { ...profile, status: 'ACTIVE' };
}
