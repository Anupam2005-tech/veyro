import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
import { createHash, randomUUID } from 'node:crypto';
import { getMessaging } from 'firebase-admin/messaging';
import type { DocumentSnapshot, Firestore, Transaction } from 'firebase-admin/firestore';
import { documentId } from '../quotes/quote-repository.js';
import { enqueueEmail } from './email.js';
import { activeRoles, type Role } from '../auth/profile.js';
import { AppError } from '../../shared/http/app-error.js';
export { deliverNotificationEmail } from './email.js';

export function notificationRole(account: DocumentSnapshot, requested?: unknown): Role {
  const roles = activeRoles(account.data());
  const role = requested ?? (roles.includes(account.get('role')) ? account.get('role') : roles[0]);
  if (!roles.includes(role)) throw new AppError(403, 'ROLE_FORBIDDEN', 'Notification workspace unavailable.');
  return role;
}

function eventAudience(type: string): Role | undefined {
  if (['BOOKING_OFFER', 'DRIVER_TRIP_COMPLETED', 'DRIVER_APPLICATION_SUBMITTED', 'DRIVER_APPLICATION_DECISION',
    'DRIVER_PROFILE_UPDATED', 'DRIVER_ACCOUNT_CONTROLLED'].includes(type)) return 'DRIVER';
  if (/^(BOOKING_|TRIP_|PAYMENT_)/.test(type) ||
    ['PROFILE_UPDATED', 'PROFILE_COMPLETED', 'DRIVER_ARRIVED', 'DRIVER_NO_SHOW', 'CUSTOMER_NO_SHOW',
      'CUSTOMER_ACCOUNT_RESTORED'].includes(type)) return 'CUSTOMER';
}

export function notificationAudience(item: DocumentSnapshot, primary: Role): Role {
  return item.get('audience') ?? eventAudience(item.get('type') ?? '') ?? primary;
}

function bindingRef(db: Firestore, token: string) {
  return db.collection('notificationDevices').doc(createHash('sha256').update(token).digest('hex'));
}

export async function registerNotificationDevice(db: Firestore, uid: string, token: string, requestedRole?: unknown) {
  const ref = bindingRef(db, token);
  const account = db.collection('users').doc(uid);
  return db.runTransaction(async tx => {
    const [owner, binding] = await Promise.all([tx.get(account), tx.get(ref)]);
    const role = notificationRole(owner, requestedRole);
    const previousUid: unknown = binding.get('uid');
    const previousOwner = typeof previousUid === 'string' && previousUid !== uid
      ? await tx.get(db.collection('users').doc(previousUid)) : null;
    const tokens: string[] = owner.get('fcmTokens') ?? [];
    if (!Array.isArray(tokens) || tokens.length >= 20 && !tokens.includes(token)) {
      throw new AppError(409, 'DEVICE_LIMIT', 'Remove an existing device first.');
    }
    const channel = previousUid === uid && binding.get('role') === role ? binding.get('channel') ?? randomUUID() : randomUUID();
    if (previousOwner?.exists) {
      const oldTokens: unknown = previousOwner.get('fcmTokens');
      if (Array.isArray(oldTokens)) tx.update(previousOwner.ref, { fcmTokens: oldTokens.filter(t => t !== token) });
    }
    tx.update(account, { fcmTokens: [...new Set([...tokens, token])] });
    tx.set(ref, { uid, role, channel });
    return channel as string;
  });
}

export async function removeNotificationDevice(db: Firestore, uid: string, token: string) {
  const user = db.collection('users').doc(uid), ref = bindingRef(db, token);
  await db.runTransaction(async tx => {
    const [profile, binding] = await Promise.all([tx.get(user), tx.get(ref)]);
    const list: unknown = profile.get('fcmTokens');
    if (Array.isArray(list) && list.includes(token)) tx.update(user, { fcmTokens: list.filter(value => value !== token) });
    if (binding.get('uid') === uid) tx.delete(ref);
  });
}

export function enqueueNotification(db: Firestore, tx: Transaction, uid: string, id: string,
  type: string, resourceId: string, role?: Role) {
  const ref = db.collection('users').doc(documentId(uid)).collection('notifications').doc(documentId(id));
  const audience = role ?? eventAudience(type);
  tx.create(ref, { type, resourceId, ...(audience ? { audience } : {}), read: false, createdAt: new Date(), pushStatus: 'QUEUED' });
  enqueueEmail(db, tx, uid, id, type);
}

// A lease prevents simultaneous sends. A process failure after FCM acceptance can result
// in a repeated push after lease expiry; the durable inbox item remains unique.
export async function deliverNotification(db: Firestore, uid: string, id: string) {
  const user = db.collection('users').doc(documentId(uid));
  const ref = user.collection('notifications').doc(documentId(id));
  const lease = randomUUID();
  const messages = await db.runTransaction(async tx => {
    const item = await tx.get(ref);
    const account = await tx.get(user);
    if (!item.exists || account.get('status') !== 'ACTIVE' ||
        ['SENT', 'EXHAUSTED'].includes(item.get('pushStatus')) || item.get('leaseUntil') > Date.now()) return [];
    const kind: string = item.get('type') ?? '';
    const preference = kind.startsWith('BOOKING_') ? 'bookingUpdates' : kind.startsWith('TRIP_') ? 'tripStatus' :
      kind.startsWith('SOS_') ? 'safetyAlerts' : kind.startsWith('SERVICE_') ? 'serviceMessages' : null;
    if (preference && account.get('notifications.' + preference) === false) {
      tx.update(ref, { pushStatus: 'IN_APP_ONLY', leaseUntil: 0 });
      return [];
    }
    if ((item.get('attempts') ?? 0) >= 10) {
      tx.update(ref, { pushStatus: 'EXHAUSTED', leaseUntil: 0 });
      return [];
    }
    const configured: unknown = account.get('fcmTokens');
    const list = Array.isArray(configured) ? [...new Set(configured.filter((v): v is string => typeof v === 'string' && !!v))].slice(0, 20) : [];
    const role = notificationAudience(item, notificationRole(account));
    const bindings = await Promise.all(list.map(token => tx.get(bindingRef(db, token))));
    const deliverable = list.flatMap((token, index) => {
      const binding = bindings[index]!;
      return binding.get('uid') === uid && binding.get('role') === role && typeof binding.get('channel') === 'string'
        ? [{ token, data: { audience: role, channel: binding.get('channel') as string } }] : [];
    });
    if (!deliverable.length) {
      tx.update(ref, { pushStatus: 'IN_APP_ONLY' });
      return [];
    }
    tx.update(ref, { lease, leaseUntil: Date.now() + 60_000, pushStatus: 'SENDING', attempts: (item.get('attempts') ?? 0) + 1 });
    return deliverable;
  });
  if (!messages.length) return;
  const tokens = messages.map(message => message.token);
  let failed: string[] = tokens;
  let invalid: string[] = [];
  try {
    const result = await getMessaging(getFirebaseAdminApp()).sendEach(messages);
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
