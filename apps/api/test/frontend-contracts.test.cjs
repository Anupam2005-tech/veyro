if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getAppCheck } = require('firebase-admin/app-check');
if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'demo-veyro-audit', storageBucket: 'demo-veyro-audit.appspot.com' });
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { createApp } = require('../dist/app.js');
const { ProfileService } = require('../dist/modules/profiles/profile-service.js');
const { SafetyService } = require('../dist/modules/safety/safety-service.js');
const { BookingCore } = require('../dist/modules/bookings/booking-core.js');
const { MobilityService } = require('../dist/modules/mobility/mobility-service.js');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
async function serverFixture(t) {
  const app = getFirebaseAdminApp(), db = getFirestore(app);
  t.mock.method(getAuth(app), 'verifyIdToken', async token => ({ uid: token }));
  t.mock.method(getAppCheck(app), 'verifyToken', async () => ({ alreadyConsumed: false }));
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const request = (uid, path, method = 'GET', body, headers = {}) => fetch(base + path, { method,
    headers: { Authorization: 'Bearer ' + uid, 'X-Firebase-AppCheck': 'fixture', 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { db, request, base };
}
const vehicleInput = { make: 'Test', model: 'Car', category: 'SEDAN', transmission: 'MANUAL', fuelType: 'PETROL', registrationNumber: 'TEST123' };

test('trip chat and voice signaling are private, retry safe, and end with the active trip', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const [id, customer, driver, foreign] = Array.from({ length: 4 }, () => randomUUID());
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('users').doc(foreign).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  const trip = db.collection('trips').doc(id);
  const path = '/trips/' + id + '/contact';
  const post = (uid, body) => request(uid, path, 'POST', body);
  await trip.set({ customerId: customer, driverId: driver, status: 'ARRIVED' });
  assert.equal((await request(foreign, path)).status, 404);
  const message = { action: 'message', id: randomUUID(), text: 'I am at the pickup point.' };
  for (const response of await Promise.all([post(customer, message), post(customer, message)])) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.messages.length, 1);
  }
  const read = await request(driver, path);
  assert.match(read.headers.get('cache-control'), /no-store/);
  assert.equal((await read.json()).data.messages[0].text, message.text);
  const offer = { action: 'offer', id: randomUUID(), sdp: 'v=0\r\nfixture offer' };
  const answer = { ...offer, action: 'answer', sdp: 'v=0\r\nfixture answer' };
  assert.equal((await post(customer, offer)).status, 200);
  assert.equal((await post(driver, { ...offer, id: randomUUID() })).status, 409);
  assert.equal((await post(customer, answer)).status, 409);
  assert.equal((await post(driver, answer)).status, 200);
  assert.equal((await (await request(customer, path)).json()).data.call.answer, answer.sdp);
  assert.equal((await (await post(driver, { action: 'end', id: offer.id })).json()).data.call, null);
  await trip.update({ status: 'COMPLETED' });
  assert.equal((await request(customer, path)).status, 404);
  assert.equal((await post(driver, message)).status, 404);
});

