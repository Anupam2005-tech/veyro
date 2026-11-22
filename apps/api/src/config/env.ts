import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback = ''): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 4000,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL ?? '',
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  googleMapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY ?? '',
};

export function validateEnv(): void {
  if (env.nodeEnv === 'production') {
    required('FIREBASE_PROJECT_ID', env.firebaseProjectId);
    required('FRONTEND_ORIGIN', env.frontendOrigin);
  }
}
