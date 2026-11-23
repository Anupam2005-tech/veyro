if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { AdminService } = require('../dist/modules/admin/admin-service.js');
const { grantProductRole } = require('../dist/modules/auth/identity-management.js');
const { BookingCore } = require('../dist/modules/bookings/booking-core.js');
const { bookingChecks } = require('../dist/modules/bookings/booking-checks.js');
const { storeBookingQuote } = require('../dist/modules/quotes/quote-repository.js');

test('Admin decisions and lead role grants enforce ownership, authorization and atomic audits', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), adminId = randomUUID(), target = randomUUID();
  await db.collection('users').doc(adminId).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  await db.collection('users').doc(target).set({ role: 'CUSTOMER', status: 'SUSPENDED' });
  const service = new AdminService(db), request = randomUUID();
  await assert.rejects(service.change(target, target, 'CUSTOMER', 'RESTORE', 'reason', request), { code: 'PROFILE_UNAVAILABLE' });
  await Promise.all([service.change(adminId, target, 'CUSTOMER', 'RESTORE', 'reason', request),
    service.change(adminId, target, 'CUSTOMER', 'RESTORE', 'reason', request)]);
  assert.equal((await db.collection('users').doc(target).get()).get('status'), 'ACTIVE');
  assert.equal((await db.collection('adminAuditLogs').doc('control-' + request).get()).get('after'), 'ACTIVE');
  process.env.ADMIN_GRANTER_UID = adminId;
  await assert.rejects(grantProductRole(db, target, target, 'ADMIN', 'reason', randomUUID()), { code: 'LEAD_REQUIRED' });
  const key = randomUUID();
  await grantProductRole(db, adminId, target, 'DRIVER', 'reason', key);
  await grantProductRole(db, adminId, target, 'DRIVER', 'reason', key);
  assert.deepEqual((await db.collection('users').doc(target).get()).get('roles'), ['CUSTOMER', 'DRIVER']);
});

test('production booking adapter fails closed and uses the eligible driver rate at atomic assignment', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp());
  const customer = randomUUID(), driver = randomUUID(), vehicle = randomUUID(), route = randomUUID();
  const at = Date.now();
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('vehicles').doc(vehicle).set({ customerId: customer, category: 'TEST_APPROVED_CATEGORY', transmission: 'TEST_TRANSMISSION' });
  await db.collection('routeQuotes').doc(route).set({ verified: true, customerId: customer, vehicleId: vehicle, expiresAt: at + 600000 });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED', hourlyRateInr: 120 });
  const quote = await storeBookingQuote(db, { customerId: customer, vehicleId: vehicle, routeId: route, selectedDriverId: driver }, {
    hourlyRateInr: 150, estimatedRouteKm: 5, estimatedRouteMinutes: 30, quotedAt: new Date(),
    waitingPolicyVersion: 'waiting-v1', cancellationPolicyVersion: 'cancel-v1', platformFeeConfigVersion: 'zero-v1',
  });
  const core = new BookingCore(db, bookingChecks(db, () => at), () => at);
  await assert.rejects(core.create(customer, quote), { code: 'BOOKING_INPUT_UNAVAILABLE' });
  await db.collection('driverAvailability').doc(driver).set({ online: true, updatedAt: at });
  await db.collection('driverEligibility').doc(driver).collection('vehicles').doc(vehicle).set({
    eligible: true, routeId: route, vehicleCategory: 'TEST_APPROVED_CATEGORY', transmission: 'TEST_TRANSMISSION',
    expiresAt: at + 600000, pickupDistanceKm: 4, pickupEtaMinutes: 10,
  });
  await core.create(customer, quote);
  await core.accept(quote, driver);
  assert.equal((await db.collection('bookings').doc(quote).get()).get('fare.hourlyRateInr'), 120);
  assert.equal((await db.collection('users').doc(driver).collection('notifications').doc('offer-' + quote).get()).exists, true);
});