test('an overdue customer report requires Admin confirmation before ending the trip or counting an incident', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const [id, customer, driver, admin] = Array.from({ length: 4 }, () => randomUUID());
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  const driverAccount = db.collection('users').doc(driver);
  await driverAccount.set({ roles: ['CUSTOMER', 'DRIVER'], status: 'ACTIVE', verifiedNoShowCount: 4 });
  await db.collection('users').doc(admin).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  const trip = db.collection('trips').doc(id);
  const now = Date.now();
  await trip.set({ status: 'DRIVER_EN_ROUTE', customerId: customer, driverId: driver, promisedArrivalAt: now,
    pickupEta: { requestedAt: now, arrivalAt: now + 5 * 60_000 } });
  await db.collection('bookings').doc(id).set({ customerId: customer, driverId: driver, routeId: id, vehicleId: id });
  const location = db.collection('liveLocations').doc(id);
  await location.set({ observedAt: now, lat: 22, lng: 72 });
  const view = async () => (await (await request(customer, '/views/trips/' + id)).json()).data;
  assert.equal((await view()).driverEtaMinutes, 5);
  assert.equal((await view()).driverNoShowEligible, false);
  await location.update({ observedAt: now - 31_000 });
  assert.equal((await view()).driverEtaMinutes, null);
  const submit = (uid) => request(uid, '/trips/' + id + '/driver-no-show', 'POST', { description: 'Driver did not reach pickup.' });
  assert.equal((await submit(customer)).status, 409);
  await trip.update({ promisedArrivalAt: now - 21 * 60_000 });
  assert.equal((await submit(driver)).status, 404);
  const [response, retry] = await Promise.all([submit(customer), submit(customer)]);
  assert.equal(response.status, 200);
  const { id: reportId } = (await response.json()).data;
  assert.equal((await retry.json()).data.id, reportId);
  assert.equal((await trip.get()).get('status'), 'DRIVER_EN_ROUTE');
  const incident = db.collection('verifiedIncidents').doc('driver-no-show-' + id);
  assert.equal((await incident.get()).exists, false);
  const review = (uid) => request(uid, '/admin/reports/' + reportId + '/resolve', 'POST',
    { status: 'RESOLVED', note: 'Confirmed missed pickup after reviewing the trip.' });
  assert.equal((await review(customer)).status, 403);
  assert.equal((await review(admin)).status, 200);
  assert.equal((await review(admin)).status, 200);
  assert.equal((await trip.get()).get('status'), 'DRIVER_NO_SHOW');
  assert.equal((await db.collection('payables').doc(id).get()).exists, false);
  assert.equal((await location.get()).exists, false);
  assert.equal((await db.collection('driverNoShowEvidence').doc(id).get()).get('verifiedBy'), admin);
  await new SafetyService(db).applyIncident(incident.id);
  assert.equal((await driverAccount.get()).get('verifiedNoShowCount'), 5);
  assert.equal((await driverAccount.get()).get('status'), 'SUSPENDED');
});

test('only the booking customer can request trip codes and only the assigned driver can use them', { skip: !enabled }, async t => {
  const { db, request, base } = await serverFixture(t);
  process.env.TRIP_OTP_SECRET = 'test-only-key-with-at-least-32-bytes';
  const [customer, driver, stranger, id] = Array.from({ length: 4 }, () => randomUUID());
  for (const uid of [customer, driver, stranger]) {
    await db.collection('users').doc(uid).set({ roles: ['CUSTOMER', 'DRIVER'], status: 'ACTIVE' });
  }
  const trip = db.collection('trips').doc(id);
  const fare = { pricing_mode: 'HOURLY', hourlyRateInr: 600 };
  await db.collection('bookings').doc(id).set({ customerId: customer, driverId: driver, vehicleId: id, routeId: id, fare });
  await trip.set({ customerId: customer, driverId: driver, status: 'DRIVER_EN_ROUTE', fare });
  const path = '/trips/' + id;
  const issue = (uid, phase) => request(uid, path + '/verification-code', 'POST', { phase });
  assert.equal((await fetch(base + path + '/verification-code', { method: 'POST' })).status, 401);
  assert.equal((await issue(customer, 'OTHER')).status, 400);
  assert.equal((await issue(customer, 'START')).status, 409);
  assert.equal((await request(customer, path + '/arrival/confirm', 'POST')).status, 200);
  assert.equal((await issue(driver, 'START')).status, 404);
  assert.equal((await issue(stranger, 'START')).status, 404);
  assert.equal((await issue(customer, 'END')).status, 409);
  const issued = await issue(customer, 'START');
  assert.equal(issued.status, 200);
  assert.match(issued.headers.get('cache-control'), /no-store/);
  const { code, expiresAt } = (await issued.json()).data;
  assert.match(code, /^\d{6}$/);
  assert.ok(expiresAt > Date.now());
  assert.equal((await issue(customer, 'START')).status, 429);
  const driverView = (await (await request(driver, '/views' + path)).json()).data;
  const customerView = (await (await request(customer, '/views' + path)).json()).data;
  assert.equal(driverView.canRequestOtp, false);
  assert.equal(customerView.canRequestOtp, true);
  assert.deepEqual(Object.keys(customerView.trip).sort(), ['id', 'customerId', 'driverId', 'status', 'arrivedAt', 'startedAt', 'endedAt', 'waitingFeePaise', 'amountPaise'].sort());
  assert.equal((await request(stranger, path + '/start', 'POST', { code })).status, 404);
  assert.equal((await request(driver, path + '/start', 'POST', { code })).status, 200);
  assert.equal((await issue(customer, 'START')).status, 409);
  const endIssued = await issue(customer, 'END');
  assert.equal(endIssued.status, 200);
  const endCode = (await endIssued.json()).data.code;
  assert.match(endCode, /^\d{6}$/);
  assert.notEqual(endCode, code);
  await trip.update({ startedAt: Date.now() - 60_000 });
  assert.equal((await request(customer, path + '/complete', 'POST', { code: endCode })).status, 404);
  assert.equal((await request(driver, path + '/complete', 'POST', { code: endCode })).status, 200);
  assert.equal((await request(driver, path + '/complete', 'POST', { code: endCode })).status, 409);
  assert.equal((await issue(customer, 'END')).status, 409);
  assert.equal((await trip.get()).get('status'), 'COMPLETED');
  assert.ok((await db.collection('payables').doc(id).get()).get('amountPaise') >= 1000);
});

