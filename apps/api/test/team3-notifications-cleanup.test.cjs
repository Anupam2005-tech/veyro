const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  buildNotificationRecord,
  isValidFcmToken,
  decidePushDelivery,
} = require('../dist/modules/notifications/notification.service.js');
const {
  selectStaleRtdbNodes,
} = require('../dist/modules/trips/location-cleanup.service.js');

const now = new Date('2026-11-22T10:00:00Z');
const event = {
  eventId: 'evt_1',
  type: 'OFFER_RECEIVED',
  userId: 'drv_1',
  title: 'New instant offer',
  body: 'Pickup 1.2 km away',
};

test('deduplicates domain events and validates payload', () => {
  const first = buildNotificationRecord(event, new Set(), now);
  assert.ok(first && first.userId === 'drv_1');
  assert.equal(buildNotificationRecord(event, new Set(['evt_1']), now), null);
  assert.throws(
    () => buildNotificationRecord({ ...event, title: ' ' }, new Set(), now),
    /title/,
  );
});

test('validates FCM tokens and falls back to in-app without permission', () => {
  assert.equal(isValidFcmToken('x'.repeat(64)), true);
  assert.equal(isValidFcmToken('short'), false);
  assert.equal(decidePushDelivery('granted', true), 'QUEUED');
  assert.equal(decidePushDelivery('denied', true), 'SKIPPED_IN_APP');
  assert.equal(decidePushDelivery('granted', false), 'SKIPPED_IN_APP');
});

test('prunes ended trips and samples older than the max age', () => {
  const nodes = [
    { path: 'trips/a/location', tripId: 'a', tripEnded: true, lastUpdatedAt: now },
    { path: 'trips/b/location', tripId: 'b', tripEnded: false, lastUpdatedAt: new Date(now.getTime() - 120_000) },
    { path: 'trips/c/location', tripId: 'c', tripEnded: false, lastUpdatedAt: new Date(now.getTime() - 5_000) },
    { path: 'trips/d/location', tripId: 'd', tripEnded: false, lastUpdatedAt: null },
  ];
  assert.deepEqual(selectStaleRtdbNodes(nodes, now, 60_000), [
    'trips/a/location',
    'trips/b/location',
    'trips/d/location',
  ]);
});
