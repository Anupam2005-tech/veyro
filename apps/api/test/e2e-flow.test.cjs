/**
 * End-to-end API flow against the compiled app with an isolated temp data dir:
 * sign-in → quote → instant booking → accept → arrive → OTP start/end →
 * share/SOS → balance gate → payment → rating → Admin review + audit.
 */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const dataDir = mkdtempSync(join(tmpdir(), 'veyro-e2e-'));
process.env.VEYRO_DATA_DIR = dataDir;
process.env.ROUTING = 'offline';
process.env.GEOCODER = 'offline';
process.env.NODE_ENV = 'test';

const { createApp } = require('../dist/app.js');
const store = require('../dist/store/db.js');

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function signIn(email, role) {
  const start = await call('POST', '/auth/email/start', null, { email });
  assert.equal(start.success, true, start.message);
  const verify = await call('POST', '/auth/email/verify', null, { email, code: start.data.devCode, role });
  assert.equal(verify.success, true, verify.message);
  return verify.data.token;
}

const PARK_STREET = { label: 'Park Street, Kolkata', lat: 22.5526, lng: 88.3525 };
const ESPLANADE = { label: 'Esplanade, Kolkata', lat: 22.5646, lng: 88.351 };
let ts = Date.now() - 25_000;
const sample = (p) => ({ lat: p.lat, lng: p.lng, accuracyM: 5, timestamp: new Date((ts += 5000)).toISOString() });

test('full instant booking lifecycle', async () => {
  const customer = await signIn('customer@veyro.test');
  const driver = await signIn('driver@veyro.test');
  const admin = await signIn('admin@veyro.test');

  assert.equal((await call('GET', '/me', null)).status, 401);
  const wrong = await call('POST', '/auth/email/verify', null, { email: 'customer@veyro.test', code: '000000' });
  assert.equal(wrong.success, false);

  // Driver goes online with a fresh GPS fix.
  assert.equal((await call('PATCH', '/drivers/availability', driver, { status: 'ONLINE' })).error.code, 'LOCATION_STALE');
  assert.equal((await call('POST', '/drivers/presence', driver, sample({ lat: 22.5539, lng: 88.3525 }))).data.accepted, true);
  assert.equal((await call('PATCH', '/drivers/availability', driver, { status: 'ONLINE' })).success, true);

  // Role separation.
  assert.equal((await call('GET', '/admin/overview', customer)).status, 403);
  assert.equal((await call('GET', '/drivers/offers', customer)).status, 403);

  const quote = await call('POST', '/bookings/quote', customer, { pickup: PARK_STREET, destination: ESPLANADE, vehicleId: 'veh_swift', type: 'INSTANT' });
  assert.equal(quote.success, true, quote.message);
  assert.equal(quote.data.route.source, 'ESTIMATE');
  const pick = quote.data.drivers.find((d) => d.id === 'usr_driver_arjun');
  assert.ok(pick, 'online driver is offered');
  assert.equal(pick.phone, undefined, 'driver card hides contact details');

  const booking = await call('POST', '/bookings', customer, { pickup: PARK_STREET, destination: ESPLANADE, vehicleId: 'veh_swift', type: 'INSTANT', driverId: pick.id });
  assert.equal(booking.status, 201, booking.message);
  assert.equal(booking.data.status, 'SEARCHING');
  assert.equal(booking.data.quote.pricing_mode, 'HOURLY');

  const offers = await call('GET', '/drivers/offers', driver);
  assert.ok(offers.data.some((o) => o.id === booking.data.id));
  const accepted = await call('POST', `/drivers/offers/${booking.data.id}/accept`, driver);
  assert.equal(accepted.data.status, 'ASSIGNED');
  assert.equal((await call('POST', `/drivers/offers/${booking.data.id}/accept`, driver)).status, 409, 'second acceptance rejected');
  const tripId = accepted.data.tripId;

  // Arrival is geofenced: too far first, then at the pickup.
  assert.equal((await call('POST', `/trips/${tripId}/arrive`, driver)).error.code, 'OUTSIDE_GEOFENCE');
  await call('POST', '/drivers/presence', driver, sample(PARK_STREET));
  const arrived = await call('POST', `/trips/${tripId}/arrive`, driver);
  assert.equal(arrived.data.status, 'ARRIVED', arrived.message);

  // Start OTP: customer reveals, wrong code fails, correct code starts the trip.
  assert.equal((await call('POST', `/trips/${tripId}/start-otp`, driver)).status, 403);
  const startOtp = await call('POST', `/trips/${tripId}/start-otp`, customer);
  assert.match(startOtp.data.code, /^\d{6}$/);
  const bad = String((Number(startOtp.data.code) + 1) % 1000000).padStart(6, '0');
  assert.equal((await call('POST', `/trips/${tripId}/start-otp/verify`, driver, { code: bad })).error.code, 'OTP_INVALID');
  const started = await call('POST', `/trips/${tripId}/start-otp/verify`, driver, { code: startOtp.data.code });
  assert.equal(started.data.status, 'IN_PROGRESS');
  assert.equal((await call('POST', `/trips/${tripId}/start-otp/verify`, driver, { code: startOtp.data.code })).status, 409, 'OTP single-use');

  // Share link: authenticated read-only view, minimal data.
  const share = await call('POST', `/trips/${tripId}/share-links`, customer);
  assert.equal(share.status, 201);
  assert.equal((await call('GET', `/share/${share.data.token}`, null)).status, 401);
  const shared = await call('GET', `/share/${share.data.token}`, admin);
  assert.equal(shared.data.active, true);
  assert.equal(shared.data.customer, undefined);

  // Demo SOS never claims delivery.
  const sos = await call('POST', `/trips/${tripId}/sos`, customer);
  assert.ok(sos.data.deliveryAttempts.every((a) => a.status === 'DEMO_NOT_SENT'));

  // Pretend the trip ran for 30 minutes, then end it.
  store.mutate((data) => {
    const t = data.trips.find((x) => x.id === tripId);
    t.startedAt = new Date(Date.now() - 30 * 60_000).toISOString();
  });
  const endOtp = await call('POST', `/trips/${tripId}/end-otp`, customer);
  const ended = await call('POST', `/trips/${tripId}/end-otp/verify`, driver, { code: endOtp.data.code });
  assert.equal(ended.data.status, 'COMPLETED');
  assert.equal(ended.data.fare.baseFareInr, 110, '₹220/h × 30 min, no minimum');
  assert.equal(ended.data.fare.platformFeeInr, 0);
  assert.equal((await call('GET', `/share/${share.data.token}`, admin)).data.active, false, 'share expires at completion');

  // Balance gate blocks new bookings until paid.
  const me = await call('GET', '/me', customer);
  assert.equal(me.data.outstandingBalanceInr, 110);
  const blocked = await call('POST', '/bookings', customer, { pickup: PARK_STREET, destination: ESPLANADE, vehicleId: 'veh_swift', type: 'INSTANT', driverId: pick.id });
  assert.equal(blocked.error.code, 'OUTSTANDING_BALANCE');

  const order = await call('POST', '/payments/orders', customer, { idempotencyKey: 'test-key-123' });
  assert.equal(order.data.mode, 'DEMO');
  assert.equal(order.data.amountInr, 110);
  assert.equal((await call('POST', '/payments/orders', customer, { idempotencyKey: 'test-key-123' })).data.paymentId, order.data.paymentId, 'idempotent');
  const captured = await call('POST', `/payments/${order.data.paymentId}/demo-capture`, customer);
  assert.equal(captured.data.status, 'CAPTURED');
  assert.equal((await call('GET', '/me', customer)).data.outstandingBalanceInr, 0);

  const rated = await call('POST', `/trips/${tripId}/rating`, customer, { stars: 5, favourite: true });
  assert.equal(rated.data.rating.stars, 5);

  // Earnings: 0% commission.
  const earnings = await call('GET', '/drivers/earnings', driver);
  assert.equal(earnings.data.totals.netInr, 110);
});