test('driver fare is saved, customer visibility follows fresh presence, and renewal cannot reopen an offline shift', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const driver = randomUUID(), customer = randomUUID();
  const profile = { fullName: 'Fixture Driver', phone: '+919876543210', experienceYears: 4, languages: ['English'],
    categories: ['SEDAN'], transmissions: ['MANUAL'], serviceAreas: 'Fixture area', hourlyRateInr: 349 };
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ ...profile, approvalStatus: 'APPROVED' });
  const visible = async () => (await (await request(customer, '/drivers')).json()).data.drivers.find(row => row.id === driver);
  assert.equal(await visible(), undefined);
  const online = { online: true, position: { lat: 22, lng: 72 } };
  assert.equal((await request(driver, '/availability', 'POST', online)).status, 200);
  assert.equal((await request(driver, '/drivers/profile', 'POST', { ...profile, hourlyRateInr: 385.5 })).status, 200);
  assert.equal((await visible()).hourlyRateInr, 385.5);
  assert.equal((await db.collection('drivers').doc(driver).get()).get('approvalStatus'), 'APPROVED');
  await db.collection('driverAvailability').doc(driver).update({ updatedAt: Date.now() - 31_000 });
  assert.equal(await visible(), undefined);
  assert.equal((await request(driver, '/availability', 'POST', { ...online, renew: true })).status, 200);
  assert.ok(await visible());
  assert.equal((await request(driver, '/availability', 'POST', { online: false })).status, 200);
  assert.equal((await request(driver, '/availability', 'POST', { ...online, renew: true })).status, 409);
  assert.equal(await visible(), undefined);
  assert.equal((await request(driver, '/drivers/me/deletion-request', 'POST', {})).status, 200);
  assert.equal((await db.collection('accountDeletionRequests').doc(driver).get()).get('status'), 'POLICY_REVIEW_REQUIRED');
  assert.equal((await db.collection('users').doc(driver).get()).get('status'), 'ACTIVE');
});

