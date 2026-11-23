if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, createHmac } = require('node:crypto');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getAppCheck } = require('firebase-admin/app-check');
const { getMessaging } = require('firebase-admin/messaging');
const { once } = require('node:events');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { PaymentService, enforceBookingBalance } = require('../dist/modules/payments/payment-service.js');
const { SafetyService } = require('../dist/modules/safety/safety-service.js');
const { deliverNotification, registerNotificationDevice } = require('../dist/modules/notifications/notifications.js');
const { createApp } = require('../dist/app.js');

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test('payment attempts and settlement serialize retries, capture and balance enforcement', {
  skip: emulator ? false : 'Requires Firestore emulator',
}, async () => {
  assert.match(emulator, /^(localhost|127\.0\.0\.1):\d+$/);
  const db = getFirestore(getFirebaseAdminApp());
  const uid = randomUUID(), invoiceId = randomUUID();
  const invoice = db.collection('payables').doc(invoiceId);
  const user = db.collection('users').doc(uid);
  await user.set({ status: 'ACTIVE' });
  await invoice.create({ customerId: uid, amountPaise: 10000, currency: 'INR', status: 'CONFIRMED', isUnderActiveDispute: false });
  let calls = 0;
  const provider = {
    async createOrder(amount) { calls++; return { id: 'order_' + randomUUID().replaceAll('-', ''), amount, currency: 'INR' }; },
    async fetchPayment() { throw Error('Unexpected fetch'); },
  };
  const service = new PaymentService(db, provider);
  await assert.rejects(service.order('other', invoiceId, 'request'), { code: 'PAYMENT_NOT_ACCESSIBLE' });
  await assert.rejects(db.runTransaction(tx => enforceBookingBalance(db, tx, uid)), { code: 'OUTSTANDING_BALANCE' });
  const race = await Promise.allSettled([service.order(uid, invoiceId, 'request'), service.order(uid, invoiceId, 'request')]);
  assert.equal(calls, 1);
  const order = await service.order(uid, invoiceId, 'request');
  assert.equal(calls, 1);
  assert.ok(race.some(r => r.status === 'fulfilled'));
  assert.deepEqual(await service.order(uid, invoiceId, 'different'), order);
  const payment = { id: 'pay_test', order_id: order.orderId, amount: 10000, currency: 'INR', status: 'captured' };
  await assert.rejects(service.settle({ ...payment, amount: 200 }, randomUUID()), { code: 'PAYMENT_MISMATCH' });
  await Promise.all([service.settle(payment, 'event-' + invoiceId), service.settle(payment, 'event-' + invoiceId)]);
  await service.settle(payment, 'other-event-' + invoiceId);
  assert.equal((await invoice.collection('receipts').get()).size, 1);
  assert.equal((await invoice.get()).get('status'), 'CAPTURED');
  await db.runTransaction(tx => enforceBookingBalance(db, tx, uid));
  await assert.rejects(service.order(uid, invoiceId, 'request'), { code: 'PAYMENT_NOT_PAYABLE' });

  const uncertain = db.collection('payables').doc(randomUUID());
  await uncertain.set({ customerId: uid, amountPaise: 100, currency: 'INR', status: 'CONFIRMED', isUnderActiveDispute: false });
  let uncertainCalls = 0;
  const broken = new PaymentService(db, { ...provider, async createOrder() { uncertainCalls++; throw Error('timeout'); } });
  await assert.rejects(broken.order(uid, uncertain.id, 'request'), { code: 'PAYMENT_RECONCILIATION_REQUIRED' });
  await assert.rejects(broken.order(uid, uncertain.id, 'request'), { code: 'PAYMENT_RECONCILIATION_REQUIRED' });
  assert.equal(uncertainCalls, 1);
  const retryInvoice = db.collection('payables').doc(randomUUID());
  await retryInvoice.set({ customerId: uid, amountPaise: 200, currency: 'INR', status: 'CONFIRMED', isUnderActiveDispute: false });
  const first = await service.order(uid, retryInvoice.id, 'first');
  await service.settle({ ...payment, id: 'pay_failed', order_id: first.orderId, amount: 200, status: 'failed' }, 'failed-' + retryInvoice.id);
  assert.deepEqual(await service.order(uid, retryInvoice.id, 'first'), first);
  const second = await service.order(uid, retryInvoice.id, 'second');
  assert.deepEqual(second, first);
  // Legacy failed attempts may have lost their invoice lock before this change.
  await retryInvoice.collection('locks').doc('activeAttempt').delete();
  await db.collection('paymentAttempts').doc(first.attemptId).update({ state: 'FAILED' });
  assert.deepEqual(await service.order(uid, retryInvoice.id, 'legacy-retry'), first);
  assert.equal((await retryInvoice.collection('locks').doc('activeAttempt').get()).get('attemptId'), first.attemptId);
  await service.settle({ ...payment, id: 'pay_failed', order_id: first.orderId, amount: 200 }, 'late-' + retryInvoice.id);
  assert.equal((await retryInvoice.get()).get('status'), 'CAPTURED');

  // Once a lost request can be retried, it uses the original attempt's receipt
  // even if this browser has never seen the first request's idempotency key.
  const lostAttempt = (await db.collection('paymentAttempts').where('invoiceId', '==', uncertain.id).get()).docs[0];
  await lostAttempt.ref.update({ createLeaseUntil: 0 });
  const recovery = new PaymentService(db, {
    ...provider, async findOrders(receipt) { assert.equal(receipt, lostAttempt.id.slice(0, 40)); return []; },
    async createOrder(amount, receipt) {
      assert.equal(receipt, lostAttempt.id.slice(0, 40));
      return provider.createOrder(amount);
    },
  });
  const recovered = await recovery.reconcile(uid, uncertain.id, 'new-browser');
  assert.equal(recovered.attemptId, lostAttempt.id);
  assert.equal((await recovery.order(uid, uncertain.id, 'new-browser')).orderId, recovered.orderId);
});