test('admin review writes an audit record and gates going online', async () => {
  const admin = await signIn('admin@veyro.test');
  const applicant = await signIn('applicant@veyro.test');
  await call('POST', '/drivers/presence', applicant, sample(PARK_STREET));
  assert.equal((await call('PATCH', '/drivers/availability', applicant, { status: 'ONLINE' })).error.code, 'AVAILABILITY_BLOCKED');

  const queue = await call('GET', '/admin/applications?status=PENDING_REVIEW', admin);
  const app = queue.data.find((a) => a.driverId === 'usr_driver_priya');
  const detail = await call('GET', `/admin/applications/${app.id}`, admin);
  assert.equal(detail.data.documents.length, 3);
  const file = await fetch(base.replace('/api/v1', '') + detail.data.documents[0].url);
  assert.equal(file.status, 200);
  assert.equal((await fetch(base.replace('/api/v1', '') + detail.data.documents[0].url.replace(/sig=[^&]+/, 'sig=bad'))).status, 403);

  assert.equal((await call('POST', `/admin/applications/${app.id}/review`, admin, { action: 'APPROVE', reason: '' })).status, 400);
  const ok = await call('POST', `/admin/applications/${app.id}/review`, admin, { action: 'APPROVE', reason: 'Documents verified' });
  assert.equal(ok.data.status, 'APPROVED');
  const auditLog = await call('GET', '/admin/audit', admin);
  assert.ok(auditLog.data.some((l) => l.action === 'APPLICATION_APPROVE' && l.before === 'PENDING_REVIEW' && l.after === 'APPROVED'));
  assert.equal((await call('PATCH', '/drivers/availability', applicant, { status: 'ONLINE' })).success, true);
});

test('new driver signs up, uploads documents and submits', async () => {
  const token = await signIn('new.driver@example.com', 'DRIVER');
  const pdf = Buffer.from('%PDF-1.4\n%demo\n').toString('base64');
  for (const kind of ['LICENCE', 'GOVERNMENT_ID', 'PHOTO']) {
    const up = await call('POST', '/drivers/documents', token, { kind, filename: `${kind}.pdf`, mime: 'application/pdf', dataBase64: pdf });
    assert.equal(up.status, 201, up.message);
  }
  const spoof = await call('POST', '/drivers/documents', token, { kind: 'PHOTO', filename: 'x.png', mime: 'image/png', dataBase64: pdf });
  assert.equal(spoof.status, 400, 'content sniffing rejects mismatched type');
  const submit = await call('POST', '/drivers/application', token, {
    name: 'Test Driver', phone: '+919811111111', experienceYears: 3, languages: ['Hindi'], categories: ['SEDAN'], transmissions: ['MANUAL'],
    serviceArea: { ...PARK_STREET, radiusKm: 10 }, hourlyRateInr: 150,
  });
  assert.equal(submit.data.status, 'PENDING_REVIEW', submit.message);
  const me = await call('GET', '/me', token);
  assert.equal(me.data.applicationStatus, 'PENDING_REVIEW');
});
