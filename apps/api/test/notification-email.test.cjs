if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, createHash } = require('node:crypto');
const { getAuth } = require('firebase-admin/auth');
const { getFirebaseAdminApp, getFirestore } = require('../dist/config/firebase-admin.js');
const { enqueueNotification, deliverNotificationEmail } = require('../dist/modules/notifications/notifications.js');

test('email outbox verifies recipients and retries an event with the same payload and key', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async t => {
  const app = getFirebaseAdminApp(), db = getFirestore(app), uid = randomUUID();
  const profile = db.collection('users').doc(uid);
  await profile.set({ status: 'ACTIVE' });
  process.env.RESEND_API_KEY = 'fixture';
  process.env.RESEND_FROM_EMAIL = 'Veyro <notice@example.test>';
  let emailVerified = true;
  t.mock.method(getAuth(app), 'getUser', async () => ({ email: 'fixture@example.test', emailVerified, disabled: false }));
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    calls.push(options);
    return Response.json({}, { status: calls.length === 1 ? 429 : 200 });
  });
  async function enqueue(eventId, type) {
    await db.runTransaction(async tx => enqueueNotification(db, tx, uid, eventId, type, 'private-trip-id'));
    return db.collection('notificationEmails').doc(createHash('sha256').update(JSON.stringify([uid, eventId])).digest('hex'));
  }
  const outbox = await enqueue('fixture-event', 'TRIP_COMPLETED');
  await Promise.all([deliverNotificationEmail(db, outbox.id), deliverNotificationEmail(db, outbox.id)]);
  assert.equal(calls.length, 1);
  assert.equal((await outbox.get()).get('status'), 'RETRY');
  assert.doesNotMatch(calls[0].body, /private-trip-id/);
  await outbox.update({ nextAttemptAt: 0 });
  await deliverNotificationEmail(db, outbox.id);
  assert.equal((await outbox.get()).get('status'), 'ACCEPTED');
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.equal(calls[0].body, calls[1].body);
  await deliverNotificationEmail(db, outbox.id);
  await profile.update({ notifications: { bookingUpdates: false } });
  const optedOut = await enqueue('opted-out', 'BOOKING_ASSIGNED');
  await deliverNotificationEmail(db, optedOut.id);
  assert.equal((await optedOut.get()).get('status'), 'SKIPPED');
  emailVerified = false;
  const unverified = await enqueue('unverified', 'ACCOUNT_SIGNED_IN');
  await deliverNotificationEmail(db, unverified.id);
  assert.equal((await unverified.get()).get('status'), 'SKIPPED');
  assert.equal(calls.length, 2);
  assert.equal((await profile.collection('notifications').get()).size, 3);
});
