import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  getRedirectResult,
  isSignInWithEmailLink,
  linkWithCredential,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type AuthCredential,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { isDemoMode } from '../env';
import { getClientFirebaseApp, initializeClientAppCheck } from '../firebase/client';
import type { AuthFlowError, AuthUser, PhoneConfirmation } from './types';

const DEMO_USER_KEY = 'veyro:demo:user';
const EMAIL_KEY = 'veyro:email-for-signin';
const RETURN_KEY = 'veyro:auth-return-to';
const AUTH_EVENT = 'veyro:auth-change';

let pendingCredential: AuthCredential | null = null;

function getFirebaseAuth() {
  initializeClientAppCheck();
  return getAuth(getClientFirebaseApp());
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    getIdToken: () => user.getIdToken(),
  };
}

function toAuthFlowError(error: unknown): AuthFlowError {
  const source = error as {
    code?: string;
    message?: string;
    email?: string | null;
    credential?: AuthCredential | null;
  };
  const result = new Error(source.message ?? 'Authentication failed.') as AuthFlowError;
  result.code = source.code ?? 'auth/unknown';
  result.email = source.email ?? null;

  if (result.code === 'auth/account-exists-with-different-credential') {
    pendingCredential = source.credential ?? null;
  }

  return result;
}

async function linkPendingCredential(user: User): Promise<void> {
  if (!pendingCredential) {
    return;
  }

  const credential = pendingCredential;
  pendingCredential = null;
  await linkWithCredential(user, credential);
}

async function finalizeSignIn(credential: UserCredential): Promise<AuthUser> {
  await linkPendingCredential(credential.user);
  return toAuthUser(credential.user);
}

function createDemoUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uid: overrides.uid ?? `demo-${Date.now()}`,
    email: overrides.email ?? null,
    phoneNumber: overrides.phoneNumber ?? null,
    displayName: overrides.displayName ?? null,
    getIdToken: async () => 'demo-token',
  };
}

function publishDemoUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(
      DEMO_USER_KEY,
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      })
    );
  } else {
    window.localStorage.removeItem(DEMO_USER_KEY);
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function readDemoUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DEMO_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Omit<AuthUser, 'getIdToken'>;
    return { ...parsed, getIdToken: async () => 'demo-token' };
  } catch {
    return null;
  }
}

export function subscribeToAuth(
  callback: (user: AuthUser | null) => void
): () => void {
  if (isDemoMode) {
    const notify = () => callback(readDemoUser());
    notify();
    if (typeof window === 'undefined') {
      return () => undefined;
    }
    window.addEventListener(AUTH_EVENT, notify);
    return () => window.removeEventListener(AUTH_EVENT, notify);
  }

  return onAuthStateChanged(getFirebaseAuth(), (user) =>
    callback(user ? toAuthUser(user) : null)
  );
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  if (isDemoMode) {
    return readDemoUser();
  }

  const user = getFirebaseAuth().currentUser;
  return user ? toAuthUser(user) : null;
}

export async function handleAuthRedirect(): Promise<AuthUser | null> {
  if (isDemoMode) {
    return readDemoUser();
  }

  const credential = await getRedirectResult(getFirebaseAuth());
  return credential ? finalizeSignIn(credential) : null;
}

export function getStoredSignInEmail(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(EMAIL_KEY);
}

export function getStoredReturnPath(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(RETURN_KEY);
}

export function clearStoredAuthHints(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(EMAIL_KEY);
  window.localStorage.removeItem(RETURN_KEY);
}

export async function sendEmailLink(email: string, returnTo: string): Promise<void> {
  if (isDemoMode) {
    window.localStorage.setItem(EMAIL_KEY, email);
    window.localStorage.setItem(RETURN_KEY, returnTo);
    await delay(350);
    return;
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('continue', returnTo);

  try {
    await sendSignInLinkToEmail(getFirebaseAuth(), email, {
      url: callbackUrl.toString(),
      handleCodeInApp: true,
    });
    window.localStorage.setItem(EMAIL_KEY, email);
    window.localStorage.setItem(RETURN_KEY, returnTo);
  } catch (error) {
    throw toAuthFlowError(error);
  }
}

export function isEmailLinkSignIn(): boolean {
  if (isDemoMode) {
    return true;
  }
  return isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
}

export async function completeEmailLink(email?: string): Promise<AuthUser> {
  if (isDemoMode) {
    const user = createDemoUser({
      email: email ?? getStoredSignInEmail() ?? 'demo.rider@veyro.local',
    });
    publishDemoUser(user);
    clearStoredAuthHints();
    return user;
  }

  const resolvedEmail = email ?? getStoredSignInEmail();
  if (!resolvedEmail) {
    throw toAuthFlowError(new Error('Enter the email address used for this sign-in link.'));
  }

  try {
    const credential = await signInWithEmailLink(
      getFirebaseAuth(),
      resolvedEmail,
      window.location.href
    );
    clearStoredAuthHints();
    return await finalizeSignIn(credential);
  } catch (error) {
    throw toAuthFlowError(error);
  }
}

export function createPhoneRecaptcha(containerId: string): RecaptchaVerifier | null {
  if (isDemoMode) {
    return null;
  }
  return new RecaptchaVerifier(getFirebaseAuth(), containerId, { size: 'normal' });
}

export async function sendSmsCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier | null
): Promise<PhoneConfirmation> {
  if (isDemoMode) {
    await delay(350);
    return {
      confirm: async (code: string) => {
        if (!/^\d{6}$/.test(code)) {
          throw toAuthFlowError(new Error('Enter the six-digit code.'));
        }
        const user = createDemoUser({ phoneNumber });
        publishDemoUser(user);
        return user;
      },
    };
  }

  try {
    const result = await signInWithPhoneNumber(
      getFirebaseAuth(),
      phoneNumber,
      verifier ?? undefined
    );
    return {
      confirm: async (code: string) => finalizeSignIn(await result.confirm(code)),
    };
  } catch (error) {
    throw toAuthFlowError(error);
  }
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (isDemoMode) {
    const user = createDemoUser({
      email: 'demo.google@veyro.local',
      displayName: 'Demo Rider',
    });
    publishDemoUser(user);
    return user;
  }

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    return await finalizeSignIn(await signInWithPopup(auth, provider));
  } catch (error) {
    const flowError = toAuthFlowError(error);
    if (
      flowError.code === 'auth/popup-closed-by-user' ||
      flowError.code === 'auth/popup-blocked' ||
      flowError.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw flowError;
  }
}

export async function signOutCurrentUser(): Promise<void> {
  if (isDemoMode) {
    publishDemoUser(null);
    return;
  }
  await firebaseSignOut(getFirebaseAuth());
}

export function hasPendingLinkCredential(): boolean {
  return pendingCredential !== null;
}

export function authErrorMessage(error: AuthFlowError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/account-exists-with-different-credential':
      return 'That email already uses another sign-in method. Sign in with your existing method and we will link it safely.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before it completed.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'That sign-in link is invalid or has expired. Request a new one.';
    case 'auth/invalid-verification-code':
      return 'That OTP is incorrect. Check the code and try again.';
    case 'auth/code-expired':
      return 'That OTP expired. Request a new one.';
    default:
      return error.message;
  }
}
