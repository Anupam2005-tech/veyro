if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
  const config = JSON.parse(process.env.FIREBASE_CONFIG ?? '{}');
  process.env.FIREBASE_CONFIG = JSON.stringify({ ...config, projectId: 'demo-veyro-audit',
    databaseURL: 'https://demo-veyro-audit-default-rtdb.firebaseio.com', storageBucket: 'demo-veyro-audit.appspot.com' });
}
const { ProfileService } = require('../dist/modules/profiles/profile-service.js');
const { verifyDocument } = require('../dist/modules/profiles/documents.js');
const { MobilityService } = require('../dist/modules/mobility/mobility-service.js');

test('private upload validation rejects content spoofing and oversized documents', () => {
  verifyDocument(Buffer.from('%PDF-synthetic'), 'application/pdf');
  assert.throws(() => verifyDocument(Buffer.from('not an image'), 'image/jpeg'), { code: 'INVALID_DOCUMENT_TYPE' });
  assert.throws(() => verifyDocument(Buffer.alloc(10000001), 'application/pdf'), { code: 'INVALID_DOCUMENT_SIZE' });
});

test('profiles enforce ownership, preserve server roles and reset approval on capability changes', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), uid = randomUUID(), other = randomUUID();
  await db.collection('users').doc(uid).set({ roles: ['CUSTOMER', 'DRIVER'], status: 'ACTIVE' });
  await db.collection('users').doc(other).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  const service = new ProfileService(db);
  const vehicle = { make: 'Test', model: 'Test', category: 'STANDARD', transmission: 'MANUAL', fuelType: 'PETROL' };
  await service.customer(uid, { fullName: 'Test', phone: '+16505550101', consentTerms: true, consentPrivacy: true, vehicle });
  assert.deepEqual((await db.collection('users').doc(uid).get()).get('roles'), ['CUSTOMER', 'DRIVER']);
  await assert.rejects(service.vehicle(other, uid + '-primary', vehicle), { code: 'VEHICLE_UNAVAILABLE' });
  const input = { fullName: 'Test', phone: '+16505550101', hourlyRate: '100', perKmRate: '5', experienceYears: '3',
    categories: ['STANDARD'], transmissions: ['MANUAL'], languages: ['English'], serviceAreas: 'Test area',
    serviceAreaBounds: { southWest: { lat: 20, lng: 70 }, northEast: { lat: 30, lng: 80 } } };
  await service.driver(uid, input);
  await db.collection('drivers').doc(uid).update({ approvalStatus: 'APPROVED' });
  await service.driver(uid, { ...input, hourlyRate: '120' });
  assert.equal((await db.collection('drivers').doc(uid).get()).get('approvalStatus'), 'APPROVED');
  await service.driver(uid, { ...input, transmissions: ['MANUAL', 'AUTOMATIC'] });
  assert.equal((await db.collection('drivers').doc(uid).get()).get('approvalStatus'), 'PENDING_REVIEW');
  const placeIds = ['ChIJ_fixtureFirst', 'ChIJ_fixtureSecond'];
  assert.throws(() => service.driver(uid, { ...input, serviceAreaPlaceIds: [placeIds[0], placeIds[0]] }),
    { code: 'INVALID_SERVICE_AREA' });
  await service.driver(uid, { ...input, serviceAreaPlaceIds: placeIds });
  const updated = await db.collection('drivers').doc(uid).get();
  assert.deepEqual(updated.get('serviceAreaPlaceIds'), placeIds);
  assert.equal(updated.get('serviceAreas'), '2 selected service areas');
  assert.deepEqual(updated.get('serviceAreaBounds'), input.serviceAreaBounds);
});

