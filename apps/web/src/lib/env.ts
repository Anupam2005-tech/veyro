export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

export const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.length > 0
);

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const recaptchaEnterpriseSiteKey =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ?? '';

export const googleMapsApiKey =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
  '';
export const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';

export const isDemoMode =
  process.env.NEXT_PUBLIC_VEYRO_DEMO_MODE === 'true';

export const isDemoDataMode = isDemoMode;

export const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
