import { getApps, initializeApp, type AppOptions } from 'firebase-admin/app';

/** Use the Functions runtime configuration in deployment and ADC for credentials. */
export function getFirebaseAdminApp() {
  const existing = getApps().find(app => app.name === '[DEFAULT]');
  if (existing) return existing;
  if (process.env.FIREBASE_CONFIG) return initializeApp();

  const options: AppOptions = {};
  if (process.env.FIREBASE_PROJECT_ID) options.projectId = process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_DATABASE_URL) options.databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (process.env.FIREBASE_STORAGE_BUCKET) options.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  return initializeApp(options);
}
