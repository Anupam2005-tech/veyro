if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { TripService } = require('../dist/modules/trips/trip-service.js');
const { LedgerService } = require('../dist/modules/ledger/ledger.js');

test('trip OTP transitions persist failed attempts, enforce ownership and generate one payable on completion', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(127\.0\.0\.1|localhost):\d+$/);
  process.env.TRIP_OTP_SECRET = 'test-only-key-with-at-least-32-bytes';
  const db = getFirestore(getFirebaseAdminApp());
  let at = Date.now();
  const trip = new TripService(db, () => at);
  const id = randomUUID(), customer = randomUUID(), driver = randomUUID();
  for (const [uid, role] of [[customer, 'CUSTOMER'], [driver, 'DRIVER']]) {
    await db.collection('users').doc(uid).set({ status: 'ACTIVE', roles: [role] });
  }
  await db.collection('bookings').doc(id).set({ status: 'ASSIGNED', customerId: customer, driverId: driver,
    pickupAt: at, fare: { pricing_mode: 'HOURLY', hourlyRateInr: 600 } });
  await trip.initialize(id, customer);
  await assert.rejects(trip.arrive(id, driver), { code: 'ARRIVAL_UNVERIFIED' });
  await trip.arrive(id, customer, true);
  const code = await trip.issueCode(id, customer, 'START');
  const stored = await db.collection('trips').doc(id).collection('verification').doc('START').get();
  assert.notEqual(stored.get('hash'), code);
  const wrong = code === '000000' ? '111111' : '000000';
  await assert.rejects(trip.verifyCode(id, driver, 'START', wrong), { code: 'OTP_INVALID' });
  assert.equal((await stored.ref.get()).get('attempts'), 1);
  at += 61_000;
  const replacement = await trip.issueCode(id, customer, 'START');
  await trip.verifyCode(id, driver, 'START', replacement);
  await assert.rejects(trip.verifyCode(id, driver, 'START', replacement), { code: 'TRIP_STATE_CONFLICT' });
  const end = await trip.issueCode(id, customer, 'END');
  assert.notEqual(end, replacement);
  at += 60_000;
  const outcomes = await Promise.allSettled([trip.verifyCode(id, driver, 'END', end), trip.verifyCode(id, driver, 'END', end)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal((await db.collection('trips').doc(id).get()).get('status'), 'COMPLETED');
  const payable = await db.collection('payables').doc(id).get();
  assert.equal(payable.get('amountPaise'), 1000);
  assert.equal((await db.collection('driverEarnings').doc(id).get()).get('netPaise'), 1000);
  const reportId = randomUUID();
  await db.collection('reports').doc(reportId).set({ reporterId: customer, tripId: id });
  // Dispute service uses real current time. Align the completed fixture for its public clock.
  await db.collection('trips').doc(id).update({ endedAt: Date.now() });
  await new LedgerService(db).dispute(customer, id, reportId);
  await new LedgerService(db).dispute(customer, id, reportId);
  assert.equal((await payable.ref.get()).get('isUnderActiveDispute'), true);
});

test('no-show at 30 minutes replaces waiting charges and is idempotent', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp());
  const now = Date.now(), id = randomUUID(), uid = randomUUID(), customer = randomUUID();
  await db.collection('users').doc(uid).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('trips').doc(id).set({ status: 'ARRIVED', customerId: customer, driverId: uid,
    arrivedAt: now, arrivalMethod: 'CUSTOMER_CONFIRMATION', waitingFeePaise: 5000 });
  const service = new TripService(db, () => now + 30 * 60_000);
  await Promise.all([service.customerNoShow(id, uid), service.customerNoShow(id, uid)]);
  assert.equal((await db.collection('payables').doc(id).get()).get('amountPaise'), 15000);
  assert.equal((await db.collection('trips').doc(id).get()).get('waitingFeePaise'), 0);
  assert.equal((await db.collection('driverEarnings').doc(id).get()).get('status'), 'ALLOCATION_PENDING');
});

test('OTP expiry and five wrong attempts cannot be bypassed by regeneration', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), id = randomUUID(), customer = randomUUID(), driver = randomUUID();
  process.env.TRIP_OTP_SECRET = 'test-only-key-with-at-least-32-bytes';
  let now = Date.now();
  for (const [uid, role] of [[customer, 'CUSTOMER'], [driver, 'DRIVER']]) {
    await db.collection('users').doc(uid).set({ roles: [role], status: 'ACTIVE' });
  }
  await db.collection('trips').doc(id).set({ status: 'ARRIVED', customerId: customer, driverId: driver, arrivedAt: now });
  const service = new TripService(db, () => now);
  const code = await service.issueCode(id, customer, 'START');
  const wrong = code === '000000' ? '111111' : '000000';
  await assert.rejects(service.issueCode(id, customer, 'START'), { code: 'OTP_COOLDOWN' });
  for (let i = 0; i < 5; i++) await assert.rejects(service.verifyCode(id, driver, 'START', wrong), { code: 'OTP_INVALID' });
  now += 61_000;
  await assert.rejects(service.issueCode(id, customer, 'START'), { code: 'OTP_LOCKED' });
  await assert.rejects(service.verifyCode(id, driver, 'START', code), { code: 'OTP_UNAVAILABLE' });
});

test('unpaid adjustments audit once, preserve amounts on retry and exclude captured payments', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), id = randomUUID(), admin = randomUUID(), customer = randomUUID();
  await db.collection('users').doc(admin).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  await db.collection('payables').doc(id).set({ customerId: customer, amountPaise: 10000, status: 'CONFIRMED' });
  await db.collection('driverEarnings').doc(id).set({ amountPaise: 10000, netPaise: 10000 });
  const service = new LedgerService(db), key = randomUUID();
  await service.adjust(admin, id, key, -1000, 'Approved correction');
  await service.adjust(admin, id, key, -1000, 'Approved correction');
  assert.equal((await db.collection('payables').doc(id).get()).get('amountPaise'), 9000);
  await db.collection('payables').doc(id).update({ status: 'CAPTURED' });
  await assert.rejects(service.adjust(admin, id, randomUUID(), -100, 'refund'), { code: 'ADJUSTMENT_UNAVAILABLE' });
});

test('waiting fee boundaries remain free through 15 minutes and cannot start at the 30-minute no-show threshold', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp());
  for (const [wait, expected] of [[15 * 60000, 0], [15 * 60000 + 1, 5000], [30 * 60000, null]]) {
    const id = randomUUID(), customer = randomUUID(), driver = randomUUID();
    let now = Date.now();
    const arrivedAt = now - wait;
    await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
    await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
    await db.collection('trips').doc(id).set({ status: 'ARRIVED', customerId: customer, driverId: driver, arrivedAt });
    const service = new TripService(db, () => now);
    const code = await service.issueCode(id, customer, 'START');
    if (expected === null) await assert.rejects(service.verifyCode(id, driver, 'START', code), { code: 'TRIP_STATE_CONFLICT' });
    else {
      await service.verifyCode(id, driver, 'START', code);
      assert.equal((await db.collection('trips').doc(id).get()).get('waitingFeePaise'), expected);
    }
  }
});
