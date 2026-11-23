const assert = require('node:assert/strict');
const { test } = require('node:test');
const { cancellationFee, broadcastWindow, assertScheduledLeadTime, driverNoShowDeadline } = require('../dist/modules/bookings/booking.service.js');
const { confirmArrival, waitingCharge } = require('../dist/modules/trips/trip.service.js');
const { generateOtp, verifyOtp } = require('../dist/modules/trips/otp.service.js');
const { createPaymentOrder, applyWebhookEvent, mayCreateBooking } = require('../dist/modules/payments/payment.service.js');
const { submitReport, resolveReport, shouldSuspend, recordDemoSos } = require('../dist/modules/safety/safety.service.js');

test('scheduled broadcast window and lead time', () => {
  const now = new Date('2026-11-22T10:00:00Z');
  const pickup = new Date('2026-11-23T10:00:00Z');
  const w = broadcastWindow(pickup, now);
  assert.equal(w.start.toISOString(), '2026-11-22T22:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-23T08:00:00.000Z');
  const soon = new Date('2026-11-22T16:00:00Z');
  assert.equal(broadcastWindow(soon, now).start.toISOString(), now.toISOString());
  assert.throws(() => assertScheduledLeadTime(new Date('2026-11-22T12:00:00Z'), now), /4 hours/);
  assert.doesNotThrow(() => assertScheduledLeadTime(pickup, now));
});

test('DEC-05 cancellation fees and DEC-06 waiting charges', () => {
  const acceptedAt = new Date('2026-11-22T10:00:00Z');
  const at = (m) => new Date(acceptedAt.getTime() + m * 60_000);
  assert.equal(cancellationFee({ type: 'INSTANT', acceptedAt, arrivedAt: at(5) }, at(20)), 0);
  assert.equal(cancellationFee({ type: 'SCHEDULED', acceptedAt: null, arrivedAt: null }, at(1)), 0);
  assert.equal(cancellationFee({ type: 'SCHEDULED', acceptedAt, arrivedAt: null }, at(4)), 0);
  assert.equal(cancellationFee({ type: 'SCHEDULED', acceptedAt, arrivedAt: null }, at(6)), 50);
  assert.equal(cancellationFee({ type: 'SCHEDULED', acceptedAt, arrivedAt: at(30) }, at(31)), 100);
  assert.equal(cancellationFee({ type: 'SCHEDULED', acceptedAt, arrivedAt: null }, at(60), 'DRIVER_NO_SHOW'), 0);
  assert.equal(driverNoShowDeadline({ type: 'INSTANT', pickupAt: acceptedAt, promisedArrivalAt: at(10) }).toISOString(), at(30).toISOString());
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
