const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { BookingCore } = require('../dist/modules/bookings/booking-core.js');
const { storeBookingQuote } = require('../dist/modules/quotes/quote-repository.js');
const { scheduledWindow, cancellationFeeInr, minute } = require('../dist/modules/bookings/booking-policy.js');

test('scheduled window uses inclusive booking bounds and clips opening at creation', () => {
  const h = 60 * minute;
  for (const hours of [4, 8, 12, 24, 720]) {
    assert.deepEqual(scheduledWindow(0, h * hours), {
      opensAt: Math.max(0, (hours - 12) * h), closesAt: (hours - 2) * h,
    });
  }
  for (const pickup of [4 * h - 1, 720 * h + 1, NaN]) assert.throws(() => scheduledWindow(0, pickup));
});

test('DEC-05 calculates INR from actor, mode, acceptance and authoritative arrival/no-show facts', () => {
  const fee = (mode, role, accepted, now, arrived = false, verifiedDriverNoShow = false) =>
    cancellationFeeInr(mode, role, accepted, now, { arrived, verifiedDriverNoShow });
  assert.equal(fee('SCHEDULED', 'CUSTOMER', null, 9 * minute), 0);
  assert.equal(fee('SCHEDULED', 'CUSTOMER', 0, 5 * minute), 0);
  assert.equal(fee('SCHEDULED', 'CUSTOMER', 0, 5 * minute + 1), 50);
  assert.equal(fee('SCHEDULED', 'CUSTOMER', 0, minute, true), 100);
  assert.equal(fee('SCHEDULED', 'CUSTOMER', 0, 9 * minute, true, true), 0);
  assert.equal(fee('INSTANT', 'CUSTOMER', 0, 9 * minute, true), 0);
  assert.equal(fee('SCHEDULED', 'DRIVER', 0, 9 * minute, true), 0);
});

