const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { appendAdminAudit } = require('../dist/modules/audit/audit.service.js');

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

test('commits an audit entry with its state change and rolls back on duplicate IDs', {
  skip: emulatorHost ? false : 'Firestore emulator is not configured',
}, async () => {
  assert.match(emulatorHost, /^(localhost|127\.0\.0\.1):\d+$/, 'Expected a local Firestore emulator');
  const requireFunctions = createRequire(resolve(__dirname, '../../../functions/package.json'));
  const { deleteApp, initializeApp } = requireFunctions('firebase-admin/app');
  const { getFirestore } = requireFunctions('firebase-admin/firestore');
  const id = randomUUID();
  const app = initializeApp({ projectId: 'demo-veyro-audit' }, id);

  try {
    const firestore = getFirestore(app);
    const application = firestore.collection('driverApplications').doc(id);
    const audit = firestore.collection('adminAuditLogs').doc(id);
    const actor = { uid: 'test-admin', roles: ['ADMIN'] };
    const change = {
      action: 'APPROVE',
      entityType: 'driverApplication',
      entityId: id,
      before: 'PENDING_REVIEW',
      after: 'APPROVED',
      reason: 'Verified test documents',
    };

    await application.create({ status: change.before });
    await firestore.runTransaction(async (transaction) => {
      transaction.update(application, { status: change.after });
      appendAdminAudit(firestore, transaction, actor, id, change);
    });
    assert.equal((await application.get()).get('status'), 'APPROVED');
    const originalAudit = (await audit.get()).data();
    assert.equal(originalAudit.adminId, actor.uid);
    assert.equal(originalAudit.after, change.after);

    await assert.rejects(firestore.runTransaction(async (transaction) => {
      transaction.update(application, { status: 'REJECTED' });
      appendAdminAudit(firestore, transaction, actor, id, {
        ...change, action: 'REJECT', before: 'APPROVED', after: 'REJECTED',
      });
    }), { code: 6 });

    assert.equal((await application.get()).get('status'), 'APPROVED');
    assert.deepEqual((await audit.get()).data(), originalAudit);
  } finally {
    await deleteApp(app);
  }
});