test('road-based eligibility produces booking facts and shares are hash-only and revoked/ended securely', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), customer = randomUUID(), driver = randomUUID(), vehicle = randomUUID(), trip = randomUUID();
  await db.collection('users').doc(driver).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED', categories: ['STANDARD'], transmissions: ['MANUAL'],
    hourlyRateInr: 100, serviceAreaBounds: { southWest: { lat: 20, lng: 70 }, northEast: { lat: 30, lng: 80 } } });
  await db.collection('vehicles').doc(vehicle).set({ customerId: customer, category: 'STANDARD', transmission: 'MANUAL' });
  const roads = { async route() { return { distanceKm: 3, durationMinutes: 10 }; } };
  const service = new MobilityService(db, roads);
  await service.availability(driver, true, { lat: 22, lng: 72 });
  const route = await service.route(customer, vehicle, [{ lat: 22, lng: 72 }, { lat: 23, lng: 73 }]);
  const eligibility = await service.eligibility(customer, driver, route.routeId);
  assert.equal(eligibility.pickupDistanceKm, 3);
  const reservation = db.collection('driverReservations').doc(driver).collection('active').doc(trip);
  await reservation.set({ kind: 'SCHEDULED', start: Date.now() - 7200000, end: Date.now() - 3600000 });
  for (const status of ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']) {
    await db.collection('trips').doc(trip).set({ customerId: customer, driverId: driver, status });
    await assert.rejects(service.eligibility(customer, driver, route.routeId), { code: 'DRIVER_BUSY' });
  }
  await reservation.delete();
  await db.collection('trips').doc(trip).set({ customerId: customer, driverId: driver, status: 'IN_PROGRESS' });
  const share = await service.createShare(customer, trip);
  const record = await db.collection('tripShares').doc(share.shareId).get();
  assert.equal(record.get('token'), undefined);
  assert.equal((await service.readShare(share.token)).tripId, trip);
  await service.revokeShare(customer, share.shareId);
  await assert.rejects(service.readShare(share.token), { code: 'SHARE_UNAVAILABLE' });
  const second = await service.createShare(customer, trip);
  await db.collection('trips').doc(trip).update({ status: 'COMPLETED' });
  await assert.rejects(service.readShare(second.token), { code: 'SHARE_UNAVAILABLE' });
});

test('GPS writes require an assigned driver and termination fences RTDB against late samples', {
  skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST,
}, async t => {
  const { getDatabase } = require('firebase-admin/database');
  const { clearTripLocation } = require('../dist/modules/mobility/mobility-service.js');
  const app = getFirebaseAdminApp();
  t.after(() => getDatabase(app).goOffline());
  const db = getFirestore(app), uid = randomUUID(), customer = randomUUID(), id = randomUUID(), route = randomUUID();
  const now = Date.now(), position = { lat: 22, lng: 72 };
  await db.collection('users').doc(uid).set({ roles: ['DRIVER'], status: 'ACTIVE' });
  await db.collection('users').doc(customer).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('trips').doc(id).set({ customerId: customer, driverId: uid, bookingId: id, status: 'DRIVER_EN_ROUTE' });
  await db.collection('bookings').doc(id).set({ routeId: route });
  await db.collection('routeQuotes').doc(route).set({ pickup: position });
  const service = new MobilityService(db, { route: async () => ({ distanceKm: 1, durationMinutes: 1 }) }, () => now);
  const sample = { position, accuracy: 10, observedAt: now };
  await assert.rejects(service.location(customer, id, sample), { code: 'TRIP_NOT_ACCESSIBLE' });
  await service.location(uid, id, sample);
  await service.location(uid, id, sample);
  const realtime = getDatabase(app).ref('tripLocations/' + id);
  assert.equal((await realtime.get()).val().sample.lat, 22);
  assert.equal((await db.collection('arrivalEvidence').doc(id).get()).get('withinPickup100m'), true);
  await assert.rejects(service.location(uid, id, { ...sample, position: { lat: 23, lng: 72 } }), { code: 'GPS_OUT_OF_ORDER' });
  await db.collection('trips').doc(id).update({ status: 'COMPLETED' });
  await clearTripLocation(db, id);
  assert.equal((await realtime.get()).val().state, 'DISABLED');
  assert.equal((await db.collection('liveLocations').doc(id).get()).exists, false);
  await assert.rejects(service.location(uid, id, sample), { code: 'TRIP_NOT_ACCESSIBLE' });
});

