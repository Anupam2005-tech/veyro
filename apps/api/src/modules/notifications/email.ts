import { createHash, randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '../../config/firebase-admin.js';

const messages: Record<string, readonly [string, string]> = {
  ACCOUNT_REGISTERED: ['Welcome to Veyro', 'Your account has been created. Sign in to finish setting up your profile.'],
  ACCOUNT_SIGNED_IN: ['New sign-in to Veyro', 'A sign-in to your account was recorded. If this was unexpected, secure your account and contact Veyro support.'],
  PROFILE_COMPLETED: ['Your profile is ready', 'Your Veyro profile setup is complete.'],
  PROFILE_UPDATED: ['Your profile was updated', 'Your Veyro profile details changed. Sign in to review them.'],
  DRIVER_APPLICATION_SUBMITTED: ['Driver application received', 'Your documents were submitted for review. Check Driver Status for updates.'],
  ADMIN_DECISION: ['Veyro review update', 'A decision is available. Sign in to review the update.'],
  DRIVER_APPLICATION_DECISION: ['Driver application decision', 'Open Veyro Driver to review your application update.'],
  DRIVER_ACCOUNT_CONTROLLED: ['Driver account status changed', 'Sign in to Veyro Driver to check your account status.'],
  CUSTOMER_ACCOUNT_RESTORED: ['Your Veyro account was restored', 'You can sign in to use your customer account again.'],
  DRIVER_TRIP_COMPLETED: ['Trip completed', 'Open Veyro Driver to review the completed trip and earnings.'],
  DRIVER_BOOKING_ASSIGNED: ['Your Veyro trip is confirmed', 'You accepted a booking. Open the driver dashboard to review the pickup.'],
  DRIVER_BOOKING_CANCELLED: ['A customer cancelled your trip', 'The trip has been removed from your active bookings. Open the driver dashboard for details.'],
  BOOKING_SCHEDULED_QUEUED: ['Scheduled booking received', 'We received your scheduled request. Sign in to view its current status.'],
  BOOKING_ASSIGNED: ['Your booking has a driver', 'A driver accepted your booking. Open Veyro for trip details.'],
  BOOKING_NEEDS_REBOOK: ['Your booking needs to be rebooked', 'Please open Veyro to arrange another booking.'],
  BOOKING_EXPIRED: ['Your booking request expired', 'Open Veyro if you still need a driver.'],
  BOOKING_CANCELLED_BY_DRIVER: ['Your booking was cancelled', 'Your driver cancelled the booking. Open Veyro for details.'],
  BOOKING_CANCELLED_BY_CUSTOMER: ['Your booking was cancelled', 'Your booking was cancelled. Open Veyro for details.'],
  DRIVER_ARRIVED: ['Your driver has arrived', 'Open the trip screen to confirm the pickup and get your start code when you are ready.'],
  TRIP_STARTED: ['Your trip has started', 'Open Veyro to check your trip status.'],
  TRIP_COMPLETED: ['Your trip is complete', 'Open Veyro to review the trip and fare.'],
  DRIVER_NO_SHOW: ['Your booking status changed', 'Open Veyro to review your driver no-show update.'],
  CUSTOMER_NO_SHOW: ['Your booking status changed', 'Open Veyro to review your no-show update.'],
  PAYMENT_CAPTURED: ['Veyro payment confirmed', 'Your payment was confirmed. Open Veyro to review your receipt.'],
  ACCOUNT_SUSPENDED: ['Your Veyro account is suspended', 'Your account access changed. Contact Veyro support if you need help.'],
};

export function notificationTitle(type: string) {
  return messages[type]?.[0] ?? type.toLowerCase().replaceAll('_', ' ');
}

export function enqueueEmail(db: Firestore, tx: Transaction, uid: string, eventId: string, type: string) {
  if (!Object.hasOwn(messages, type)) return;
  const id = createHash('sha256').update(JSON.stringify([uid, eventId])).digest('hex');
  const now = Date.now();
  tx.create(db.collection('notificationEmails').doc(id), { uid, type, attempts: 0, createdAt: now, nextAttemptAt: now, status: 'QUEUED' });
}

export async function deliverNotificationEmail(db: Firestore, id: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) return;

  const ref = db.collection('notificationEmails').doc(id);
  const lease = randomUUID();
  const job = await db.runTransaction(async tx => {
    const item = await tx.get(ref);
    const due = item.get('nextAttemptAt');
    if (typeof due !== 'number' || due > Date.now()) return;
    const attempts: number = item.get('attempts');
    if (attempts >= 7 || Date.now() - item.get('createdAt') >= 12 * 60 * 60 * 1000) {
      tx.update(ref, { status: 'EXHAUSTED', nextAttemptAt: FieldValue.delete() });
      return;
    }
    tx.update(ref, { lease, status: 'SENDING', attempts: attempts + 1, nextAttemptAt: Date.now() + 120_000 });
    return { uid: String(item.get('uid')), type: String(item.get('type')), attempts: attempts + 1,
      payloadHash: item.get('payloadHash') as string | undefined };
  });
  if (!job) return;

  const finish = (status: string, retry = false) => db.runTransaction(async tx => {
    const item = await tx.get(ref);
    if (item.get('lease') !== lease) return;
    tx.update(ref, { status, nextAttemptAt: retry ? Date.now() + Math.min(60, 2 ** job.attempts) * 60_000 : FieldValue.delete() });
  });

  try {
    const message = Object.hasOwn(messages, job.type) ? messages[job.type] : undefined;
    const account = await getAuth(getFirebaseAdminApp()).getUser(job.uid);
    const profile = await db.collection('users').doc(job.uid).get();
    const preference = /^(DRIVER_)?BOOKING_/.test(job.type) ? 'bookingUpdates' :
      /^(DRIVER_)?TRIP_/.test(job.type) || job.type.endsWith('_NO_SHOW') || job.type === 'DRIVER_ARRIVED' ? 'tripStatus' : null;
    if (!message || account.disabled || !account.email ||
      !profile.exists || (profile.get('status') !== 'ACTIVE' && job.type !== 'ACCOUNT_SUSPENDED') ||
      (preference && profile.get('notifications.' + preference) === false)) {
      await finish('SKIPPED');
      return;
    }
    if (!account.emailVerified) {
      await finish(job.type === 'ACCOUNT_REGISTERED' ? 'RETRY' : 'SKIPPED', job.type === 'ACCOUNT_REGISTERED');
      return;
    }
    const [subject, text] = message;
    const payload = JSON.stringify({ from, to: [account.email], subject, text });
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    if (job.payloadHash && job.payloadHash !== payloadHash) {
      await finish('SKIPPED');
      return;
    }
    const claimed = await db.runTransaction(async tx => {
      if ((await tx.get(ref)).get('lease') !== lease) return false;
      tx.update(ref, { payloadHash });
      return true;
    });
    if (!claimed) return;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
        'Idempotency-Key': 'veyro/' + id }, body: payload, signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) await finish('ACCEPTED');
    else if (response.status === 429 || response.status === 409 || response.status >= 500) await finish('RETRY', true);
    else await finish('REJECTED');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
      await finish('SKIPPED');
    } else {
      await finish('RETRY', true);
    }
  }
}