test('inboxes and device push are isolated by owner and workspace', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const { getMessaging } = require('firebase-admin/messaging');
  const { enqueueNotification, deliverNotification } = require('../dist/modules/notifications/notifications.js');
  const account = randomUUID(), other = randomUUID(), token = randomUUID();
  const owner = db.collection('users').doc(account);
  await owner.set({ role: 'CUSTOMER', roles: ['CUSTOMER', 'DRIVER', 'ADMIN'], status: 'ACTIVE' });
  await db.collection('users').doc(other).set({ roles: ['CUSTOMER'], status: 'ACTIVE', fcmTokens: [token] });
  await db.runTransaction(async tx => {
    enqueueNotification(db, tx, account, 'customer-booking', 'BOOKING_ASSIGNED', 'booking');
    enqueueNotification(db, tx, account, 'driver-offer', 'BOOKING_OFFER', 'booking');
    enqueueNotification(db, tx, account, 'admin-sign-in', 'ACCOUNT_SIGNED_IN', account, 'ADMIN');
  });
  const inbox = async (uid, role) => (await (await request(uid, '/notifications?role=' + role)).json()).data.map(row => row.id);
  assert.deepEqual(await inbox(account, 'DRIVER'), ['driver-offer']);
  assert.deepEqual(await inbox(account, 'CUSTOMER'), ['customer-booking']);
  assert.deepEqual(await inbox(account, 'ADMIN'), ['admin-sign-in']);
  assert.deepEqual(await inbox(other, 'CUSTOMER'), []);
  assert.equal((await request(other, '/notifications?role=ADMIN')).status, 403);
  assert.equal((await request(account, '/notifications/driver-offer/read', 'POST', { role: 'CUSTOMER' })).status, 404);
  assert.equal((await request(account, '/notifications/driver-offer/read', 'POST', { role: 'DRIVER' })).status, 200);
  const register = async (uid, role) => (await (await request(uid, '/notifications/device', 'POST', { token, role })).json()).data.channel;
  const oldChannel = await register(other, 'CUSTOMER');
  const newChannel = await register(account, 'DRIVER');
  assert.notEqual(oldChannel, newChannel);
  assert.deepEqual((await db.collection('users').doc(other).get()).get('fcmTokens'), []);
  const sender = t.mock.method(getMessaging(getFirebaseAdminApp()), 'sendEach', async () => ({
    responses: [{ success: true }], successCount: 1, failureCount: 0,
  }));
  await deliverNotification(db, account, 'customer-booking');
  await deliverNotification(db, account, 'driver-offer');
  assert.equal(sender.mock.callCount(), 1);
  assert.deepEqual(sender.mock.calls[0].arguments[0], [{ token, data: { audience: 'DRIVER', channel: newChannel } }]);
});

test('approval unlocks availability and offers still load when the collection-group index is missing', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const driver = randomUUID(), other = randomUUID(), admin = randomUUID(), bookingId = randomUUID();
  for (const [uid, role] of [[driver, 'DRIVER'], [other, 'DRIVER'], [admin, 'ADMIN']]) {
    await db.collection('users').doc(uid).set({ status: 'ACTIVE', roles: [role], applicationStatus: 'PENDING_REVIEW' });
  }
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'PENDING_REVIEW', hourlyRateInr: 120 });
  await db.collection('drivers').doc(other).set({ approvalStatus: 'APPROVED' });
  await db.collection('driverApplications').doc(driver).set({ driverId: driver, status: 'PENDING_REVIEW' });
  const route = db.collection('routeQuotes').doc();
  const vehicle = db.collection('vehicles').doc();
  await route.set({ customerId: 'private-customer', pickup: { lat: 22, lng: 72 }, destination: { lat: 23, lng: 73 } });
  await vehicle.set({ ...vehicleInput, customerId: 'private-customer' });
  const closesAt = Date.now() + 60000;
  const booking = db.collection('bookings').doc(bookingId);
  await booking.set({ customerId: 'private-customer', status: 'SCHEDULED_BROADCASTING', kind: 'SCHEDULED',
    closesAt, routeId: route.id, vehicleId: vehicle.id, fare: { hourlyRateInr: 120 } });
  await booking.collection('offers').doc(driver).set({ status: 'OPEN', closesAt, driverId: driver });
  const incomplete = db.collection('bookings').doc();
  await incomplete.set({ status: 'SCHEDULED_BROADCASTING', closesAt });
  await incomplete.collection('offers').doc(driver).set({ status: 'OPEN', closesAt, driverId: driver });
  t.mock.method(db, 'collectionGroup', () => { throw Object.assign(new Error('The query requires a collection group index'), { code: 9 }); });
  assert.deepEqual((await (await request(driver, '/views/offers')).json()).data, []);
  const position = { online: true, position: { lat: 22, lng: 72 } };
  assert.equal((await request(driver, '/availability', 'POST', position)).status, 403);
  assert.equal((await request(admin, '/admin/driver-applications/' + driver + '/decision', 'POST',
    { action: 'APPROVE', reason: 'Reviewed' }, { 'Idempotency-Key': randomUUID() })).status, 200);
  assert.equal((await (await request(driver, '/driver-applications/me')).json()).data.status, 'APPROVED');
  assert.equal((await (await request(driver, '/views/driver-profile')).json()).data.driver.approvalStatus, 'APPROVED');
  assert.equal((await request(driver, '/availability', 'POST', position)).status, 200);
  const offers = await request(driver, '/views/offers');
  assert.equal(offers.status, 200);
  const data = (await offers.json()).data;
  assert.deepEqual(data.map(item => item.booking.id), [bookingId]);
  assert.doesNotMatch(JSON.stringify(data), /private-customer|TEST123/);
  assert.deepEqual((await (await request(other, '/views/offers')).json()).data, []);
});

