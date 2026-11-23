const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/lib');
const user = { uid: 'customer', getIdToken: async () => 'id-token' };
const plain = x => JSON.parse(JSON.stringify(x));
const good = data => new Response(JSON.stringify({ success: true, data, meta: { requestId: 'fixture' } }), { status: 200 });
function fixture(fetcher, globals = {}, env = {}) {
  const calls = [], cache = new Map();
  let appChecks = 0;
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file === path.join(root, 'env.ts')) return { apiBaseUrl: 'https://backend.invalid/api/v1', isDemoDataMode: false, ...env };
    if (file === path.join(root, 'firebase/client.ts')) return { getClientAppCheckToken: async () => 'limited-' + ++appChecks };
    if (/\/api\/demo(?:-booking|-product)?\.ts$/.test(file)) return new Proxy({}, { get: (_, name) => () => { throw Error('Unexpected demo fallback: ' + String(name)); } });
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const context = { module, exports: module.exports, require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name),
      console, Headers, Response, AbortSignal, Blob, File, crypto, URL, Date, setTimeout, clearTimeout,
      fetch: async (url, init) => { calls.push({ url, init }); return fetcher(url, init); }, ...globals };
    vm.runInNewContext(code, context, { filename: file }); return module.exports;
  }
  return { client: load(path.join(root, 'api/client.ts')), load, calls };
}
const fare = { hourlyRateInr: 120, estimatedRouteKm: 8, estimatedRouteMinutes: 30, estimatedBaseFareInr: 60,
  waitingPolicyVersion: 'DEC-06', cancellationPolicyVersion: 'DEC-05', quotedAt: new Date().toISOString() };
const view = () => ({ booking: { id: 'booking', kind: 'INSTANT', status: 'ASSIGNED', createdAt: Date.now(), pickupAt: null, routeId: 'road', fare },
  route: { id: 'road', pickup: { lat: 22, lng: 72 }, destination: { lat: 23, lng: 73 }, distanceKm: 8, durationMinutes: 30, createdAt: Date.now() },
  vehicle: { id: 'vehicle', make: 'Test', model: 'Car', category: 'SEDAN', transmission: 'MANUAL', fuelType: 'PETROL' },
  trip: { status: 'IN_PROGRESS', startOtp: 'SECRET', startHash: 'PRIVATE', startedAt: Date.now() - 60000 },
  driver: { id: 'driver', fullName: 'Test Driver', hourlyRateInr: 120 }, payable: null });

test('live API errors remain errors across session, quote, booking and list; no demo records are created', async () => {
  const f = fixture(() => new Response(JSON.stringify({ success: false, message: 'Denied', error: { code: 'ROLE_FORBIDDEN' } }), { status: 403 }));
  await assert.rejects(f.client.bootstrapSession(user, 'customer'), { code: 'ROLE_FORBIDDEN' });
  await assert.rejects(f.client.listBookings(user), { code: 'ROLE_FORBIDDEN' });
  await assert.rejects(f.client.getCustomerDetails(user), { code: 'ROLE_FORBIDDEN' });
  await assert.rejects(f.client.createBooking(user, { pickupAt: null }, { quoteId: 'q' }), { code: 'ROLE_FORBIDDEN' });
  assert.equal(new Set(f.calls.map(c => c.init.headers.get('X-Firebase-AppCheck'))).size, 4);
  assert.ok(f.calls.every(c => c.init.headers.get('Authorization') === 'Bearer id-token'));
});

test('quote requests preserve waypoint order and use server fare; scheduled requests omit selected driver', async () => {
  const f = fixture(url => good(url.endsWith('/routes') ? { routeId: 'server-road' } : url.endsWith('/quotes') ? { quoteId: 'q', fare } : { eligible: true }));
  const place = lat => ({ position: { lat, lng: 72 } });
  const input = { pickup: place(20), stops: [place(21)], destination: place(22), pickupAt: null,
    vehicle: { id: 'owned' }, bookingType: 'INSTANT', driver: { id: 'driver', hourlyRate: 999 }, filters: { radiusKm: 15, maxHourlyRate: 200 } };
  const quote = await f.client.requestBookingQuote(user, input);
  assert.deepEqual(plain(JSON.parse(f.calls[0].init.body).points), [{ lat: 20, lng: 72 }, { lat: 21, lng: 72 }, { lat: 22, lng: 72 }]);
  assert.deepEqual(JSON.parse(f.calls[2].init.body), { vehicleId: 'owned', routeId: 'server-road', driverId: 'driver', maxHourlyRateInr: 200 });
  assert.equal(quote.hourlyRate, 120); assert.equal(quote.estimatedBaseFare, 60);
  f.calls.length = 0;
  await f.client.requestBookingQuote(user, { ...input, bookingType: 'SCHEDULED', pickupAt: new Date(Date.now() + 8 * 3600000).toISOString() });
  assert.equal(f.calls.length, 2); assert.equal(JSON.parse(f.calls[1].init.body).driverId, null);
});

