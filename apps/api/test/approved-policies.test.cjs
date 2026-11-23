if (process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_DATABASE_ID = '(default)';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseAdminApp } = require('../dist/config/firebase-admin.js');
const { bookingPolicyVersions } = require('../dist/config/approved-policies.js');
const { bookingChecks } = require('../dist/modules/bookings/booking-checks.js');
const { SafetyService } = require('../dist/modules/safety/safety-service.js');

test('owner-approved categories and cancellation reasons work without cloud policy seeding', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const db = getFirestore(getFirebaseAdminApp()), id = randomUUID(), uid = randomUUID();
  await db.collection('safetyPolicies').doc('reports').delete();
  await db.collection('cancellationPolicies').doc(bookingPolicyVersions.cancellationPolicyVersion).delete();
  await db.collection('trips').doc(id).set({ customerId: uid, driverId: randomUUID(), status: 'ARRIVED', arrivedAt: Date.now() });
  const service = new SafetyService(db);
  await service.report(uid, randomUUID(), id, 'SAFETY_CONCERN', 'Synthetic report');
  await assert.rejects(service.report(uid, randomUUID(), id, 'UNAPPROVED_REASON', 'Synthetic report'),
    { code: 'REPORT_CATEGORY_UNAVAILABLE' });
  const facts = await db.runTransaction(tx => bookingChecks(db).cancellationFacts(tx, id,
    bookingPolicyVersions.cancellationPolicyVersion, 'CUSTOMER', 'DRIVER_DELAYED'));
  assert.equal(facts.arrived, true);
  assert.equal(facts.verifiedDriverNoShow, false);
  await assert.rejects(db.runTransaction(tx => bookingChecks(db).cancellationFacts(tx, id,
    bookingPolicyVersions.cancellationPolicyVersion, 'CUSTOMER', 'UNAPPROVED_REASON')),
    { code: 'CANCELLATION_POLICY_PENDING' });
});
