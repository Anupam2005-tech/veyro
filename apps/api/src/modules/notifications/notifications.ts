import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
import { randomUUID } from 'node:crypto';
import { getMessaging } from 'firebase-admin/messaging';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { documentId } from '../quotes/quote-repository.js';

export function enqueueNotification(db: Firestore, tx: Transaction, uid: string, id: string,
  type: string, resourceId: string) {
  const ref = db.collection('users').doc(documentId(uid)).collection('notifications').doc(documentId(id));
  tx.create(ref, { type, resourceId, read: false, createdAt: new Date(), pushStatus: 'QUEUED' });
}

// A lease prevents simultaneous sends. A process failure after FCM acceptance can result
// in a repeated push after lease expiry; the durable inbox item remains unique.
export async function deliverNotification(db: Firestore, uid: string, id: string) {
  const user = db.collection('users').doc(documentId(uid));
  const ref = user.collection('notifications').doc(documentId(id));
  const lease = randomUUID();
  const tokens = await db.runTransaction(async tx => {
    const item = await tx.get(ref);
    const account = await tx.get(user);
    if (!item.exists || item.get('pushStatus') === 'SENT' || item.get('pushStatus') === 'EXHAUSTED' || item.get('leaseUntil') > Date.now()) return [];
    if ((item.get('attempts') ?? 0) >= 10) {
      tx.update(ref, { pushStatus: 'EXHAUSTED', leaseUntil: 0 });
      return [];
    }
    const configured: unknown = account.get('fcmTokens');
    const list = Array.isArray(configured) ? configured.filter((v): v is string => typeof v === 'string' && !!v) : [];
    if (!list.length) {
      tx.update(ref, { pushStatus: 'IN_APP_ONLY' });
      return [];
    }
    tx.update(ref, { lease, leaseUntil: Date.now() + 60_000, pushStatus: 'SENDING', attempts: (item.get('attempts') ?? 0) + 1 });
    if (list.length > 500) throw new Error('Device token limit exceeded');
    return [...new Set(list)];
  });
  if (!tokens.length) return;
  let failed: string[] = tokens;
  let invalid: string[] = [];
  try {
    const result = await getMessaging(getFirebaseAdminApp()).sendEachForMulticast({
      tokens, data: { notificationId: id },
    });
    failed = tokens.filter((_v, i) => !result.responses[i]?.success);
    invalid = tokens.filter((_v, i) => ['messaging/registration-token-not-registered',
      'messaging/invalid-registration-token'].includes(result.responses[i]?.error?.code ?? ''));
  } finally {
    await db.runTransaction(async tx => {
      const item = await tx.get(ref);
      const account = await tx.get(user);
      if (item.get('lease') !== lease) return;
      const current: unknown = account.get('fcmTokens');
      if (Array.isArray(current) && invalid.length) tx.update(user, { fcmTokens: current.filter(t => !invalid.includes(t)) });
      tx.update(ref, { pushStatus: failed.length ? 'FAILED' : 'SENT', leaseUntil: 0 });
    });
  }
}