test('checkout, status and signed Razorpay webhooks converge on one capture and receipt', {
  skip: emulator ? false : 'Requires Firestore emulator',
}, async t => {
  const admin = getFirebaseAdminApp(), db = getFirestore(admin);
  const customer = randomUUID(), other = randomUUID(), invoiceId = randomUUID();
  for (const uid of [customer, other]) await db.collection('users').doc(uid).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  const invoice = db.collection('payables').doc(invoiceId);
  await invoice.set({ customerId: customer, amountPaise: 500, currency: 'INR', status: 'CONFIRMED' });
  t.mock.method(getAuth(admin), 'verifyIdToken', async token => ({ uid: token }));
  t.mock.method(getAppCheck(admin), 'verifyToken', async () => ({ alreadyConsumed: false }));
  const env = { RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: 'fixture-key', RAZORPAY_WEBHOOK_SECRET: 'fixture-webhook' };
  const original = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const order = { id: 'order_' + randomUUID().replaceAll('-', ''), amount: 500, currency: 'INR' };
  const payment = { id: 'pay_fixture', order_id: order.id, amount: 500, currency: 'INR', status: 'authorized' };
  const fetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const p = new URL(url);
    if (p.hostname !== 'api.razorpay.com') return fetch(url, init);
    if (p.pathname === '/v1/orders') return Response.json(order);
    if (p.pathname === '/v1/orders/' + order.id + '/payments') return Response.json({ count: 1, items: [payment] });
    assert.equal(p.pathname, '/v1/payments/' + payment.id);
    return Response.json(payment);
  });
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/payments';
  const post = (route, body, uid = customer, headers = {}) => fetch(base + route, { method: 'POST',
    headers: { authorization: 'Bearer ' + uid, 'X-Firebase-AppCheck': 'fixture', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body) });
  assert.equal((await post('/status', { invoiceId }, other)).status, 404);
  assert.equal((await (await post('/status', { invoiceId })).json()).data.status, 'READY');
  const created = await post('/orders', { invoiceId }, customer, { 'Idempotency-Key': 'checkout-fixture' });
  assert.equal(created.status, 200);
  const { attemptId } = (await created.json()).data;
  const verification = { attemptId, razorpay_order_id: order.id, razorpay_payment_id: payment.id,
    razorpay_signature: createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(order.id + '|' + payment.id).digest('hex') };
  assert.equal((await (await post('/verify', verification)).json()).data.status, 'PENDING');
  assert.equal((await (await post('/status', { invoiceId })).json()).data.status, 'PENDING');
  assert.equal((await invoice.collection('receipts').get()).size, 0);
  const webhook = (event, eventId) => {
    const body = { event, payload: { payment: { entity: { id: payment.id, order_id: order.id } } } };
    return post('/webhooks/razorpay', body, customer, { 'X-Razorpay-Event-Id': eventId,
      'X-Razorpay-Signature': createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex') });
  };
  assert.equal((await webhook('payment.captured', 'capture')).status, 503);
  payment.status = 'failed';
  assert.equal((await webhook('payment.failed', 'failure')).status, 200);
  assert.equal((await (await post('/status', { invoiceId })).json()).data.status, 'FAILED');
  assert.equal((await (await post('/orders', { invoiceId }, customer, { 'Idempotency-Key': 'another-tab' })).json()).data.orderId, order.id);
  payment.status = 'captured';
  const responses = await Promise.all([webhook('payment.captured', 'capture'), webhook('payment.captured', 'capture'),
    webhook('payment.failed', 'failure'), post('/status', { invoiceId }), post('/verify', verification)]);
  for (const response of responses) assert.equal(response.status, 200);
  assert.equal((await invoice.get()).get('status'), 'CAPTURED');
  assert.equal((await invoice.collection('receipts').get()).size, 1);
  assert.equal((await db.collection('ledgerEntries').doc('capture-' + attemptId).get()).get('paymentId'), payment.id);
});

