import type { AuthUser } from '../auth/types';
import type {
  CustomerOnboardingInput,
  DriverApplicationInput,
  DriverApplicationStatus,
  RoleIntent,
  VeyroProfile,
} from './types';

export interface DemoApplication {
  status: DriverApplicationStatus;
  adminReason?: string;
  input: DriverApplicationInput;
  submittedAt: string;
}

const PROFILE_KEY = 'veyro:demo:profile:';
const APPLICATION_KEY = 'veyro:demo:application:';

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readJson<T>(key: string): T | null {
  const store = storage();
  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const store = storage();
  if (!store) {
    return;
  }

  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function getDemoProfile(uid: string): VeyroProfile | null {
  return readJson<VeyroProfile>(`${PROFILE_KEY}${uid}`);
}

export function saveDemoProfile(profile: VeyroProfile): VeyroProfile {
  writeJson(`${PROFILE_KEY}${profile.uid}`, profile);
  return profile;
}

export function bootstrapDemoSession(
  user: AuthUser,
  roleIntent: RoleIntent | null
): VeyroProfile {
  const existing = getDemoProfile(user.uid);
  if (existing) {
    return existing;
  }

  const role = roleIntent === 'driver' ? 'DRIVER' : 'CUSTOMER';
  return saveDemoProfile({
    uid: user.uid,
    role,
    fullName: user.displayName ?? (role === 'DRIVER' ? 'New Driver' : 'Veyro Customer'),
    phone: user.phoneNumber ?? '',
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
  });
}

export function saveCustomerOnboardingDemo(
  uid: string,
  input: CustomerOnboardingInput
): VeyroProfile {
  const profile = getDemoProfile(uid) ?? bootstrapDemoSession({ uid, email: null, phoneNumber: input.phone, displayName: input.fullName, getIdToken: async () => 'demo-token' }, null);
  return saveDemoProfile({
    ...profile,
    role: 'CUSTOMER',
    fullName: input.fullName,
    phone: input.phone,
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  });
}

export function getDemoApplication(uid: string): DemoApplication | null {
  return readJson<DemoApplication>(`${APPLICATION_KEY}${uid}`);
}

export function saveDriverApplicationDemo(
  uid: string,
  input: DriverApplicationInput
): VeyroProfile {
  const profile = getDemoProfile(uid) ?? bootstrapDemoSession({ uid, email: null, phoneNumber: input.phone, displayName: input.fullName, getIdToken: async () => 'demo-token' }, 'driver');

  writeJson(`${APPLICATION_KEY}${uid}`, {
    status: 'PENDING_REVIEW',
    input,
    submittedAt: new Date().toISOString(),
  } satisfies DemoApplication);

  return saveDemoProfile({
    ...profile,
    role: 'DRIVER',
    fullName: input.fullName,
    phone: input.phone,
    onboardingComplete: true,
    applicationStatus: 'PENDING_REVIEW',
    adminReason: undefined,
    documents: input.documents,
    updatedAt: new Date().toISOString(),
  });
}

export function resubmitDriverApplicationDemo(uid: string): VeyroProfile {
  const profile = getDemoProfile(uid);
  const application = getDemoApplication(uid);
  if (!profile || !application) {
    throw new Error('No driver application found.');
  }

  const nextStatus: DriverApplicationStatus = 'PENDING_REVIEW';
  writeJson(`${APPLICATION_KEY}${uid}`, {
    ...application,
    status: nextStatus,
    adminReason: undefined,
    submittedAt: new Date().toISOString(),
  } satisfies DemoApplication);

  return saveDemoProfile({
    ...profile,
    applicationStatus: nextStatus,
    adminReason: undefined,
    updatedAt: new Date().toISOString(),
  });
}
