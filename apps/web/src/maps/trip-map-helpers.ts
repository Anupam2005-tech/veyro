export const TRIP_STALE_CUTOFF_MS = 30_000;

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

/**
 * FE-027 / FE-036 helpers: stale GPS display + permission/reconnect states.
 * Stale markers freeze with an exact `last updated` time — never animated as live.
 * No background tracking is promised from the PWA.
 */
export function isTripLocationStale(
  lastUpdatedAt: Date | string | null,
  nowMs: number = Date.now(),
): boolean {
  if (lastUpdatedAt === null) {
    return true;
  }
  const ms =
    lastUpdatedAt instanceof Date
      ? lastUpdatedAt.getTime()
      : Date.parse(lastUpdatedAt);
  if (!Number.isFinite(ms)) {
    return true;
  }
  return nowMs - ms > TRIP_STALE_CUTOFF_MS;
}

export function formatLastUpdated(
  lastUpdatedAt: Date | string | null,
): string {
  if (lastUpdatedAt === null) {
    return 'Location unavailable';
  }
  const ms =
    lastUpdatedAt instanceof Date
      ? lastUpdatedAt.getTime()
      : Date.parse(lastUpdatedAt);
  if (!Number.isFinite(ms)) {
    return 'Location unavailable';
  }
  return `Last updated at ${new Date(ms).toLocaleTimeString()}`;
}

export function describePermission(state: PermissionState): string {
  switch (state) {
    case 'granted':
      return 'Location on';
    case 'denied':
      return 'Location is blocked. Allow location access to go online.';
    case 'prompt':
      return 'Location permission needed';
    case 'unavailable':
      return 'Location unavailable on this device';
  }
}
