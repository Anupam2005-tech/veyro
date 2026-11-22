const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  validateLocationSample,
  assertAssignedDriver,
  isImplausibleJump,
  buildRtdbLocationPath,
} = require('../dist/modules/trips/location.service.js');

const now = new Date('2026-11-22T10:00:00Z');
const base = {
  tripId: 'trip_1',
  driverId: 'drv_1',
  lat: 12.9716,
  lng: 77.5946,
  accuracyM: 12,
  timestamp: new Date(now.getTime() - 5_000),
};

test('accepts a valid sample and flags staleness', () => {
  const fresh = validateLocationSample(base, now);
  assert.equal(fresh.stale, false);
  const stale = validateLocationSample(
    { ...base, timestamp: new Date(now.getTime() - 31_000) },
    now,
  );
  assert.equal(stale.stale, true);
});

test('rejects bad coords, accuracy, future timestamps and unknown trip/driver', () => {
  assert.throws(() => validateLocationSample({ ...base, lat: 91 }, now), /Latitude/);
  assert.throws(() => validateLocationSample({ ...base, lng: 200 }, now), /Longitude/);
  assert.throws(() => validateLocationSample({ ...base, accuracyM: -1 }, now), /Accuracy/);
  assert.throws(
    () => validateLocationSample({ ...base, timestamp: new Date(now.getTime() + 60_000) }, now),
    /future/,
  );
  assert.throws(() => validateLocationSample({ ...base, tripId: '' }, now), /Trip ID/);
});

test('enforces assigned-driver writes and detects implausible jumps', () => {
  assert.throws(() => assertAssignedDriver('drv_1', 'drv_2'), /assigned driver/);
  assert.doesNotThrow(() => assertAssignedDriver('drv_1', 'drv_1'));
  const prev = { lat: 12.9716, lng: 77.5946, timestamp: now };
  const jump = { lat: 13.9716, lng: 78.5946, timestamp: new Date(now.getTime() + 1_000) };
  const walk = { lat: 12.9717, lng: 77.5947, timestamp: new Date(now.getTime() + 10_000) };
  assert.equal(isImplausibleJump(prev, jump), true);
  assert.equal(isImplausibleJump(prev, walk), false);
  assert.equal(buildRtdbLocationPath('trip_1'), 'trips/trip_1/location');
});