test('Firestore booking transactions enforce ownership, deadlines, reservations and immutable cancellation facts', {
  skip: process.env.FIRESTORE_EMULATOR_HOST ? false : 'Requires the Firestore emulator',
}, async t => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(localhost|127\.0\.0\.1):\d+$/);
  const app = initializeApp({ projectId: 'demo-veyro-audit' }, randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  let at = Date.now();
  const checks = {
    async verifyCreation(tx, q) {
      if (!(await tx.get(db.collection('testCustomers').doc(q.customerId))).get('eligible')) throw Error('ineligible');
    },
    async verifyAcceptance(tx, _booking, driverId) {
      if (!(await tx.get(db.collection('testDrivers').doc(driverId))).get('eligible')) throw Error('ineligible');
    },
    async cancellationFacts(_tx, _booking, version, _role, reason) {
      if (reason !== 'fixture' || version !== 'DEC-05') throw Error('unapproved policy or reason');
      return { arrived: false, verifiedDriverNoShow: false };
    },
  };
  const core = new BookingCore(db, checks, () => at);
  const customer = randomUUID();
  const drivers = [randomUUID(), randomUUID()];
  const quote = driver => storeBookingQuote(db, {
    customerId: customer, vehicleId: 'test-vehicle', routeId: 'test-route', selectedDriverId: driver,
  }, { hourlyRateInr: 120, estimatedRouteKm: 8, estimatedRouteMinutes: 30,
    waitingPolicyVersion: 'DEC-06', cancellationPolicyVersion: 'DEC-05', platformFeeConfigVersion: 'DEC-04' });
  const booking = id => db.collection('bookings').doc(id);
  const instant = await quote(drivers[0]);
  assert.equal((await db.collection('bookingQuotes').doc(instant).get()).get('fare.estimatedBaseFareInr'), 60);
  await assert.rejects(core.create('other', instant), { code: 'BOOKING_NOT_ACCESSIBLE' });
  await assert.rejects(core.create(customer, instant), /ineligible/);
  assert.equal((await booking(instant).get()).exists, false);
  await db.collection('testCustomers').doc(customer).set({ eligible: true });
  for (const id of drivers) await db.collection('testDrivers').doc(id).set({ eligible: true });
  await Promise.all([core.create(customer, instant), core.create(customer, instant)]);
  await assert.rejects(core.accept(instant, drivers[1]), { code: 'BOOKING_NOT_ACCESSIBLE' });
  const other = await quote(drivers[0]);
  await core.create(customer, other);
  const race = await Promise.allSettled([core.accept(instant, drivers[0]), core.accept(other, drivers[0])]);
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
  const [won, lost] = race[0].status === 'fulfilled' ? [instant, other] : [other, instant];
  await core.accept(won, drivers[0]);
  await assert.rejects(core.cancel(won, 'other', 'CUSTOMER', 'fixture'), { code: 'BOOKING_NOT_ACCESSIBLE' });
  assert.equal(await core.cancel(won, customer, 'CUSTOMER', 'fixture'), 0);
  assert.equal(await core.cancel(won, customer, 'CUSTOMER', 'fixture'), 0);
  assert.equal((await booking(won).collection('facts').get()).size, 1);
  const event = (await booking(won).collection('events').doc('ASSIGNED').get()).data();
  assert.equal(event.customerId, customer);
  assert.equal(event.driverId, drivers[0]);
  at += 5 * minute;
  await assert.rejects(core.accept(lost, drivers[0]), { code: 'BOOKING_CONFLICT' });
  assert.equal(await core.advance(lost), 'EXPIRED');
  assert.equal(await core.advance(lost), 'EXPIRED');

  const declined = await quote(drivers[0]);
  await core.create(customer, declined);
  await core.rejectInstant(declined, drivers[0]);
  await core.rejectInstant(declined, drivers[0]);
  assert.equal((await booking(declined).collection('offers').doc(drivers[0]).get()).get('status'), 'REJECTED');

  const scheduled = await quote(null);
  const pickup = at + 24 * 60 * minute;
  await core.create(customer, scheduled, pickup);
  assert.equal(await core.advance(scheduled), 'SCHEDULED_QUEUED');
  at = pickup - 12 * 60 * minute;
  assert.equal(await core.advance(scheduled), 'SCHEDULED_BROADCASTING');
  await assert.rejects(core.accept(scheduled, drivers[0]), { code: 'BOOKING_NOT_ACCESSIBLE' });
  for (const driver of drivers) await core.offerScheduled(scheduled, driver);
  const acceptances = await Promise.allSettled(drivers.map(driver => core.accept(scheduled, driver)));
  assert.equal(acceptances.filter(r => r.status === 'fulfilled').length, 1);
  const assigned = (await booking(scheduled).get()).data();
  assert.equal(assigned.driverId, drivers[acceptances.findIndex(r => r.status === 'fulfilled')]);
  const overlap = await quote(null);
  await core.create(customer, overlap, pickup + 5 * minute);
  at += 5 * minute;
  await core.advance(overlap);
  await core.offerScheduled(overlap, assigned.driverId);
  await assert.rejects(core.accept(overlap, assigned.driverId), { code: 'BOOKING_CONFLICT' });
  at += 1;
  await assert.rejects(core.cancel(scheduled, customer, 'CUSTOMER', 'unknown'), /unapproved/);
  assert.equal(await core.cancel(scheduled, customer, 'CUSTOMER', 'fixture', 'test description'), 50);
  const fact = (await booking(scheduled).collection('facts').doc('cancellation').get()).data();
  assert.equal(fact.at, at);
  assert.equal(fact.policyVersion, 'DEC-05');
  assert.equal(fact.description, 'test description');
  await core.accept(overlap, assigned.driverId);
  const shortLead = await quote(null);
  await core.create(customer, shortLead, at + 4 * 60 * minute);
  assert.equal((await booking(shortLead).get()).get('status'), 'SCHEDULED_BROADCASTING');
  at += 2 * 60 * minute;
  await assert.rejects(core.offerScheduled(shortLead, drivers[0]), { code: 'BOOKING_CONFLICT' });
  assert.equal(await core.advance(shortLead), 'NEEDS_REBOOK');
  assert.equal(await core.advance(shortLead), 'NEEDS_REBOOK');
  assert.equal((await booking(shortLead).collection('events').get()).size, 2);
});
