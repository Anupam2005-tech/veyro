import type { Coordinate, MapsProvider, PlaceOption, RoutePreview } from './types';

const SAMPLE_PLACES: PlaceOption[] = [
  {
    id: 'demo-indiranagar',
    label: 'Indiranagar Metro Station',
    address: '100 Feet Road, Indiranagar, Bengaluru',
    position: { lat: 12.9719, lng: 77.6412 },
  },
  {
    id: 'demo-koramangala',
    label: 'Koramangala 5th Block',
    address: '80 Feet Road, Koramangala, Bengaluru',
    position: { lat: 12.9352, lng: 77.6245 },
  },
  {
    id: 'demo-mg-road',
    label: 'MG Road',
    address: 'Mahatma Gandhi Road, Bengaluru',
    position: { lat: 12.9758, lng: 77.6047 },
  },
  {
    id: 'demo-cubbon-park',
    label: 'Cubbon Park',
    address: 'Kasturba Road, Bengaluru',
    position: { lat: 12.9767, lng: 77.5929 },
  },
  {
    id: 'demo-hsr-layout',
    label: 'HSR Layout Sector 2',
    address: '27th Main Road, HSR Layout, Bengaluru',
    position: { lat: 12.9116, lng: 77.6389 },
  },
  {
    id: 'demo-whitefield',
    label: 'Whitefield',
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    position: { lat: 12.9698, lng: 77.75 },
  },
];

function haversineKm(from: Coordinate, to: Coordinate): number {
  const radiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const originLat = toRadians(from.lat);
  const targetLat = toRadians(to.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSyntheticRoadPath(points: Coordinate[]): {
  path: Coordinate[];
  distanceKm: number;
} {
  const path: Coordinate[] = [];
  let distanceKm = 0;

  points.forEach((point, index) => {
    if (index === 0) {
      path.push(point);
      return;
    }

    const previous = points[index - 1];
    const corner = { lat: previous.lat, lng: point.lng };
    const hasLatChange = Math.abs(previous.lat - point.lat) > 0.00001;
    const hasLngChange = Math.abs(previous.lng - point.lng) > 0.00001;

    if (hasLatChange || !hasLngChange) {
      path.push(corner);
      distanceKm += haversineKm(previous, corner);
    }

    path.push(point);
    distanceKm += hasLatChange || hasLngChange ? haversineKm(path[path.length - 2], point) : 0;
  });

  return { path, distanceKm: Math.max(0.4, distanceKm) };
}

function nearestPlace(position: Coordinate): PlaceOption {
  return SAMPLE_PLACES.reduce((closest, candidate) =>
    haversineKm(position, candidate.position) < haversineKm(position, closest.position)
      ? candidate
      : closest
  );
}

export const demoMapsProvider: MapsProvider = {
  id: 'demo',

  async searchPlaces(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return SAMPLE_PLACES.slice(0, 5);
    }

    return SAMPLE_PLACES.filter(
      (place) =>
        place.label.toLowerCase().includes(normalized) ||
        place.address.toLowerCase().includes(normalized)
    ).slice(0, 5);
  },

  async reverseGeocode(position: Coordinate) {
    const place = nearestPlace(position);
    return `${place.label}, ${place.address}`;
  },

  async getRoute(points: Coordinate[]): Promise<RoutePreview> {
    if (points.length < 2) {
      throw new Error('Add a pickup and destination before calculating a route.');
    }

    const { path, distanceKm } = buildSyntheticRoadPath(points);
    const durationMinutes = Math.max(4, Math.round((distanceKm / 24) * 60));

    return {
      provider: 'demo',
      routeId: `demo-route-${Date.now()}`,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes,
      path,
      summary: 'Demo road route for interface review',
      calculatedAt: new Date().toISOString(),
    };
  },

  async createMap() {
    return null;
  },
};