test('customer profile and bulk vehicles preserve ownership, reservation locks and atomic validation', { skip: !enabled }, async () => {
  const db = getFirestore(getFirebaseAdminApp()), customer = randomUUID(), other = randomUUID(), own = randomUUID(), foreign = randomUUID(), booking = randomUUID();
  await db.collection('users').doc(customer).set({ status: 'ACTIVE', roles: ['CUSTOMER'], fullName: 'Original' });
  await db.collection('vehicles').doc(own).set({ ...vehicleInput, customerId: customer });
  await db.collection('vehicles').doc(foreign).set({ ...vehicleInput, customerId: other });
  const service = new ProfileService(db);
  await assert.rejects(service.updateCustomer(customer, { fullName: 'Forged', vehicles: [{ ...vehicleInput, id: foreign }] }), { code: 'VEHICLE_UNAVAILABLE' });
  assert.equal((await db.collection('users').doc(customer).get()).get('fullName'), 'Original');
  assert.equal((await db.collection('vehicles').doc(foreign).get()).get('customerId'), other);
  await db.collection('bookings').doc(booking).set({ vehicleId: own, status: 'ASSIGNED' });
  await db.collection('trips').doc(booking).set({ status: 'IN_PROGRESS' });
  await assert.rejects(service.updateCustomer(customer, { fullName: 'Changed', vehicles: [] }), { code: 'VEHICLE_RESERVED' });
  await assert.rejects(service.updateCustomer(customer, { vehicles: [{ ...vehicleInput, id: own, transmission: 'AUTOMATIC' }] }), { code: 'VEHICLE_RESERVED' });
  await service.updateCustomer(customer, { fullName: 'Valid', roles: ['ADMIN'], unpaidBalance: 0, vehicles: [{ ...vehicleInput, id: own }] });
  assert.deepEqual((await db.collection('users').doc(customer).get()).get('roles'), ['CUSTOMER']);
  assert.throws(() => service.updateCustomer(customer, { fullName: 'Invalid', emergencyContacts: [{ id: 'contact', name: 'X', relationship: 'Friend', phone: '123' }] }), { code: 'INVALID_CONTACTS' });
  assert.equal((await db.collection('users').doc(customer).get()).get('fullName'), 'Valid');
  await db.collection('trips').doc(booking).update({ status: 'COMPLETED' });
  await service.updateCustomer(customer, { vehicles: [{ ...vehicleInput, id: 'local-new-' + randomUUID() }] });
  const result = await db.collection('vehicles').where('customerId', '==', customer).get();
  assert.equal(result.size, 1); assert.notEqual(result.docs[0].id, own); assert.match(result.docs[0].id, /^[a-f0-9-]{36}$/);
});

