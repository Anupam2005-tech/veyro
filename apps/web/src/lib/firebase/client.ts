import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  firebaseConfig,
  hasFirebaseConfig,
  recaptchaEnterpriseSiteKey,
} from '../env';

let clientApp: FirebaseApp | undefined;
let appCheckInitialized = false;

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

  try {
    initializeAppCheck(getClientFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch {
    appCheckInitialized = true;
  }
}
