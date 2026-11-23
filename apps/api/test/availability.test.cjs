const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  canSetOnline,
  evaluateOfferEligibility,
  isPresenceFresh,
  parseAvailabilityStatus,
} = require('../dist/modules/availability/availability.service.js');

const now = new Date('2026-11-22T10:00:00Z');
const fresh = new Date(now.getTime() - 10_000);
const stale = new Date(now.getTime() - 31_000);

const approved = { approvalStatus: 'APPROVED', isSuspended: false };

function signals(overrides = {}) {
  return {
    hasLocationPermission: true,
    lastLocationAt: fresh,
    hasActiveTrip: false,
    serviceAreaIncludesPickup: true,
    supportsVehicle: true,
    meetsLeadTime: true,
    ...overrides,
  };
}

test('allows ONLINE only for approved, non-suspended drivers', () => {
  assert.deepEqual(canSetOnline(approved), { allowed: true });
  assert.deepEqual(canSetOnline({ approvalStatus: 'PENDING_REVIEW', isSuspended: false }), {
    allowed: false,
    reason: 'NOT_APPROVED',
  });
  assert.deepEqual(canSetOnline({ approvalStatus: 'APPROVED', isSuspended: true }), {
    allowed: false,
    reason: 'ACCOUNT_SUSPENDED',
  });
  assert.deepEqual(canSetOnline({ approvalStatus: 'DEACTIVATED', isSuspended: false }), {
    allowed: false,
    reason: 'NOT_APPROVED',
  });
});

test('treats missing permission, missing/invalid/future/stale samples as not fresh', () => {
  assert.equal(isPresenceFresh(signals(), now), true);
  assert.equal(isPresenceFresh(signals({ hasLocationPermission: false }), now), false);
  assert.equal(isPresenceFresh(signals({ lastLocationAt: null }), now), false);
  assert.equal(isPresenceFresh(signals({ lastLocationAt: stale }), now), false);
  assert.equal(
    isPresenceFresh(signals({ lastLocationAt: new Date(now.getTime() + 60_000) }), now),
    false,
  );
  assert.throws(() => isPresenceFresh(signals(), new Date(NaN)), /Reference time/);
});

test('marks eligible only when account, freshness, trip, area, vehicle and lead-time all pass', () => {
  assert.deepEqual(evaluateOfferEligibility(approved, signals(), 'ONLINE', now), {
    eligible: true,
    reasons: [],
  });
  const blocked = evaluateOfferEligibility(
    approved,
    signals({ lastLocationAt: stale, hasActiveTrip: true }),
    'ONLINE',
    now,
  );
  assert.equal(blocked.eligible, false);
  assert.ok(blocked.reasons.includes('LOCATION_STALE'));
  assert.ok(blocked.reasons.includes('ACTIVE_TRIP_CONFLICT'));
});

test('OFFLINE request is never offer-eligible but still reports account blocks', () => {
  assert.deepEqual(evaluateOfferEligibility(approved, signals(), 'OFFLINE', now), {
    eligible: false,
    reasons: [],
  });
  const pending = { approvalStatus: 'PENDING_REVIEW', isSuspended: false };
  const result = evaluateOfferEligibility(pending, signals(), 'OFFLINE', now);
  assert.deepEqual(result.reasons, ['NOT_APPROVED']);
});

test('parses only ONLINE/OFFLINE and rejects anything else', () => {
  assert.equal(parseAvailabilityStatus('ONLINE'), 'ONLINE');
  assert.equal(parseAvailabilityStatus('OFFLINE'), 'OFFLINE');
  assert.throws(() => parseAvailabilityStatus('online'), /ONLINE or OFFLINE/);
  assert.throws(() => parseAvailabilityStatus(''), /ONLINE or OFFLINE/);
});
