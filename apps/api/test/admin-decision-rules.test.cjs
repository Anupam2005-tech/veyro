const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  prepareApplicationReview, prepareDriverControl, prepareCustomerRestore,
} = require('../dist/modules/admin/admin-decision-rules.js');

test('validates the three manual decisions for pending applications', () => {
  assert.equal(prepareApplicationReview('PENDING_REVIEW', 'APPROVE', ' Reviewed ').status, 'APPROVED');
  assert.equal(prepareApplicationReview('PENDING_REVIEW', 'REJECT', 'Document issue').status, 'REJECTED');
  assert.deepEqual(prepareApplicationReview('PENDING_REVIEW', 'REQUEST_CHANGES', 'Incomplete', [' New photo ']), {
    status: 'NEEDS_CHANGES', reviewReason: 'Incomplete', changes: ['New photo'],
  });
});

test('rejects stale decisions, blank reasons, and malformed change lists', () => {
  assert.throws(() => prepareApplicationReview('APPROVED', 'REJECT', 'Already reviewed'), /pending/);
  assert.throws(() => prepareApplicationReview('PENDING_REVIEW', 'APPROVE', ' '), /reason/);
  assert.throws(() => prepareApplicationReview('PENDING_REVIEW', 'UNKNOWN', 'Reviewed'), /Unsupported/);
  assert.throws(() => prepareApplicationReview('PENDING_REVIEW', 'REQUEST_CHANGES', 'Incomplete', []), /requested change/);
  assert.throws(() => prepareApplicationReview('PENDING_REVIEW', 'REQUEST_CHANGES', 'Incomplete', [' ']), /nonblank/);
});

test('deactivates and restores approval without changing independent suspension state', () => {
  assert.deepEqual(prepareDriverControl('APPROVED', 'DEACTIVATE', 'Document expired'), {
    approvalStatus: 'DEACTIVATED', auditReason: 'Document expired',
  });
  assert.deepEqual(prepareDriverControl('DEACTIVATED', 'RESTORE', 'Reviewed'), {
    approvalStatus: 'APPROVED', auditReason: 'Reviewed',
  });
  assert.throws(() => prepareDriverControl('PENDING_REVIEW', 'RESTORE', 'Reviewed'), /transition/);
});

test('restores a suspended customer with a reason and leaves incident history to storage', () => {
  assert.deepEqual(prepareCustomerRestore('SUSPENDED', ' Reinstated '), { status: 'ACTIVE', auditReason: 'Reinstated' });
  assert.throws(() => prepareCustomerRestore('ACTIVE', 'Reviewed'), /suspended/);
  assert.throws(() => prepareCustomerRestore('SUSPENDED', null), /reason/);
});
