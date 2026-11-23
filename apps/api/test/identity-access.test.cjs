if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getAppCheck } = require('firebase-admin/app-check');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { createApp } = require('../dist/app.js');
const { requireRole } = require('../dist/middleware/require-role.js');
const { errorHandler } = require('../dist/middleware/error-handler.js');

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

const enabled = process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
test('production session bootstrap, App Check consumption and Firestore role checks', {
  skip: enabled ? false : 'Requires local Auth and Firestore emulators',
}, async t => {
  for (const host of [process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST]) {
    assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  }
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  });
  const admin = getFirebaseAdminApp();
  const uid = randomUUID();
  const auth = getAuth(admin);
  const profile = getFirestore(admin).collection('users').doc(uid);
  await auth.createUser({ uid, displayName: 'Test Driver' });
  t.after(() => Promise.all([auth.deleteUser(uid), profile.delete()]));
  t.mock.method(auth, 'verifyIdToken', async () => ({ uid }));
  const used = new Set();
  const check = t.mock.method(getAppCheck(admin), 'verifyToken', async (token, options) => {
    assert.deepEqual(options, { consume: true });
    if (token.startsWith('err-')) throw Object.assign(new Error('provider detail'), { code: token.slice(4) });
    const alreadyConsumed = used.has(token);
    used.add(token);
    return { alreadyConsumed };
  });
  const base = await serve(t, createApp({
    port: 4000, apiBasePath: '/api/v1', frontendOrigin: 'https://app.example',
  }));
  const session = (body, token) => fetch(base + '/api/v1/auth/session', { method: 'POST', headers: {
    authorization: 'Bearer verified', 'content-type': 'application/json', ...(token && { 'X-Firebase-AppCheck': token }),
  }, body: JSON.stringify(body) });
  for (const token of [null, 'err-app-check/invalid-argument', 'err-app-check/app-check-token-expired']) {
    const res = await session({}, token);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'APP_CHECK_FAILED');
  }
  assert.equal(check.mock.callCount(), 2);
  assert.equal((await session({}, 'err-app-check/permission-denied')).status, 500);
  assert.equal((await session({ roleIntent: 'admin' }, randomUUID())).status, 400);
  assert.equal((await profile.get()).exists, false);
  const body = { roleIntent: 'driver', uid: 'other', roles: ['ADMIN'], onboardingComplete: true };
  const responses = await Promise.all([session(body, 'single-use'), session(body, randomUUID())]);
  for (const res of responses) assert.equal(res.status, 200);
  const [first, retry] = await Promise.all(responses.map(res => res.json()));
  assert.deepEqual(first.data, retry.data);
  assert.equal(first.data.uid, uid);
  assert.deepEqual(first.data.roles, ['DRIVER']);
  assert.equal(first.data.onboardingComplete, false);
  assert.equal((await session({}, 'single-use')).status, 403);

  const app = express();
  app.get('/admin', requireRole('ADMIN'), (_req, res) => res.end());
  app.use((req, _res, next) => { req.auth = { uid }; next(); });
  app.get('/customer', requireRole('CUSTOMER'), (_req, res) => res.end());
  app.get('/driver', requireRole('DRIVER'), (_req, res) => res.end());
  app.use(errorHandler);
  const routes = await serve(t, app);
  assert.equal((await fetch(routes + '/admin')).status, 401);
  assert.equal((await fetch(routes + '/customer')).status, 403);
  assert.equal((await fetch(routes + '/driver')).status, 200);

  await profile.update({ roles: ['CUSTOMER', 'DRIVER'], onboardingComplete: true });
  await auth.updateUser(uid, { email: 'fixture@example.test' });
  const switched = await (await session({ roleIntent: 'customer' }, randomUUID())).json();
  assert.equal(switched.data.role, 'CUSTOMER');
  assert.equal(switched.data.onboardingComplete, true);
  assert.equal((await profile.get()).get('email'), 'fixture@example.test');
  assert.equal((await fetch(routes + '/customer')).status, 200);
  await profile.set({ role: 'CUSTOMER', status: 'ACTIVE' });
  assert.equal((await fetch(routes + '/customer')).status, 200);
  await profile.update({ status: 'SUSPENDED' });
  assert.equal((await fetch(routes + '/customer')).status, 403);
  assert.equal((await session({}, randomUUID())).status, 403);
  assert.equal((await profile.get()).get('status'), 'SUSPENDED');
});
