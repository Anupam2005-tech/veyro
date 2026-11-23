import { AppError } from '../../shared/http/app-error.js';

export interface Point { lat: number; lng: number }
export function point(value: unknown): Point {
  if (!value || typeof value !== 'object') throw new AppError(400, 'INVALID_LOCATION', 'Coordinates are required.');
  const { lat, lng } = value as Point;
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new AppError(400, 'INVALID_LOCATION', 'Invalid coordinates.');
  }
  return { lat, lng };
}
export function distanceMetres(a: Point, b: Point) {
  const radians = Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * radians, deltaLng = (b.lng - a.lng) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export interface RoadRoute { distanceKm: number; durationMinutes: number; path?: Point[] }
export interface RoadProvider { route(points: Point[]): Promise<RoadRoute> }
export function googleRoadProvider(): RoadProvider {
  return { async route(points) {
    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) throw new AppError(503, 'ROUTING_UNAVAILABLE', 'Configure the server Routes API key.');
    const waypoint = (p: Point) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring' },
      body: JSON.stringify({ origin: waypoint(points[0]!), destination: waypoint(points[points.length - 1]!),
        intermediates: points.slice(1, -1).map(waypoint), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', polylineEncoding: 'GEO_JSON_LINESTRING' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AppError(503, 'ROUTING_UNAVAILABLE', 'Road routing is unavailable.');
    const body = await response.json() as { routes?: { distanceMeters?: number; duration?: string; polyline?: { geoJsonLinestring?: { coordinates?: unknown } } }[] };
    const route = body.routes?.[0], seconds = Number(route?.duration?.replace(/s$/, ''));
    if (!route || !Number.isFinite(route.distanceMeters) || route.distanceMeters! < 0 || !Number.isFinite(seconds) || seconds < 0) {
      throw new AppError(503, 'ROUTING_UNAVAILABLE', 'No valid road route was found.');
    }
    const coordinates = route.polyline?.geoJsonLinestring?.coordinates;
    let path: Point[] | undefined;
    if (Array.isArray(coordinates) && coordinates.length >= 2 && coordinates.length <= 10000) {
      path = coordinates.map(c => {
        if (!Array.isArray(c) || c.length < 2) throw new AppError(503, 'ROUTING_UNAVAILABLE', 'Invalid road geometry.');
        return point({ lat: c[1], lng: c[0] });
      });
    }
    return { distanceKm: route.distanceMeters! / 1000, durationMinutes: seconds / 60, ...(path ? { path } : {}) };
  } };
}