test('screen reads require active ownership and exclude OTP/private document fields', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t);
  const customer = randomUUID(), driver = randomUUID(), outsider = randomUUID(), id = randomUUID(), route = randomUUID(), vehicle = randomUUID();
  for (const [uid, role] of [[customer, 'CUSTOMER'], [driver, 'DRIVER'], [outsider, 'CUSTOMER']]) await db.collection('users').doc(uid).set({ roles: [role], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ fullName: 'Assigned Driver', hourlyRateInr: 120, phone: 'PRIVATE_PHONE', documents: ['PRIVATE_DOCUMENT'] });
  await db.collection('vehicles').doc(vehicle).set({ ...vehicleInput, customerId: customer });
  await db.collection('routeQuotes').doc(route).set({ pickup: { lat: 22, lng: 72 }, destination: { lat: 23, lng: 73 }, distanceKm: 8, durationMinutes: 30 });
  await db.collection('bookings').doc(id).set({ customerId: customer, driverId: driver, vehicleId: vehicle, routeId: route, status: 'ASSIGNED', kind: 'INSTANT' });
  await db.collection('trips').doc(id).set({ customerId: customer, driverId: driver, status: 'IN_PROGRESS', startOtp: 'SECRET_CODE', otpHash: 'SECRET_HASH' });
  await db.collection('payables').doc(id).set({ amountPaise: 10000, status: 'CONFIRMED', disputeResolution: 'PRIVATE_REVIEW_NOTE', linkedReportId: 'PRIVATE_REPORT_ID' });
  assert.equal((await request(outsider, '/views/trips/' + id)).status, 404);
  assert.equal((await request(randomUUID(), '/views/bookings')).status, 403);
  assert.equal((await request(customer, '/views/admin/overview')).status, 403);
  const own = await request(customer, '/views/trips/' + id); assert.equal(own.status, 200);
  const text = await own.text();
  for (const secret of ['PRIVATE_PHONE', 'PRIVATE_DOCUMENT', 'SECRET_CODE', 'SECRET_HASH', 'PRIVATE_REVIEW_NOTE', 'PRIVATE_REPORT_ID']) assert.equal(text.includes(secret), false);
  const list = await (await request(outsider, '/views/bookings')).json(); assert.equal(list.data.length, 0);
  assert.equal((await request(driver, '/views/trips/' + id)).status, 200);
});

test('rating and favourite operations authorize customer ownership and make retries safe', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t), customer = randomUUID(), other = randomUUID(), driver = randomUUID(), trip = randomUUID();
  for (const uid of [customer, other]) await db.collection('users').doc(uid).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED' });
  await db.collection('trips').doc(trip).set({ customerId: customer, driverId: driver, status: 'COMPLETED' });
  const path = '/views/trips/' + trip + '/rating';
  assert.equal((await request(other, path, 'POST', { rating: 5 })).status, 404);
  assert.equal((await request(customer, path, 'POST', { rating: 9 })).status, 400);
  assert.equal((await request(customer, path, 'POST', { rating: 4, note: 'Good' })).status, 200);
  assert.equal((await request(customer, path, 'POST', { rating: 4, note: 'Good' })).status, 200);
  assert.equal((await request(customer, path, 'POST', { rating: 1 })).status, 409);
  for (let i = 0; i < 2; i++) assert.equal((await request(customer, '/views/favourites', 'POST', { driverId: driver, favourite: true })).status, 200);
  assert.deepEqual((await db.collection('users').doc(customer).get()).get('favouriteDriverIds'), [driver]);
});

test('private customer photos use the authenticated proxy and reject forged content', { skip: !enabled || !process.env.FIREBASE_STORAGE_EMULATOR_HOST }, async t => {
  const { db, base, request } = await serverFixture(t), customer = randomUUID(), other = randomUUID();
  for (const uid of [customer, other]) await db.collection('users').doc(uid).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  const headers = { Authorization: 'Bearer ' + customer, 'X-Firebase-AppCheck': 'fixture', 'Content-Type': 'image/jpeg' };
  const invalid = await fetch(base + '/customers/me/avatar', { method: 'POST', headers, body: Buffer.from('not an image') });
  assert.equal(invalid.status, 400);
  const bytes = Buffer.from([255, 216, 255, 224, 0, 0]);
  const uploaded = await fetch(base + '/customers/me/avatar', { method: 'POST', headers, body: bytes });
  assert.equal(uploaded.status, 200);
  const photo = await request(customer, '/customers/me/avatar'); assert.equal(photo.status, 200);
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), bytes);
  assert.equal((await request(other, '/customers/me/avatar')).status, 404);
  assert.equal((await request(customer, '/customers/me/avatar', 'DELETE')).status, 200);
  assert.equal((await request(customer, '/customers/me/avatar')).status, 404);
});