test('application decisions synchronize driver eligibility and replay exactly one audit', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), admin = randomUUID(), driver = randomUUID(), app = randomUUID();
  await db.collection('users').doc(admin).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'PENDING_REVIEW' });
  await db.collection('driverApplications').doc(app).set({ status: 'PENDING_REVIEW', driverId: driver });
  const service = new AdminService(db);
  const key = randomUUID();
  await service.change(admin, app, 'APPLICATION', 'APPROVE', 'Manual documents reviewed', key);
  await service.change(admin, app, 'APPLICATION', 'APPROVE', 'Manual documents reviewed', key);
  assert.equal((await db.collection('drivers').doc(driver).get()).get('approvalStatus'), 'APPROVED');
  await service.change(admin, driver, 'DRIVER', 'DEACTIVATE', 'Reviewed safety action', randomUUID());
  assert.equal((await db.collection('driverAvailability').doc(driver).get()).get('online'), false);
  await service.change(admin, driver, 'DRIVER', 'RESTORE', 'Eligibility restored', randomUUID());
  assert.equal((await db.collection('drivers').doc(driver).get()).get('approvalStatus'), 'APPROVED');
});

test('booking expiry worker processes due offers once', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const { expireBookings } = require('../dist/modules/bookings/booking-workers.js');
  const db = getFirestore(getFirebaseAdminApp()), id = randomUUID(), driver = randomUUID(), customer = randomUUID();
  const ref = db.collection('bookings').doc(id);
  await ref.set({ status: 'SEARCHING', kind: 'INSTANT', customerId: customer, selectedDriverId: driver, closesAt: Date.now() - 1 });
  await ref.collection('offers').doc(driver).set({ status: 'OPEN' });
  await expireBookings(db);
  await expireBookings(db);
  assert.equal((await ref.get()).get('status'), 'EXPIRED');
  assert.equal((await ref.collection('events').get()).size, 1);
  assert.equal((await db.collection('users').doc(customer).collection('notifications')
    .doc('booking-' + id + '-EXPIRED').get()).get('type'), 'BOOKING_EXPIRED');
});

test('broadcast worker addresses only eligible scheduled offers and does not duplicate the inbox', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const { broadcastBookings } = require('../dist/modules/bookings/booking-workers.js');
  const db = getFirestore(getFirebaseAdminApp());
  const now = Date.now(), customer = randomUUID(), driver = randomUUID(), vehicle = randomUUID(), route = randomUUID();
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED', hourlyRateInr: 100 });
  await db.collection('vehicles').doc(vehicle).set({ customerId: customer, category: 'TEST_CATEGORY', transmission: 'TEST_TRANSMISSION' });
  await db.collection('routeQuotes').doc(route).set({ customerId: customer, vehicleId: vehicle, verified: true, expiresAt: now + 600000 });
  await db.collection('driverAvailability').doc(driver).set({ online: true, updatedAt: now });
  await db.collection('driverEligibility').doc(driver).collection('vehicles').doc(vehicle).set({
    eligible: true, routeId: route, vehicleCategory: 'TEST_CATEGORY', transmission: 'TEST_TRANSMISSION',
    expiresAt: now + 600000, pickupDistanceKm: 2,
  });
  const quoteId = await storeBookingQuote(db, { customerId: customer, vehicleId: vehicle, routeId: route, selectedDriverId: null },
    { hourlyRateInr: 200, estimatedRouteKm: 5, estimatedRouteMinutes: 10,
      waitingPolicyVersion: 'test', cancellationPolicyVersion: 'test', platformFeeConfigVersion: 'test' });
  const core = new BookingCore(db, bookingChecks(db));
  await core.create(customer, quoteId, Date.now() + 5 * 60 * 60000);
  await broadcastBookings(db);
  await broadcastBookings(db);
  assert.equal((await db.collection('bookings').doc(quoteId).collection('offers').doc(driver).get()).get('status'), 'OPEN');
  assert.equal((await db.collection('users').doc(driver).collection('notifications').doc('offer-' + quoteId).get()).exists, true);
});
