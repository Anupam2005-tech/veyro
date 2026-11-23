import { haversineM } from '../modules/trips/location.service.js';
import type { Place, RouteSource } from '../store/types.js';

/**
 * Maps provider adapter (docs/veyro.md §5.10).
 * Google Maps Platform is the production provider once a key is provisioned
 * (DEC-12). Until then the API uses an offline gazetteer plus the public OSRM
 * road router; if routing is unreachable it falls back to a labelled estimate.
 */

export const GAZETTEER: readonly Place[] = [
  { label: 'Park Street, Kolkata', lat: 22.5526, lng: 88.3525 },
  { label: 'Howrah Station, Howrah', lat: 22.5839, lng: 88.3425 },
  { label: 'Sealdah Station, Kolkata', lat: 22.5675, lng: 88.3700 },
  { label: 'Esplanade, Kolkata', lat: 22.5646, lng: 88.3510 },
  { label: 'Victoria Memorial, Kolkata', lat: 22.5448, lng: 88.3426 },
  { label: 'Netaji Subhas Chandra Bose Airport (CCU)', lat: 22.6547, lng: 88.4467 },
  { label: 'Salt Lake Sector V, Kolkata', lat: 22.5726, lng: 88.4325 },
  { label: 'City Centre, Salt Lake', lat: 22.5880, lng: 88.4080 },
  { label: 'New Town Eco Park, Kolkata', lat: 22.6036, lng: 88.4675 },
  { label: 'Biswa Bangla Gate, New Town', lat: 22.5800, lng: 88.4600 },
  { label: 'Gariahat, Kolkata', lat: 22.5190, lng: 88.3660 },
  { label: 'Jadavpur University, Kolkata', lat: 22.4989, lng: 88.3714 },
  { label: 'South City Mall, Kolkata', lat: 22.5016, lng: 88.3617 },
  { label: 'Ballygunge Phari, Kolkata', lat: 22.5276, lng: 88.3653 },
  { label: 'Tollygunge Metro, Kolkata', lat: 22.4987, lng: 88.3460 },
  { label: 'Behala Chowrasta, Kolkata', lat: 22.4870, lng: 88.3120 },
  { label: 'Dakshineswar Kali Temple', lat: 22.6548, lng: 88.3575 },
  { label: 'Shyambazar Five Point Crossing', lat: 22.6012, lng: 88.3720 },
  { label: 'Dum Dum Metro, Kolkata', lat: 22.6213, lng: 88.3923 },
  { label: 'Science City, Kolkata', lat: 22.5392, lng: 88.3958 },
  { label: 'Ruby General Hospital, Kasba', lat: 22.5133, lng: 88.4020 },
  { label: 'Quest Mall, Ballygunge', lat: 22.5390, lng: 88.3655 },
  { label: 'New Market, Kolkata', lat: 22.5600, lng: 88.3520 },
  { label: 'Rajarhat Chowmatha, Kolkata', lat: 22.6200, lng: 88.4500 },
  { label: 'Garia Station, Kolkata', lat: 22.4640, lng: 88.3880 },
  { label: 'Alipore Zoo, Kolkata', lat: 22.5365, lng: 88.3310 },
  { label: 'Belur Math, Howrah', lat: 22.6324, lng: 88.3566 },
  { label: 'Kalighat Temple, Kolkata', lat: 22.5205, lng: 88.3424 },
];

export function isValidPoint(p: unknown): p is Place {
  const v = p as Place | null;
  return (
    !!v &&
    typeof v.label === 'string' &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng) &&
    v.lat >= -90 && v.lat <= 90 && v.lng >= -180 && v.lng <= 180
  );
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineM(a.lat, a.lng, b.lat, b.lng) / 1000;
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const local = GAZETTEER.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 6);
  if (local.length >= 3 || process.env.GEOCODER === 'offline') return [...local];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'veyro-local-dev/1.0', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [...local];
    const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const remote = rows
      .map((r) => ({ label: r.display_name.split(',').slice(0, 3).join(','), lat: Number(r.lat), lng: Number(r.lon) }))
      .filter(isValidPoint);
    return [...local, ...remote].slice(0, 8);
  } catch {
    return [...local];
  }
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  source: RouteSource;
}

const ROAD_FACTOR = 1.35;
const CITY_SPEED_KMH = 22;

function estimateRoute(points: readonly Place[]): RouteResult {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += distanceKm(points[i - 1]!, points[i]!);
  const roadKm = km * ROAD_FACTOR;
  return {
    distanceKm: Math.round(roadKm * 10) / 10,
    durationMin: Math.max(1, Math.round((roadKm / CITY_SPEED_KMH) * 60 + 3 * (points.length - 1))),
    polyline: points.map((p) => [p.lat, p.lng]),
    source: 'ESTIMATE',
  };
}

const routeCache = new Map<string, RouteResult>();

export async function routePreview(points: readonly Place[]): Promise<RouteResult> {
  if (points.length < 2) throw new RangeError('A route needs at least two points');
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
  const cached = routeCache.get(key);
  if (cached) return cached;
  if (process.env.ROUTING === 'offline') return estimateRoute(points);
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const base = process.env.OSRM_URL ?? 'https://router.project-osrm.org';
    const res = await fetch(`${base}/route/v1/driving/${coords}?overview=simplified&geometries=geojson`, {
      headers: { 'User-Agent': 'veyro-local-dev/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('route failed');
    const body = (await res.json()) as {
      code: string;
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    const route = body.routes?.[0];
    if (body.code !== 'Ok' || !route) throw new Error('no route');
    // OSRM's demo profile assumes free-flowing roads; scale for city traffic.
    const result: RouteResult = {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round((route.duration / 60) * 1.6)),
      polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: 'OSRM',
    };
    routeCache.set(key, result);
    return result;
  } catch {
    return estimateRoute(points);
  }
}