test('creation sends only quote identity and pickup timestamp and preserves terminal booking states', async () => {
  const v = view(); v.trip = null; v.booking.status = 'NEEDS_REBOOK';
  const f = fixture(url => good(url.endsWith('/bookings') ? { bookingId: 'booking' } : v));
  const b = await f.client.createBooking(user, { pickupAt: null }, { quoteId: 'q', estimatedBaseFare: 1 });
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { quoteId: 'q', pickupAt: null });
  assert.equal(b.status, 'NEEDS_REBOOK');
});

test('live trip mapping never exposes OTP fields and uses immutable backend amounts and dispute state', async () => {
  const v = view(); v.trip.status = 'COMPLETED'; v.trip.amountPaise = 12345;
  v.payable = { amountPaise: 12600, status: 'CONFIRMED', isUnderActiveDispute: true };
  const f = fixture(() => good(v)), trip = await f.client.getTrip(user, 'booking');
  assert.equal(trip.startOtp, ''); assert.equal(trip.endOtp, '');
  assert.equal(JSON.stringify(trip).includes('SECRET'), false); assert.equal(JSON.stringify(trip).includes('PRIVATE'), false);
  assert.equal(trip.finalFare.totalInr, 126); assert.equal(trip.finalFare.paymentStatus, 'DISPUTED');
});

test('share token is a header; minimal share data does not invent pickup coordinates or identity', async () => {
  const f = fixture(() => good({ tripId: 'trip', status: 'IN_PROGRESS', stale: false, position: { lat: 22.123, lng: 72.123 }, observedAt: Date.now() }));
  const s = await f.client.getSharedTrip(user, 'private-share-token');
  assert.ok(f.calls[0].url.endsWith('/shares/view')); assert.equal(f.calls[0].url.includes('private-share-token'), false);
  assert.equal(f.calls[0].init.headers.get('X-Trip-Share'), 'private-share-token');
  assert.equal(s.pickupPosition, null); assert.equal(s.destinationPosition, null); assert.equal(s.driverName, null);
});

test('driver uploads send original bytes privately and application submission uses verified upload IDs', async () => {
  const f = fixture(url => good(url.includes('/documents?') ? { id: 'verified-upload', storagePath: 'private/path', contentType: 'application/pdf', size: 9 } : {}));
  const file = new File(['%PDF-test'], 'private.pdf', { type: 'application/pdf' });
  const result = await f.client.uploadApplicationDocument(user, 'LICENCE', file);
  assert.equal(f.calls[0].init.body, file); assert.equal(f.calls[0].init.headers.get('Content-Type'), 'application/pdf');
  await f.client.saveDriverApplication(user, { documents: [{ id: result.id, storagePath: 'ignored' }] });
  assert.ok(f.calls[1].url.endsWith('/drivers/profile'));
  assert.deepEqual(JSON.parse(f.calls[2].init.body), { documents: [{ id: 'verified-upload' }] });
});

test('trip actions and audited Admin decisions use the canonical paths, payloads and idempotency headers', async () => {
  const f = fixture(url => good(url.includes('/views/trips/') ? view() : url.includes('/views/admin/applications/') ? { id: 'driver', driver: {}, documents: [] } : {}));
  await f.client.advanceTripStage(user, 'booking', 'END', { otp: '123456' });
  assert.ok(f.calls[0].url.endsWith('/trips/booking/complete')); assert.deepEqual(JSON.parse(f.calls[0].init.body), { code: '123456' });
  await f.client.reviewAdminApplication(user, 'driver', { action: 'APPROVE', reason: 'Checked original documents' });
  const decision = f.calls.find(c => c.url.endsWith('/decision'));
  assert.ok(decision.init.headers.get('Idempotency-Key')); assert.equal(JSON.parse(decision.init.body).action, 'APPROVE');
});