test('reports, SOS, suspension and push delivery preserve ownership and atomic audit facts', {
  skip: emulator ? false : 'Requires Firestore emulator',
}, async t => {
  const admin = getFirebaseAdminApp(), db = getFirestore(admin);
  const service = new SafetyService(db);
  const uid = randomUUID(), driver = randomUUID(), adminId = randomUUID(), tripId = randomUUID(), id = randomUUID();
  await db.collection('users').doc(uid).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  await db.collection('users').doc(adminId).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  await db.collection('trips').doc(tripId).set({ customerId: uid, driverId: driver, status: 'IN_PROGRESS' });
  await db.collection('safetyPolicies').doc('reports').set({ categories: ['TEST_APPROVED_CATEGORY'] });
  await assert.rejects(service.report('other', id, tripId, 'TEST_APPROVED_CATEGORY', 'test'), { code: 'TRIP_NOT_ACCESSIBLE' });
  await Promise.all([service.report(uid, id, tripId, 'TEST_APPROVED_CATEGORY', 'test'),
    service.report(uid, id, tripId, 'TEST_APPROVED_CATEGORY', 'test')]);
  await assert.rejects(service.resolveReport(uid, id, 'RESOLVED', 'reason'), { code: 'ROLE_FORBIDDEN' });
  await Promise.all([service.resolveReport(adminId, id, 'RESOLVED', 'reason'),
    service.resolveReport(adminId, id, 'RESOLVED', 'reason')]);
  assert.equal((await db.collection('adminAuditLogs').doc('report-' + id).get()).get('adminId'), adminId);
  const inbox = db.collection('users').doc(uid).collection('notifications').doc('report-' + id);
  assert.equal((await inbox.get()).get('pushStatus'), 'QUEUED');
  await deliverNotification(db, uid, inbox.id);
  assert.equal((await inbox.get()).get('pushStatus'), 'IN_APP_ONLY');
  await registerNotificationDevice(db, uid, 'fixture-token', 'CUSTOMER');
  const sender = t.mock.method(getMessaging(admin), 'sendEach', async () => ({
    responses: [{ success: true }], successCount: 1, failureCount: 0,
  }));
  await Promise.all([deliverNotification(db, uid, inbox.id), deliverNotification(db, uid, inbox.id)]);
  assert.equal(sender.mock.callCount(), 1);
  assert.equal((await inbox.get()).get('pushStatus'), 'SENT');
  const sos = randomUUID();
  await service.sos(uid, sos, tripId);
  await service.sos(uid, sos, tripId);
  assert.equal((await db.collection('sosEvents').doc(sos).get()).get('deliveryStatus'), 'SIMULATED');
  await service.cancelSos(uid, sos);
  await service.cancelSos(uid, sos);
  assert.equal((await db.collection('safetyAuditLogs').doc('sos-cancel-' + sos).get()).get('actor'), uid);
  await assert.rejects(service.sos('other', sos, tripId), { code: 'TRIP_NOT_ACCESSIBLE' });
  for (let i = 0; i < 5; i++) {
    const incident = db.collection('verifiedIncidents').doc(randomUUID());
    await incident.set({ uid, kind: 'CUSTOMER_CANCELLATION', verified: true, qualifies: true });
    await Promise.all([service.applyIncident(incident.id), service.applyIncident(incident.id)]);
  }
  assert.equal((await db.collection('users').doc(uid).get()).get('customerCancellationCount'), 5);
  assert.equal((await db.collection('users').doc(uid).get()).get('status'), 'SUSPENDED');
});

test('HTTP webhook verifies original bytes and report endpoints conceal unrelated reporters', {
  skip: emulator ? false : 'Requires Firestore emulator',
}, async t => {
  const admin = getFirebaseAdminApp(), db = getFirestore(admin);
  let uid = randomUUID();
  await db.collection('users').doc(uid).set({ roles: ['CUSTOMER'], status: 'ACTIVE' });
  t.mock.method(getAuth(admin), 'verifyIdToken', async () => ({ uid }));
  t.mock.method(getAppCheck(admin), 'verifyToken', async () => ({ alreadyConsumed: false }));
  process.env.RAZORPAY_WEBHOOK_SECRET = 'fixture-webhook-secret';
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const raw = '{ "event": "unused.event" }';
  const sig = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  const post = (body, signature) => fetch(base + '/payments/webhooks/razorpay', { method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Razorpay-Signature': signature }, body });
  assert.equal((await post(raw, sig)).status, 200);
  assert.equal((await post(raw + ' ', sig)).status, 400);
  const report = db.collection('reports').doc(randomUUID());
  await report.set({ reporterId: 'someone-else', description: 'private', status: 'OPEN' });
  const res = await fetch(base + '/reports/' + report.id, { headers: {
    authorization: 'Bearer fixture', 'X-Firebase-AppCheck': 'fixture',
  } });
  assert.equal(res.status, 404);
  assert.doesNotMatch(await res.text(), /private|someone-else/);
  const invalid = await fetch(base + '/sos', { method: 'POST', headers: {
    authorization: 'Bearer fixture', 'X-Firebase-AppCheck': 'fixture', 'Idempotency-Key': randomUUID(),
    'content-type': 'application/json',
  }, body: JSON.stringify({ tripId: '../private' }) });
  assert.equal(invalid.status, 400);
});