test('private document upload records verified owner and generation in the Storage emulator', {
  skip: !process.env.FIREBASE_STORAGE_EMULATOR_HOST,
}, async () => {
  const { uploadDocument } = require('../dist/modules/profiles/documents.js');
  const uid = randomUUID();
  const result = await uploadDocument(uid, 'LICENCE', Buffer.from('%PDF-synthetic'), 'application/pdf');
  assert.ok(result.storagePath.startsWith('private/driver-documents/' + uid + '/'));
  const record = await getFirestore(getFirebaseAdminApp()).collection('driverUploads').doc(result.id).get();
  assert.equal(record.get('uid'), uid);
  assert.equal(record.get('verified'), true);
  assert.equal(typeof record.get('generation'), 'string');
});

test('scheduled matching refreshes pickup eligibility after the original route quote expires', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const { BookingCore } = require('../dist/modules/bookings/booking-core.js');
  const { bookingChecks } = require('../dist/modules/bookings/booking-checks.js');
  const { storeBookingQuote } = require('../dist/modules/quotes/quote-repository.js');
  const db = getFirestore(getFirebaseAdminApp()), customer = randomUUID(), driver = randomUUID(), vehicle = randomUUID();
  let now = Date.now();
  for (const [uid, role] of [[customer, 'CUSTOMER'], [driver, 'DRIVER']]) await db.collection('users').doc(uid).set({ roles: [role], status: 'ACTIVE' });
  await db.collection('drivers').doc(driver).set({ approvalStatus: 'APPROVED', categories: ['STANDARD'], transmissions: ['MANUAL'],
    hourlyRateInr: 100, serviceAreaBounds: { southWest: { lat: 20, lng: 70 }, northEast: { lat: 30, lng: 80 } } });
  await db.collection('vehicles').doc(vehicle).set({ customerId: customer, category: 'STANDARD', transmission: 'MANUAL' });
  const service = new MobilityService(db, { route: async () => ({ distanceKm: 2, durationMinutes: 10 }) }, () => now);
  const pickupAt = now + 24 * 60 * 60000;
  const route = await service.route(customer, vehicle, [{ lat: 22, lng: 72 }, { lat: 23, lng: 73 }], 15, false, pickupAt);
  const quote = await storeBookingQuote(db, { customerId: customer, vehicleId: vehicle, routeId: route.routeId, selectedDriverId: null },
    { hourlyRateInr: 200, estimatedRouteKm: 2, estimatedRouteMinutes: 10,
      waitingPolicyVersion: 'test', cancellationPolicyVersion: 'test', platformFeeConfigVersion: 'test' });
  const core = new BookingCore(db, bookingChecks(db, () => now), () => now);
  await assert.rejects(core.create(customer, quote, pickupAt + 1), { code: 'PICKUP_CHANGED' });
  await core.create(customer, quote, pickupAt);
  now += 12 * 60 * 60000;
  await core.advance(quote);
  await service.availability(driver, true, { lat: 22, lng: 72 });
  await service.eligibility(customer, driver, route.routeId, true);
  await core.offerScheduled(quote, driver);
  await core.accept(quote, driver);
  assert.equal((await db.collection('bookings').doc(quote).get()).get('status'), 'ASSIGNED');
});