test('checkout uses backend paise amount and retains pending state until capture verification', async () => {
  let options;
  const f = fixture(url => good(url.endsWith('/orders') ? {
    attemptId: 'attempt', orderId: 'order_fixture', amountPaise: 12345, currency: 'INR', keyId: 'rzp_test_fixture',
  } : { status: url.endsWith('/status') ? 'READY' : 'PENDING' }), { window: { Razorpay: class {
    constructor(o) { options = o; }
    open() { options.handler({ razorpay_payment_id: 'pay_fixture', razorpay_order_id: 'order_fixture', razorpay_signature: 'signature' }); }
  } } });
  const checkout = f.load(path.join(root, 'api/razorpay-checkout.ts'));
  assert.equal(await checkout.openCheckout(user, 'invoice'), 'PENDING');
  assert.equal(options.amount, 12345); assert.equal(options.order_id, 'order_fixture');
  assert.equal(JSON.parse(f.calls[2].init.body).attemptId, 'attempt');
  assert.ok(f.calls[1].init.headers.get('Idempotency-Key'));
});

test('checkout avoids reopening a pending or captured order, and checks status after dismissal', async () => {
  let status = 'PENDING', opened = 0;
  const f = fixture(url => good(url.endsWith('/orders') ? {
    attemptId: 'attempt', orderId: 'order_fixture', amountPaise: 500, currency: 'INR', keyId: 'rzp_test_fixture',
  } : { status }), { window: { Razorpay: class {
    constructor(options) { this.options = options; }
    open() {
      opened++;
      status = 'PENDING';
      this.options.modal.ondismiss();
    }
  } } });
  const checkout = f.load(path.join(root, 'api/razorpay-checkout.ts'));
  assert.equal(await checkout.openCheckout(user, 'invoice'), 'PENDING');
  status = 'CAPTURED';
  assert.equal(await checkout.openCheckout(user, 'invoice'), 'CAPTURED');
  assert.equal(opened, 0);
  status = 'FAILED';
  assert.equal(await checkout.openCheckout(user, 'invoice'), 'PENDING');
  assert.equal(opened, 1);
  assert.ok(f.calls.at(-1).url.endsWith('/status'));
});

test('uncertain audited mutations reuse the request identity on explicit retry', async () => {
  let attempts = 0;
  const f = fixture(url => {
    if (url.endsWith('/reports') && ++attempts === 1) throw Error('connection dropped');
    return good({ id: 'report' });
  });
  const input = { tripId: 'trip', reporterRole: 'CUSTOMER', category: 'SAFETY_CONCERN', description: 'Review this incident.' };
  await assert.rejects(f.client.createTripReport(user, input), { code: 'NETWORK_ERROR' });
  await f.client.createTripReport(user, input);
  assert.equal(f.calls[0].init.headers.get('Idempotency-Key'), f.calls[1].init.headers.get('Idempotency-Key'));
});

test('Google map handles update private driver markers and keep read-only trip pins fixed', async () => {
  const overlays = []; let centered = 0;
  class Marker {
    constructor(options) { this.options = options; overlays.push(this); }
    setMap(map) { this.removed = map === null; }
  }
  class LatLng { constructor(lat, lng) { this.lat = () => lat; this.lng = () => lng; } }
  const google = { maps: { Map: class { fitBounds() {} panTo() { centered++; } }, Marker, LatLng,
    LatLngBounds: class { extend() {} }, event: { clearInstanceListeners() {}, addListener() {} } } };
  const f = fixture(() => good({}), { window: { google } });
  const provider = f.load(path.join(root, 'maps/google-provider.ts')).createGoogleMapsProvider('browser-fixture');
  const map = await provider.createMap({}, { points: [], route: null, driverMarkers: [{ id: 'driver', position: { lat: 22, lng: 72 }, label: 'Driver' }] });
  assert.equal(overlays.length, 1); assert.equal(overlays[0].options.draggable, false); assert.equal(centered, 1);
  map.updateDriverMarkers([{ id: 'driver', position: { lat: 23, lng: 73 }, label: 'Last known driver location', stale: true }]);
  assert.equal(overlays[0].removed, true); assert.equal(overlays[1].options.opacity, 0.45); assert.equal(centered, 1);
  map.destroy(); assert.equal(overlays[1].removed, true);
});

