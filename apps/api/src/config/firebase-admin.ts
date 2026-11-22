/**
 * Central Firebase Admin SDK init (BE-FND-003).
 * Single shared instance for Auth verification, Firestore, RTDB, Storage.
 * TODO: bind Application Default Credentials + Secret Manager in production;
 * never commit service-account JSON or secrets.
 */
export interface FirebaseAdminHandles {
  readonly initialised: boolean;
  readonly projectId: string;
}

let cached: FirebaseAdminHandles | null = null;

export function getFirebaseAdmin(): FirebaseAdminHandles {
  if (!cached) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
    cached = { initialised: false, projectId };
  }
  return cached;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_PROJECT_ID);
}
