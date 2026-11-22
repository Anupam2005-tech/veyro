const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isCompletedTripDisputeTimely } = require('../dist/modules/payments/completed-trip-dispute-window.js');

const completedAt = new Date('2026-11-18T07:00:00Z');

test('accepts the exact 48-hour boundary and rejects a later submission', () => {
  const deadline = new Date('2026-11-20T07:00:00Z');
  assert.equal(isCompletedTripDisputeTimely(completedAt, completedAt), true);
  assert.equal(isCompletedTripDisputeTimely(completedAt, deadline), true);
  assert.equal(isCompletedTripDisputeTimely(completedAt, new Date(deadline.getTime() + 1)), false);
});

test('rejects invalid timestamps and submissions before completion', () => {
  assert.throws(() => isCompletedTripDisputeTimely(completedAt, new Date(NaN)), RangeError);
  assert.throws(() => isCompletedTripDisputeTimely(completedAt, new Date(completedAt.getTime() - 1)), RangeError);
});
