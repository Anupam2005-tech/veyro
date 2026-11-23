import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, getLimitedUseToken, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import {
  firebaseConfig,
  hasFirebaseConfig,
  recaptchaEnterpriseSiteKey,
} from '../env';

let clientApp: FirebaseApp | undefined;
let appCheckInitialized = false;
let appCheck: AppCheck | undefined;

export function getClientFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase client configuration is incomplete.');
  }

  if (!clientApp) {
    clientApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return clientApp;
}

export function initializeClientAppCheck(): void {
  if (
    appCheckInitialized ||
    !hasFirebaseConfig ||
    !recaptchaEnterpriseSiteKey ||
    typeof window === 'undefined'
  ) {
    return;
  }

  // In non-production environments, only initialize App Check if a registered debug token is provided.
  // Setting FIREBASE_APPCHECK_DEBUG_TOKEN to `true` causes Firebase to generate an unregistered
  // debug token which Google's App Check server rejects with 403 (Forbidden).
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (process.env.NODE_ENV !== 'production' && !debugToken) {
    delete (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN;
    return;
  }

  try {
    if (debugToken) {
      (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        debugToken;
    }

    appCheck = initializeAppCheck(getClientFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('App Check initialization skipped in dev:', error);
      return;
    }
    throw new Error('App Check could not initialize.', { cause: error });
  }
}

export async function getClientAppCheckToken(): Promise<string | null> {
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (process.env.NODE_ENV !== 'production' && !debugToken) {
    return null;
  }

  try {
    initializeClientAppCheck();
    if (!appCheck) {
      if (process.env.NODE_ENV === 'production') throw new Error('App Check configuration is required for live requests.');
      return null;
    }
    return (await getLimitedUseToken(appCheck)).token;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('App Check token retrieval skipped in dev:', error);
      return null;
    }
    throw error;
  }
}