test('new Places autocomplete shares a session and fetches details only for the selected prediction', async () => {
  let sessions = 0, details = 0; const requests = [];
  const place = { displayName: 'Selected pickup', formattedAddress: 'Selected address', location: { lat: () => 22, lng: () => 72 },
    async fetchFields(request) { details++; assert.deepEqual(plain(request.fields), ['displayName', 'formattedAddress', 'location']); } };
  const google = { maps: { places: { AutocompleteSessionToken: class { constructor() { sessions++; } },
    AutocompleteSuggestion: { async fetchAutocompleteSuggestions(request) { requests.push(request); return { suggestions: [{ placePrediction: { placeId: 'place', text: { toString: () => 'Pickup prediction' }, toPlace: () => place } }] }; } } } } };
  const f = fixture(() => good({}), { window: { google } });
  const provider = f.load(path.join(root, 'maps/google-provider.ts')).createGoogleMapsProvider('fixture');
  await provider.searchPlaces('Pi'); const suggestions = await provider.searchPlaces('Pick', { lat: 22, lng: 72 });
  assert.equal(details, 0); assert.equal(sessions, 1); assert.equal(requests[0].sessionToken, requests[1].sessionToken);
  const selected = await provider.resolvePlace(suggestions[0]);
  assert.equal(details, 1); assert.deepEqual(plain(selected.position), { lat: 22, lng: 72 });
  await provider.searchPlaces('Next'); assert.equal(sessions, 2);
});

test('an assigned driver can recover a legacy booking whose trip initialization was interrupted', async () => {
  const v = view(); v.booking.driverId = user.uid; v.trip = null;
  const f = fixture(url => { if (url.endsWith('/initialize')) { v.trip = { status: 'DRIVER_EN_ROUTE' }; return good({ initialized: true }); } return good(v); });
  const trip = await f.client.getTrip(user, 'booking');
  assert.equal(trip.state, 'EN_ROUTE'); assert.equal(f.calls.filter(c => c.url.endsWith('/initialize')).length, 1);
});

test('unconfigured push falls back to inbox without requesting notification permission', async () => {
  let prompts = 0;
  const f = fixture(() => good({}), { window: { Notification: { requestPermission: () => { prompts++; } } } });
  const push = f.load(path.join(root, 'firebase/push.ts'));
  assert.match(await push.enablePush(user), /in-app inbox remains available/);
  assert.equal(prompts, 0); assert.equal(f.calls.length, 0);
});

test('worker push drops stale bindings and uses only safe workspace text', async () => {
  const handlers = {}, notices = [];
  const self = { addEventListener: (name, handler) => handlers[name] = handler,
    clients: { matchAll: async () => [] }, registration: { showNotification: async (title, options) => notices.push({ title, ...options }) } };
  const caches = { match: async () => Response.json({ channel: 'driver-binding', audience: 'DRIVER' }) };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8'), { self, URL, caches });
  const push = data => {
    let completion;
    handlers.push({ data: { json: () => ({ data }) }, waitUntil: value => completion = value });
    return completion;
  };
  await push({ channel: 'old-binding', audience: 'DRIVER' });
  await push({ channel: 'driver-binding', audience: 'CUSTOMER' });
  assert.equal(notices.length, 0);
  await push({ channel: 'driver-binding', audience: 'DRIVER', customerPhone: 'PRIVATE_PHONE', otp: 'PRIVATE_OTP' });
  assert.equal(notices.length, 1); assert.equal(JSON.stringify(notices).includes('PRIVATE'), false);
  assert.equal(notices[0].title, 'Veyro Driver update');
});


test('denied push permission keeps inbox usable and does not register a device', async () => {
  let prompts = 0;
  const Notification = { requestPermission: async () => { prompts++; return 'denied'; } };
  const f = fixture(() => good({}), { window: { Notification }, Notification, navigator: { serviceWorker: {} }, process: { env: { NODE_ENV: 'production' } } }, { firebaseVapidKey: 'public-fixture' });
  const push = f.load(path.join(root, 'firebase/push.ts'));
  assert.match(await push.enablePush(user), /not granted/); assert.equal(prompts, 1); assert.equal(f.calls.length, 0);
});
