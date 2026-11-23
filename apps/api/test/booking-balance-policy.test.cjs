const assert = require('node:assert/strict');
const { test } = require('node:test');
const { hasBookingBlockingBalance } = require('../dist/modules/payments/booking-balance-policy.js');

const settled = { confirmedUnpaidAmount: 0, isUnderActiveDispute: false };
const disputed = { confirmedUnpaidAmount: 150, isUnderActiveDispute: true };
const payable = { confirmedUnpaidAmount: 50, isUnderActiveDispute: false };

test('allows empty, settled and actively disputed balances', () => {
  assert.equal(hasBookingBlockingBalance([]), false);
  assert.equal(hasBookingBlockingBalance([settled, disputed]), false);
});

test('blocks a remaining confirmed amount despite an unrelated dispute', () => {
  assert.equal(hasBookingBlockingBalance([disputed, payable]), true);
});

test('rejects invalid server ledger facts rather than approving a booking', () => {
  assert.throws(() => hasBookingBlockingBalance([{ ...settled, confirmedUnpaidAmount: NaN }]), RangeError);
  assert.throws(() => hasBookingBlockingBalance([{ ...settled, confirmedUnpaidAmount: -1 }]), RangeError);
  assert.throws(() => hasBookingBlockingBalance([{ ...payable, isUnderActiveDispute: 'true' }]), RangeError);
});
