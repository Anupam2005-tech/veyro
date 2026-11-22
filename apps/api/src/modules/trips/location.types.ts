export interface LocationSample {
  readonly tripId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly timestamp: Date;
}

export interface ValidatedLocation {
  readonly tripId: string;
  readonly driverId: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly timestamp: Date;
  readonly stale: boolean;
}

export const LOCATION_STALE_CUTOFF_MS = 30_000;
export const LOCATION_FUTURE_TOLERANCE_MS = 5_000;
/** Reject samples worse than 1km accuracy as invalid. */
export const LOCATION_MAX_ACCURACY_M = 1_000;
/** Implausible jump threshold ~200 km/h. */
export const LOCATION_MAX_SPEED_MPS = 55.5;
