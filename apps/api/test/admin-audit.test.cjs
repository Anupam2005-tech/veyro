const assert = require('node:assert/strict');
const { test } = require('node:test');
const { appendAdminAudit } = require('../dist/modules/audit/audit.service.js');

const store = {
  collection: (path) => ({ doc: (id) => `${path}/${id}` }),
};
const actor = { uid: 'admin-1', roles: ['ADMIN'] };
const change = {
  action: 'APPROVE',
  entityType: 'driverApplication',
  entityId: 'application-1',
  before: 'PENDING_REVIEW',
  after: 'APPROVED',
  reason: '  Documents reviewed  ',
};

test('appends only the documented fields using verified identity and a server timestamp', () => {
  const writes = [];
  const transaction = { create: (reference, record) => writes.push({ reference, record }) };

  appendAdminAudit(store, transaction, actor, 'audit-1', {
    ...change,
    adminId: 'other-user',
    createdAt: new Date(0),
    documentContents: 'private',
  });

  assert.equal(writes.length, 1);
  const [{ reference, record }] = writes;
  const { createdAt, ...fields } = record;
  assert.equal(reference, 'adminAuditLogs/audit-1');
  assert.deepEqual(fields, { ...change, adminId: actor.uid, reason: 'Documents reviewed' });
  assert.ok(createdAt instanceof Date && createdAt.getTime() > 0);
});

test('rejects unauthorized, blank-reason, and invalid document ID attempts before writing', () => {
  const transaction = { create: () => assert.fail('No audit write expected') };

  assert.throws(() => appendAdminAudit(store, transaction, null, 'audit-1', change), /Admin authorization/);
  assert.throws(
    () => appendAdminAudit(store, transaction, { uid: 'driver-1', roles: ['DRIVER'] }, 'audit-1', change),
    /Admin authorization/,
  );
  assert.throws(
    () => appendAdminAudit(store, transaction, { uid: 'driver-1', roles: 'SUPERADMIN' }, 'audit-1', change),
    /Admin authorization/,
  );
  assert.throws(
    () => appendAdminAudit(store, transaction, actor, 'audit-1', { ...change, reason: ' ' }),
    /audit reason/,
  );
  assert.throws(() => appendAdminAudit(store, transaction, actor, 'nested/id', change), /document ID/);
});

test('propagates a create collision so the caller can abort its transaction', () => {
  const collision = new Error('Audit document already exists');
  const transaction = {
    create(reference) {
      assert.equal(reference, 'adminAuditLogs/audit-1');
      throw collision;
    },
  };

  assert.throws(() => appendAdminAudit(store, transaction, actor, 'audit-1', change), collision);
});

test('rejects profile or document snapshots passed as audit state before writing', () => {
  const transaction = { create: () => assert.fail('No audit write expected') };
  const snapshot = { status: 'PENDING_REVIEW', documents: ['synthetic-document'] };

  for (const state of [{ before: snapshot }, { after: snapshot }]) {
    assert.throws(
      () => appendAdminAudit(store, transaction, actor, 'audit-1', { ...change, ...state }),
      /Audit state must be a status string or null/,
    );
  }
});
