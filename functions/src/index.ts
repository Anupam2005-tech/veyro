import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from '@veyro/api/app';

export { pruneStalePresence, dispatchNotifications } from './team3.js';

const app = createApp();

/**
 * 2nd-gen HTTPS onRequest function hosting the Express modular monolith.
 * Canonical prefix: /api/v1/
 */
export const api = onRequest(
  {
    region: 'asia-east2', // Hong Kong (nearest supported Cloud Functions region for Mumbai resources)
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  app
);


import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, getFirestoreDatabaseId } from '@veyro/api/firebase';
import { deliverNotification, deliverNotificationEmail } from '@veyro/api/notifications';
import { SafetyService } from '@veyro/api/safety';

export const deliverInboxPush = onDocumentCreated({
  document: 'users/{uid}/notifications/{id}', database: getFirestoreDatabaseId(), region: 'asia-east2', retry: true,
}, async event => {
  await deliverNotification(getFirestore(), event.params.uid, event.params.id);
});

const resendKey = defineSecret('RESEND_API_KEY');
export const sendNotificationEmail = onDocumentCreated({
  document: 'notificationEmails/{id}', database: getFirestoreDatabaseId(), region: 'asia-east2', secrets: [resendKey],
}, async event => {
  await deliverNotificationEmail(getFirestore(), event.params.id);
});

export const retryNotificationEmails = onSchedule({
  schedule: 'every 5 minutes', region: 'asia-east2', secrets: [resendKey], timeoutSeconds: 240,
}, async () => {
  if (!process.env.RESEND_FROM_EMAIL) return;
  const db = getFirestore();
  const due = await db.collection('notificationEmails').where('nextAttemptAt', '<=', Date.now()).limit(25).get();
  for (let i = 0; i < due.docs.length; i += 5) {
    await Promise.allSettled(due.docs.slice(i, i + 5).map(job => deliverNotificationEmail(db, job.id)));
  }
});

export const applyVerifiedIncident = onDocumentWritten({
  document: 'verifiedIncidents/{id}', database: getFirestoreDatabaseId(), region: 'asia-east2', retry: true,
}, async event => {
  const data = event.data?.after.data();
  if (data?.verified === true && data.qualifies === true && data.processed !== true) {
    await new SafetyService(getFirestore()).applyIncident(event.params.id);
  }
});

export const retryInboxPush = onSchedule({ schedule: 'every 5 minutes', region: 'asia-east2' }, async () => {
  const db = getFirestore();
  const batch = await db.collectionGroup('notifications')
    .where('pushStatus', 'in', ['QUEUED', 'FAILED', 'SENDING']).limit(100).get();
  for (const item of batch.docs) {
    const uid = item.ref.parent.parent?.id;
    if (uid) await deliverNotification(db, uid, item.id);
  }
});

import { expireBookings, broadcastBookings } from '@veyro/api/booking-workers';

export const expireBookingOffers = onSchedule({ schedule: '* * * * *', region: 'asia-east2', timeoutSeconds: 540 }, async () => {
  await expireBookings(getFirestore());
});
export const broadcastScheduledBookings = onSchedule({ schedule: '* * * * *', region: 'asia-east2', timeoutSeconds: 540 }, async () => {
  await broadcastBookings(getFirestore());
});

import { clearTripLocation, cleanupLocations } from '@veyro/api/mobility';

export const clearEndedTripLocation = onDocumentWritten({
  document: 'trips/{id}', database: getFirestoreDatabaseId(), region: 'asia-east2', retry: true,
}, async event => {
  await clearTripLocation(getFirestore(), event.params.id);
});
export const cleanupEphemeralLocations = onSchedule({ schedule: 'every 15 minutes', region: 'asia-east2' }, async () => {
  await cleanupLocations(getFirestore());
});
