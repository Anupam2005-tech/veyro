import {
  LOCATION_FUTURE_TOLERANCE_MS,
  LOCATION_MAX_ACCURACY_M,
  LOCATION_MAX_SPEED_MPS,
  LOCATION_STALE_CUTOFF_MS,
  type LocationSample,
  type ValidatedLocation,
} from './location.types.js';

function requireId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new RangeError(`${name} must be a non-empty path-safe string`);
  }
  return value.trim();
}

export function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const earthM = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * earthM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Validates a driver-submitted GPS sample.
 * Firestore (Team 2) remains authoritative for whether the trip is active
 * and who is assigned; the caller must pass the verified assignment.
 * Returns the sample with a stale flag — stale is display state, not rejection.
 */
export function validateLocationSample(
  sample: LocationSample,
  now: Date = new Date(),
): ValidatedLocation {
  const tripId = requireId(sample.tripId, 'Trip ID');
  const driverId = requireId(sample.driverId, 'Driver ID');

  const { lat, lng, accuracyM, timestamp } = sample;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError('Latitude must be between -90 and 90');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new RangeError('Longitude must be between -180 and 180');
  }
  if (
    !Number.isFinite(accuracyM) ||
    accuracyM < 0 ||
    accuracyM > LOCATION_MAX_ACCURACY_M
  ) {
    throw new RangeError(
      `Accuracy must be between 0 and ${LOCATION_MAX_ACCURACY_M}m`,
    );
  }
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
    throw new RangeError('Timestamp must be a valid date');
  }
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || Number.isNaN(nowMs)) {
    throw new RangeError('Reference time must be a valid date');
  }
  if (timestamp.getTime() - nowMs > LOCATION_FUTURE_TOLERANCE_MS) {
    throw new RangeError('Timestamp must not be in the future');
  }

  const stale = nowMs - timestamp.getTime() > LOCATION_STALE_CUTOFF_MS;
  return { tripId, driverId, lat, lng, accuracyM, timestamp, stale };
}

/** Throws when the caller is not the Firestore-verified assigned driver. */
export function assertAssignedDriver(
  assignedDriverId: string,
  callerDriverId: string,
): void {
  const expected = requireId(assignedDriverId, 'Assigned driver');
  const caller = requireId(callerDriverId, 'Caller driver');
  if (expected !== caller) {
    throw new Error('Only the assigned driver may publish location');
  }
}

/** True when implied speed between two valid samples exceeds the threshold. */
export function isImplausibleJump(
  prev: Pick<LocationSample, 'lat' | 'lng' | 'timestamp'>,
  next: Pick<LocationSample, 'lat' | 'lng' | 'timestamp'>,
  maxSpeedMps: number = LOCATION_MAX_SPEED_MPS,
): boolean {
  const dtMs = next.timestamp.getTime() - prev.timestamp.getTime();
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return true;
  }
  const distM = haversineM(prev.lat, prev.lng, next.lat, next.lng);
  return distM / (dtMs / 1000) > maxSpeedMps;
}

/** RTDB path for the latest accepted active-trip sample (server Admin SDK write only). */
export function buildRtdbLocationPath(tripId: string): string {
  return `trips/${requireId(tripId, 'Trip ID')}/location`;
}

export function buildRtdbPresencePath(driverId: string): string {
  return `drivers/${requireId(driverId, 'Driver ID')}/presence`;
}
