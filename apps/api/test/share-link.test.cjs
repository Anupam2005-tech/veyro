const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  createShareLink,
  isShareLinkActive,
  verifyShareToken,
  revokeShareLink,
} = require('../dist/modules/share-links/share-link.service.js');

const now = new Date('2026-11-22T10:00:00Z');

test('creates a random token but stores only its hash', () => {
  const a = createShareLink('trip_1', 'cust_1', now, 'share_1');
  const b = createShareLink('trip_1', 'cust_1', now, 'share_2');
  assert.notEqual(a.token, b.token);
  assert.equal(a.record.tokenHash.length, 64);
  assert.ok(verifyShareToken(a.token, a.record.tokenHash));
  assert.equal(verifyShareToken(b.token, a.record.tokenHash), false);
  assert.equal(verifyShareToken('', a.record.tokenHash), false);
});

test('expires on revoke, timeout, or trip completion', () => {
  const { record } = createShareLink('trip_1', 'cust_1', now, 'share_3');
  assert.equal(isShareLinkActive(record, { tripCompleted: false, now }), true);
  assert.equal(isShareLinkActive(record, { tripCompleted: true, now }), false);
  const revoked = revokeShareLink(record, now);
  assert.equal(isShareLinkActive(revoked, { tripCompleted: false, now }), false);
  const expired = { ...record, expiresAt: new Date(now.getTime() - 1) };
  assert.equal(isShareLinkActive(expired, { tripCompleted: false, now }), false);
  assert.throws(() => revokeShareLink(revoked, now), /already revoked/);
});
