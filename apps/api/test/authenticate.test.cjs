const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { getAuth } = require('firebase-admin/auth');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { authenticate } = require('../dist/middleware/authenticate.js');
const { errorHandler } = require('../dist/middleware/error-handler.js');
const { requestContext } = require('../dist/middleware/request-context.js');

async function protectedRoute(t) {
  const app = express();
  app.use(requestContext, express.json());
  app.post('/private', authenticate, (req, res) => res.json(req.auth));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return authorization => fetch('http://127.0.0.1:' + server.address().port + '/private?uid=other', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authorization && { authorization }) },
    body: JSON.stringify({ uid: 'other', role: 'ADMIN' }),
  });
}

test('authentication accepts only verified bearer identity and distinguishes verifier failures', async t => {
  const auth = getAuth(getFirebaseAdminApp());
  const verifier = t.mock.method(auth, 'verifyIdToken', async (token, checkRevoked) => {
    assert.equal(checkRevoked, true);
    if (token === 'valid') return { uid: 'verified', role: 'ADMIN' };
    throw Object.assign(new Error('private-provider-detail'), { code: 'auth/' + token });
  });
  const request = await protectedRoute(t);
  for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer a b', 'Bearer a,b']) {
    assert.equal((await request(header)).status, 401);
  }
  assert.equal(verifier.mock.callCount(), 0);
  for (const code of ['id-token-expired', 'id-token-revoked', 'invalid-id-token', 'user-disabled', 'user-not-found']) {
    const response = await request('Bearer ' + code);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    const failure = await response.json();
    assert.equal(failure.error.code, 'UNAUTHENTICATED');
    assert.equal(failure.meta.requestId, response.headers.get('x-request-id'));
    assert.doesNotMatch(JSON.stringify(failure), /private-provider-detail/);
  }
  const good = await request('bearer valid');
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), { uid: 'verified' });
  const unavailable = await request('Bearer internal-error');
  assert.equal(unavailable.status, 500);
  assert.equal((await unavailable.json()).error.code, 'INTERNAL_ERROR');
});

test('Auth emulator phone sign-in authenticates and disabling the user invalidates the same token', {
  skip: process.env.FIREBASE_AUTH_EMULATOR_HOST ? false : 'Requires the Firebase Auth emulator',
}, async t => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.match(host, /^(localhost|127\.0\.0\.1):\d+$/);
  const admin = getFirebaseAdminApp();
  const project = admin.options.projectId ?? process.env.GCLOUD_PROJECT;
  const phoneNumber = '+16505550123';
  async function post(method, body) {
    const response = await fetch('http://' + host + '/identitytoolkit.googleapis.com/v1/accounts:' + method + '?key=demo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const { sessionInfo } = await post('sendVerificationCode', { phoneNumber });
  const codes = await fetch('http://' + host + '/emulator/v1/projects/' + project + '/verificationCodes');
  const { verificationCodes } = await codes.json();
  const { code } = verificationCodes.find(entry => entry.sessionInfo === sessionInfo);
  const { idToken, localId } = await post('signInWithPhoneNumber', { sessionInfo, code });
  t.after(() => getAuth(admin).deleteUser(localId));
  const request = await protectedRoute(t);
  const good = await request('Bearer ' + idToken);
  assert.equal(good.status, 200);
  const identity = await good.json();
  assert.equal(identity.uid, localId);
  assert.ok(Number.isSafeInteger(identity.authTime) && identity.authTime > 0);
  await getAuth(admin).updateUser(localId, { disabled: true });
  assert.equal((await request('Bearer ' + idToken)).status, 401);
});
