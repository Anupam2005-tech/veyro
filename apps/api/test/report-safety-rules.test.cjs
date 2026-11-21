const assert = require('node:assert/strict');
const { test } = require('node:test');
const { canReadReport, prepareReportResolution } = require('../dist/modules/reports/report-access.js');
const { prepareSimulatedSos } = require('../dist/modules/sos/simulated-sos.js');
const { hasReachedSuspensionThreshold } = require('../dist/modules/admin/incident-threshold.js');

const reporter = { uid: 'customer-1', roles: ['CUSTOMER'] };
const reported = { uid: 'driver-1', roles: ['DRIVER'] };
const admin = { uid: 'admin-1', roles: ['ADMIN'] };

test('grants report detail only to the reporter and an Admin', () => {
  assert.equal(canReadReport(reporter, reporter.uid), true);
  assert.equal(canReadReport(admin, reporter.uid), true);
  assert.equal(canReadReport(reported, reporter.uid), false);
  assert.equal(canReadReport(null, reporter.uid), false);
});

test('requires Admin authorization and a note, then selects only the stored reporter', () => {
  assert.throws(() => prepareReportResolution(reported, reporter.uid, 'Resolved'), /authorization/);
  assert.throws(() => prepareReportResolution(admin, reporter.uid, ' '), /resolution note/);
  assert.deepEqual(prepareReportResolution(admin, reporter.uid, ' Resolved '), {
    resolutionNote: 'Resolved', notifyUserId: reporter.uid,
  });
});

test('prepares a demo-only event for the trip customer with no delivery attempts', () => {
  const trip = { tripId: 'trip-1', customerId: reporter.uid };
  assert.throws(() => prepareSimulatedSos(reported.uid, trip), /trip customer/);
  const event = prepareSimulatedSos(reporter.uid, trip);
  assert.equal(event.tripId, trip.tripId);
  assert.equal(event.externalAlertSent, false);
  assert.deepEqual(event.deliveryAttempts, []);
});

test('requires five distinct prequalified incident IDs', () => {
  assert.equal(hasReachedSuspensionThreshold(['a', 'b', 'c', 'd', 'd', ' ']), false);
  assert.equal(hasReachedSuspensionThreshold(['a', 'b', 'c', 'd', 'e']), true);
});
