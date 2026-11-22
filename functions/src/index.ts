import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from '@veyro/api/app';

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
import { getFirestore } from 'firebase-admin/firestore';
import { deliverNotification } from '@veyro/api/notifications';
import { SafetyService } from '@veyro/api/safety';

export const deliverInboxPush = onDocumentCreated({
  document: 'users/{uid}/notifications/{id}', region: 'asia-east2', retry: true,
}, async event => {
  await deliverNotification(getFirestore(), event.params.uid, event.params.id);
});

export const applyVerifiedIncident = onDocumentWritten({
  document: 'verifiedIncidents/{id}', region: 'asia-east2', retry: true,
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