test('HTTP share access requires authentication and returns only the allowed trip view', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async t => {
  const { once } = require('node:events');
  const { getAuth } = require('firebase-admin/auth');
  const { getAppCheck } = require('firebase-admin/app-check');
  const { createApp } = require('../dist/app.js');
  const app = getFirebaseAdminApp(), db = getFirestore(app), id = randomUUID(), owner = randomUUID();
  await db.collection('trips').doc(id).set({ status: 'IN_PROGRESS', customerId: owner, driverId: randomUUID(),
    emergencyContacts: ['private'], phone: 'private' });
  const service = new MobilityService(db, { route: async () => ({ distanceKm: 1, durationMinutes: 1 }) });
  const share = await service.createShare(owner, id);
  t.mock.method(getAuth(app), 'verifyIdToken', async () => ({ uid: 'authenticated-recipient' }));
  t.mock.method(getAppCheck(app), 'verifyToken', async () => ({ alreadyConsumed: false }));
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/shares/view';
  assert.equal((await fetch(url, { headers: { 'X-Trip-Share': share.token } })).status, 401);
  const response = await fetch(url, { headers: { Authorization: 'Bearer fixture', 'X-Firebase-AppCheck': 'fixture', 'X-Trip-Share': share.token } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const payload = await response.json();
  assert.equal(payload.data.tripId, id);
  assert.doesNotMatch(JSON.stringify(payload), /private|emergencyContacts|customerId|driverId/);
  await assert.rejects(service.revokeShare('someone-else', share.shareId), { code: 'SHARE_UNAVAILABLE' });
});

test('RTDB denies direct anonymous reads of private location paths', {
  skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  const response = await fetch('http://' + host + '/tripLocations.json?ns=demo-veyro-audit-default-rtdb');
  assert.ok([401, 403].includes(response.status));
});

test('application compatibility routes require verified uploads and cannot reset an approved application', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async t => {
  const { once } = require('node:events');
  const { getAuth } = require('firebase-admin/auth');
  const { getAppCheck } = require('firebase-admin/app-check');
  const { createApp } = require('../dist/app.js');
  const app = getFirebaseAdminApp(), db = getFirestore(app), uid = randomUUID();
  await db.collection('users').doc(uid).set({ roles: ['DRIVER'], status: 'ACTIVE', fullName: 'Server name' });
  await db.collection('drivers').doc(uid).set({ approvalStatus: 'PENDING_REVIEW' });
  t.mock.method(getAuth(app), 'verifyIdToken', async () => ({ uid }));
  t.mock.method(getAppCheck(app), 'verifyToken', async () => ({ alreadyConsumed: false }));
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: {
    Authorization: 'Bearer fixture', 'X-Firebase-AppCheck': 'fixture', 'Content-Type': 'application/json',
  }, body: JSON.stringify(body) });
  const forged = await post('/drivers/applications', { documents: [{ storagePath: 'someone-else' }] });
  assert.equal(forged.status, 400);
  assert.equal((await db.collection('driverApplications').doc(uid).get()).exists, false);
  const documents = [];
  for (const kind of ['LICENCE', 'GOVERNMENT_ID', 'PROFILE_PHOTO']) {
    const id = randomUUID();
    await db.collection('driverUploads').doc(id).create({ uid, kind, verified: true, generation: '1', storagePath: 'private/' + uid + '/' + id });
    documents.push({ id });
  }
  const valid = await post('/driver-applications/me', { documents, fullName: 'Forged name' });
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).data.fullName, 'Server name');
  assert.equal((await post('/driver-applications/me', { documents })).status, 200);
  await db.collection('driverApplications').doc(uid).update({ status: 'APPROVED' });
  await db.collection('drivers').doc(uid).update({ approvalStatus: 'APPROVED' });
  assert.equal((await post('/drivers/applications/resubmit', {})).status, 409);
  assert.equal((await db.collection('driverApplications').doc(uid).get()).get('status'), 'APPROVED');
});

test('stale location cleanup removes orphan coordinates and expires foreground presence', {
  skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST,
}, async t => {
  const { getDatabase } = require('firebase-admin/database');
  const { cleanupLocations } = require('../dist/modules/mobility/mobility-service.js');
  const app = getFirebaseAdminApp(), db = getFirestore(app), id = randomUUID(), driver = randomUUID();
  t.after(() => getDatabase(app).goOffline());
  getDatabase(app).goOnline();
  const observedAt = Date.now() - 25 * 60 * 60000;
  await db.collection('liveLocations').doc(id).set({ lat: 22, lng: 72, observedAt, expiresAt: Date.now() - 1 });
  await db.collection('driverAvailability').doc(driver).set({ online: true, position: { lat: 22, lng: 72 },
    updatedAt: observedAt, expiresAt: Date.now() - 1 });
  const realtime = getDatabase(app).ref('tripLocations/' + id);
  await realtime.set({ state: 'ACTIVE', sample: { lat: 22, lng: 72, observedAt } });
  await cleanupLocations(db);
  assert.equal((await db.collection('liveLocations').doc(id).get()).exists, false);
  const presence = await db.collection('driverAvailability').doc(driver).get();
  assert.equal(presence.get('online'), false);
  assert.equal(presence.get('position'), undefined);
  assert.deepEqual((await realtime.get()).val(), { state: 'DISABLED' });
});
