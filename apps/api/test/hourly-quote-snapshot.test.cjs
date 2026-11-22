const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHourlyQuoteSnapshot } = require('../dist/modules/quotes/hourly-quote-snapshot.js');

const input = {
  hourlyRateInr: 300,
  estimatedRouteKm: 5,
  estimatedRouteMinutes: 20,
  waitingPolicyVersion: 'waiting-fixture',
  cancellationPolicyVersion: 'cancellation-fixture',
  platformFeeConfigVersion: 'fee-fixture',
  quotedAt: new Date('2026-11-21T07:00:00Z'),
};

test('freezes confirmed quote inputs and stores unrounded estimated base fare', () => {
  const selected = { ...input, quotedAt: new Date(input.quotedAt), estimatedRouteMinutes: 1.5 };
  const snapshot = createHourlyQuoteSnapshot(selected);
  selected.hourlyRateInr = 500;
  selected.quotedAt.setUTCFullYear(2027);
  assert.ok(Object.isFrozen(snapshot));
  assert.deepEqual(snapshot, {
    ...input,
    pricing_mode: 'HOURLY',
    estimatedRouteMinutes: 1.5,
    estimatedBaseFareInr: 7.5,
    quotedAt: '2026-11-21T07:00:00.000Z',
  });
});

test('rejects missing policy versions, invalid distance and invalid timestamps', () => {
  assert.throws(() => createHourlyQuoteSnapshot({ ...input, waitingPolicyVersion: ' ' }), /versions/);
  assert.throws(() => createHourlyQuoteSnapshot({ ...input, estimatedRouteKm: NaN }), RangeError);
  assert.throws(() => createHourlyQuoteSnapshot({ ...input, quotedAt: new Date(NaN) }), RangeError);
});
