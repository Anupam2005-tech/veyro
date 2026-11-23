const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createBooking, acceptBooking, cancellationFee } = require('../dist/modules/bookings/booking.service.js');
const { confirmArrival, waitingCharge } = require('../dist/modules/trips/trip.service.js');
const { generateOtp, verifyOtp } = require('../dist/modules/trips/otp.service.js');
const { createPaymentOrder, applyWebhookEvent, mayCreateBooking } = require('../dist/modules/payments/payment.service.js');
const { submitReport, resolveReport, shouldSuspend, recordDemoSos } = require('../dist/modules/safety/safety.service.js');

test('instant booking accepts once before expiry', () => {
  const now = new Date('2026-11-22T10:00:00Z');
  const booking = createBooking({ id: 'b1', customerUid: 'c1', type: 'INSTANT', vehicleId: 'v1', pickupAt: now, now });
  const assigned = acceptBooking(booking, 'd1', now);
  assert.equal(assigned.status, 'ASSIGNED');
  assert.throws(() => acceptBooking(assigned, 'd2', now), /offered/);
});

test('scheduled cancellation slabs and waiting charges', () => {
  const pickup = new Date('2026-11-22T14:00:00Z');
  assert.equal(cancellationFee({ type: 'SCHEDULED', pickupAt: pickup }, new Date('2026-11-22T10:00:00Z')), 0);
  assert.equal(cancellationFee({ type: 'SCHEDULED', pickupAt: pickup }, new Date('2026-11-22T13:00:00Z')), 50);
  assert.equal(waitingCharge(new Date('2026-11-22T10:00:00Z'), new Date('2026-11-22T10:20:00Z')).feeInr, 50);
  const trip = confirmArrival({ id: 't1', bookingId: 'b1', driverUid: 'd1', status: 'ARRIVING', waitStartedAt: null });
  assert.equal(trip.status, 'WAITING');
});

test('OTP single-use, payments idempotent, reports and SOS demo', () => {
  const { record } = generateOtp(new Date('2026-11-22T10:00:00Z'));
  assert.equal(verifyOtp(record, '0000', new Date('2026-11-22T10:01:00Z')).attempts, 1);
  const order = createPaymentOrder('o1', 't1', 100);
  const first = applyWebhookEvent(order, 'e1', new Set(), true);
  assert.equal(first.order.status, 'PAID');
  assert.equal(applyWebhookEvent(first.order, 'e1', new Set(['e1']), true).duplicate, true);
  assert.equal(mayCreateBooking(10), false);
  const report = submitReport('r1', 'u1', 't1', 'SAFETY', 'details');
  assert.equal(resolveReport(report, 'reviewed').status, 'RESOLVED');
  assert.equal(shouldSuspend(5), true);
  assert.ok(recordDemoSos('s1', 't1').id);
});
