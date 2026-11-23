if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');

test('deny-all Firestore rules reject client reads and writes despite existing Admin data', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host, /^(localhost|127\.0\.0\.1):\d+$/);
  const app = getFirebaseAdminApp();
  const uid = randomUUID();
  await getFirestore(app).collection('users').doc(uid).set({ roles: ['ADMIN'], status: 'ACTIVE' });
  const url = 'http://' + host + '/v1/projects/demo-veyro-audit/databases/(default)/documents/users/' + uid;
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: 'ACTIVE' } } }) })).status, 403);
});

test('deny-all Storage rules reject client listing and document upload', {
  skip: !process.env.FIREBASE_STORAGE_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  assert.match(host, /^(localhost|127\.0\.0\.1):\d+$/);
  const url = 'http://' + host + '/v0/b/demo-veyro-audit.appspot.com/o';
  const list = await fetch(url);
  assert.equal(list.status, 403);
  const upload = await fetch(url + '?uploadType=media&name=private/test.txt', {
    method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'synthetic test',
  });
  assert.equal(upload.status, 403);
});

test('signed-in Firebase clients also cannot bypass backend-only Firestore and Storage access', {
  skip: !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.match(host, /^(localhost|127\.0\.0\.1):\d+$/);
  async function post(method, body) {
    const r = await fetch('http://' + host + '/identitytoolkit.googleapis.com/v1/accounts:' + method + '?key=demo',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(r.status, 200);
    return r.json();
  }
  const { sessionInfo } = await post('sendVerificationCode', { phoneNumber: '+16505550129' });
  const codes = await (await fetch('http://' + host + '/emulator/v1/projects/demo-veyro-audit/verificationCodes')).json();
  const { code } = codes.verificationCodes.find(row => row.sessionInfo === sessionInfo);
  const { idToken, localId } = await post('signInWithPhoneNumber', { sessionInfo, code });
  const headers = { authorization: 'Bearer ' + idToken };
  const doc = 'http://' + process.env.FIRESTORE_EMULATOR_HOST + '/v1/projects/demo-veyro-audit/databases/(default)/documents/users/' + localId;
  assert.equal((await fetch(doc, { headers })).status, 403);
  assert.equal((await fetch(doc, { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { role: { stringValue: 'ADMIN' } } }) })).status, 403);
  const storage = 'http://' + process.env.FIREBASE_STORAGE_EMULATOR_HOST + '/v0/b/demo-veyro-audit.appspot.com/o?uploadType=media&name=private/test.txt';
  assert.equal((await fetch(storage, { method: 'POST', headers: { ...headers, 'content-type': 'text/plain' }, body: 'fixture' })).status, 403);
});
