const assert = require('node:assert/strict');
const { test } = require('node:test');
const { initializeApp, deleteApp, getApp } = require('firebase-admin/app');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { createApp } = require('../dist/app.js');

test('API factories reuse one default Firebase app alongside a named app', async () => {
  const named = initializeApp({ projectId: 'demo-other' }, 'other');
  delete process.env.FIREBASE_CONFIG;
  process.env.FIREBASE_PROJECT_ID = 'demo-veyro';
  createApp({ port: 4000, apiBasePath: '/api/v1', frontendOrigin: 'http://localhost:3000' });
  const app = getApp();
  try {
    assert.equal(app.options.projectId, 'demo-veyro');
    assert.equal(getFirebaseAdminApp(), app);
    assert.notEqual(app, named);
  } finally {
    await Promise.all([deleteApp(app), deleteApp(named)]);
  }
});

test('uses managed Firebase configuration when supplied', async () => {
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'demo-managed', storageBucket: 'demo-bucket' });
  const app = getFirebaseAdminApp();
  try {
    assert.equal(app.options.projectId, 'demo-managed');
    assert.equal(app.options.storageBucket, 'demo-bucket');
  } finally {
    await deleteApp(app);
    delete process.env.FIREBASE_CONFIG;
  }
});