test('report review and resolution each produce one audit and reporter notification', { skip: !enabled }, async () => {
  const db = getFirestore(getFirebaseAdminApp()), admin = randomUUID(), reporter = randomUUID(), report = randomUUID();
  await db.collection('users').doc(admin).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  await db.collection('reports').doc(report).set({ status: 'OPEN', reporterId: reporter });
  const service = new SafetyService(db);
  for (let i = 0; i < 2; i++) await service.resolveReport(admin, report, 'UNDER_REVIEW', 'Investigating');
  for (let i = 0; i < 2; i++) await service.resolveReport(admin, report, 'RESOLVED', 'Reviewed evidence');
  for (const id of ['report-review-' + report, 'report-' + report]) {
    assert.equal((await db.collection('adminAuditLogs').doc(id).get()).exists, true);
    assert.equal((await db.collection('users').doc(reporter).collection('notifications').doc(id).get()).exists, true);
  }
  await assert.rejects(service.resolveReport(admin, report, 'UNDER_REVIEW', 'Reopen'), { code: 'REPORT_CLOSED' });
});

test('replacing a share revokes the previous token and scheduled decline leaves broadcast open', { skip: !enabled }, async () => {
  const db = getFirestore(getFirebaseAdminApp()), customer = randomUUID(), driver = randomUUID(), trip = randomUUID();
  await db.collection('trips').doc(trip).set({ customerId: customer, driverId: driver, status: 'IN_PROGRESS' });
  const service = new MobilityService(db, { route: async () => { throw Error('unused'); } });
  const first = await service.createShare(customer, trip), second = await service.createShare(customer, trip);
  await assert.rejects(service.readShare(first.token), { code: 'SHARE_UNAVAILABLE' });
  assert.equal((await service.readShare(second.token)).tripId, trip);
  const id = randomUUID(), booking = db.collection('bookings').doc(id);
  await booking.set({ kind: 'SCHEDULED', status: 'SCHEDULED_BROADCASTING', closesAt: Date.now() + 600000 });
  await booking.collection('offers').doc(driver).set({ status: 'OPEN' });
  const core = new BookingCore(db, {});
  await core.rejectOffer(id, driver); await core.rejectOffer(id, driver);
  assert.equal((await booking.get()).get('status'), 'SCHEDULED_BROADCASTING');
  assert.equal((await booking.collection('offers').doc(driver).get()).get('status'), 'REJECTED');
});

test('privacy revocation and push preferences are enforced without losing the in-app inbox', { skip: !enabled }, async () => {
  const { deliverNotification } = require('../dist/modules/notifications/notifications.js');
  const db = getFirestore(getFirebaseAdminApp()), customer = randomUUID(), trip = randomUUID(), notification = randomUUID();
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE', notifications: { bookingUpdates: false }, fcmTokens: ['never-send-fixture'] });
  await db.collection('trips').doc(trip).set({ customerId: customer, status: 'IN_PROGRESS' });
  const mobility = new MobilityService(db, {}), share = await mobility.createShare(customer, trip);
  await new ProfileService(db).updateCustomer(customer, { privacy: { tripSharing: false, matchingProfile: true, analytics: false } });
  await assert.rejects(mobility.readShare(share.token), { code: 'SHARE_UNAVAILABLE' });
  await assert.rejects(mobility.createShare(customer, trip), { code: 'SHARING_DISABLED' });
  const ref = db.collection('users').doc(customer).collection('notifications').doc(notification);
  await ref.set({ type: 'BOOKING_ASSIGNED', read: false, pushStatus: 'QUEUED' });
  await deliverNotification(db, customer, notification);
  assert.equal((await ref.get()).get('pushStatus'), 'IN_APP_ONLY'); assert.equal((await ref.get()).get('read'), false);
});

test('road preview requests modern route geometry while retaining server distance and duration', async t => {
  const { googleRoadProvider } = require('../dist/modules/mobility/geo.js');
  const previous = process.env.GOOGLE_MAPS_SERVER_KEY;
  process.env.GOOGLE_MAPS_SERVER_KEY = 'synthetic-server-key';
  t.after(() => previous === undefined ? delete process.env.GOOGLE_MAPS_SERVER_KEY : process.env.GOOGLE_MAPS_SERVER_KEY = previous);
  let request;
  t.mock.method(global, 'fetch', async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ routes: [{ distanceMeters: 12345, duration: '600s', polyline: { geoJsonLinestring: { coordinates: [[72, 22], [72.5, 22.5], [73, 23]] } } }] }), { status: 200 });
  });
  const road = await googleRoadProvider().route([{ lat: 22, lng: 72 }, { lat: 23, lng: 73 }]);
  assert.equal(JSON.parse(request.body).polylineEncoding, 'GEO_JSON_LINESTRING');
  assert.match(request.headers['X-Goog-FieldMask'], /polyline.geoJsonLinestring/);
  assert.deepEqual(road.path, [{ lat: 22, lng: 72 }, { lat: 22.5, lng: 72.5 }, { lat: 23, lng: 73 }]);
  assert.equal(road.distanceKm, 12.345); assert.equal(road.durationMinutes, 10);
});

