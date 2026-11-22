export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface RoutePreview {
  readonly distanceKm: number;
  readonly durationMin: number;
  readonly polyline: readonly LatLng[];
}

export interface DriverMarker extends LatLng {
  readonly driverId: string;
  readonly stale: boolean;
  readonly lastUpdatedAt: string;
}

/**
 * Shared Maps adapter boundary (FE-034).
 * Google Maps Platform remains the provider; this interface lets Team 1
 * build booking/trip screens against a stable contract while the browser
 * key, script loading, and quotas are configured once in deployment.
 * No key is bundled here — the Google loader reads
 * NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY at runtime.
 */
export interface MapsAdapter {
  readonly provider: 'google' | 'stub';
  geocode(address: string): Promise<readonly LatLng[]>;
  routePreview(origin: LatLng, destination: LatLng): Promise<RoutePreview>;
}

export function isValidLatLng(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

/** Offline-safe stub for tests, CI, and pre-key development. */
export function createStubMapsAdapter(): MapsAdapter {
  return {
    provider: 'stub',
    geocode: async () => [],
    routePreview: async (origin) => ({
      distanceKm: 0,
      durationMin: 0,
      polyline: [origin],
    }),
  };
}

export function googleMapsBrowserKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  return typeof key === 'string' && key.trim() ? key : null;
}