test('assigned-offer retries initialize exactly one trip without repeating assignment or routing', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t), customer = randomUUID(), driver = randomUUID(), outsider = randomUUID(), id = randomUUID();
  for (const uid of [driver, outsider]) await db.collection('users').doc(uid).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  const fare = { hourlyRateInr: 100, pricing_mode: 'HOURLY', estimatedRouteMinutes: 20, waitingPolicyVersion: 'DEC-06', cancellationPolicyVersion: 'DEC-05' };
  await db.collection('bookings').doc(id).set({ customerId: customer, driverId: driver, status: 'ASSIGNED', kind: 'INSTANT', pickupAt: null, fare });
  for (let i = 0; i < 2; i++) assert.equal((await request(driver, '/driver-offers/' + id + '/accept', 'POST', {})).status, 200);
  assert.equal((await db.collection('trips').doc(id).get()).get('status'), 'DRIVER_EN_ROUTE');
  assert.equal((await request(outsider, '/driver-offers/' + id + '/accept', 'POST', {})).status, 404);
});

test('driver earnings screen includes waiting and adjustment facts and excludes other drivers', { skip: !enabled }, async t => {
  const { db, request } = await serverFixture(t), driver = randomUUID(), other = randomUUID(), id = randomUUID();
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('driverEarnings').doc(id).set({ driverId: driver, amountPaise: 17000, netPaise: 17000, source: 'COMPLETED_TRIP', status: 'ACCRUED' });
  await db.collection('driverEarnings').doc(randomUUID()).set({ driverId: other, amountPaise: 99999, netPaise: 99999 });
  await db.collection('trips').doc(id).set({ waitingFeePaise: 5000 });
  await db.collection('ledgerEntries').doc(randomUUID()).set({ invoiceId: id, kind: 'ADJUSTMENT', deltaPaise: 2000 });
  const response = await request(driver, '/views/earnings'); assert.equal(response.status, 200);
  const records = (await response.json()).data; assert.equal(records.length, 1);
  assert.equal(records[0].amountPaise, 17000); assert.equal(records[0].waitingPaise, 5000); assert.equal(records[0].adjustmentPaise, 2000);
});

test('database selection preserves explicit live configuration and allows isolated emulator fixtures', t => {
  const { getFirestoreDatabaseId } = require('../dist/config/firebase-admin.js');
  const previous = process.env.FIRESTORE_DATABASE_ID;
  t.after(() => previous === undefined ? delete process.env.FIRESTORE_DATABASE_ID : process.env.FIRESTORE_DATABASE_ID = previous);
  process.env.FIRESTORE_DATABASE_ID = 'configured-live-database';
  assert.equal(getFirestoreDatabaseId(), 'configured-live-database');
  process.env.FIRESTORE_DATABASE_ID = '(default)';
  assert.equal(getFirestoreDatabaseId(), '(default)');
});

test('driver cannot manually go offline during an in-progress trip', { skip: !enabled }, async () => {
  const db = getFirestore(getFirebaseAdminApp()), driver = randomUUID(), trip = randomUUID();
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED' });
  await db.collection('driverAvailability').doc(driver).set({ online: true });
  await db.collection('trips').doc(trip).set({ driverId: driver, status: 'IN_PROGRESS' });
  const mobility = new MobilityService(db, {});
  await assert.rejects(mobility.availability(driver, false), { code: 'TRIP_IN_PROGRESS' });
  assert.equal((await db.collection('driverAvailability').doc(driver).get()).get('online'), true);
  await db.collection('trips').doc(trip).update({ status: 'COMPLETED' });
  await mobility.availability(driver, false);
  assert.equal((await db.collection('driverAvailability').doc(driver).get()).get('online'), false);
});
