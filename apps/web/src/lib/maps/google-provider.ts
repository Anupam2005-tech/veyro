import type { Coordinate, MapsProvider, PlaceOption, RoutePreview } from './types';

interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

interface GoogleBounds {
  extend: (point: GoogleLatLng) => void;
}

interface GoogleMapInstance {
  fitBounds: (bounds: GoogleBounds) => void;
}

interface GoogleOverlay {
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleEventListener {
  remove: () => void;
}

interface GooglePrediction {
  description: string;
  place_id: string;
}

interface GooglePlaceDetails {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: GoogleLatLng } | null;
}

interface GoogleGeocodeResult {
  formatted_address: string;
  geometry: { location: GoogleLatLng };
}

interface GoogleDirectionsRoute {
  legs: Array<{ distance: { value: number }; duration: { value: number } }>;
  overview_polyline?: { points?: string };
}

interface GoogleMapsNamespace {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleOverlay;
    Polyline: new (options: Record<string, unknown>) => GoogleOverlay;
    LatLng: new (lat: number, lng: number) => GoogleLatLng;
    LatLngBounds: new () => GoogleBounds;
    DirectionsService: new () => {
      route: (
        request: {
          origin: GoogleLatLng;
          destination: GoogleLatLng;
          waypoints: Array<{ location: GoogleLatLng }>;
          travelMode: string;
        },
        callback: (result: { routes: GoogleDirectionsRoute[] } | null, status: string) => void
      ) => void;
    };
    Geocoder: new () => {
      geocode: (
        request: { location: GoogleLatLng },
        callback: (results: GoogleGeocodeResult[] | null, status: string) => void
      ) => void;
    };
    event: {
      addListener: (
        instance: unknown,
        eventName: string,
        handler: (...args: unknown[]) => void
      ) => GoogleEventListener;
      clearInstanceListeners: (instance: unknown) => void;
    };
    places: {
      AutocompleteService: new () => {
        getPlacePredictions: (
          request: { input: string; componentRestrictions: { country: string } },
          callback: (predictions: GooglePrediction[] | null, status: string) => void
        ) => void;
      };
      PlacesService: new (element: HTMLElement) => {
        getDetails: (
          request: { placeId: string; fields: string[] },
          callback: (place: GooglePlaceDetails | null, status: string) => void
        ) => void;
      };
    };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __veyroGoogleMapsLoader?: Promise<GoogleMapsNamespace>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!window.__veyroGoogleMapsLoader) {
    window.__veyroGoogleMapsLoader = new Promise<GoogleMapsNamespace>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
      script.async = true;
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google);
          return;
        }
        delete window.__veyroGoogleMapsLoader;
        reject(new Error('Google Maps loaded without exposing the maps API.'));
      };
      script.onerror = () => {
        delete window.__veyroGoogleMapsLoader;
        reject(new Error('Google Maps could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  return window.__veyroGoogleMapsLoader;
}

function decodePolyline(encoded: string): Coordinate[] {
  const path: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result += (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result += (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    path.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return path;
}

function toLatLng(maps: GoogleMapsNamespace, position: Coordinate): GoogleLatLng {
  return new maps.maps.LatLng(position.lat, position.lng);
}

export function createGoogleMapsProvider(apiKey: string, mapId?: string): MapsProvider {
  async function getMaps(): Promise<GoogleMapsNamespace> {
    return loadGoogleMaps(apiKey);
  }

  return {
    id: 'google',

    async searchPlaces(query: string): Promise<PlaceOption[]> {
      const normalized = query.trim();
      if (!normalized) {
        return [];
      }

      const maps = await getMaps();
      const service = new maps.maps.places.AutocompleteService();
      const predictions = await new Promise<GooglePrediction[]>((resolve, reject) => {
        service.getPlacePredictions(
          { input: normalized, componentRestrictions: { country: 'IN' } },
          (result, status) => {
            if (status !== 'OK' || !result) {
              reject(new Error('Place lookup failed.'));
              return;
            }
            resolve(result);
          }
        );
      });

      const detailsService = new maps.maps.places.PlacesService(document.createElement('div'));
      const options = await Promise.all(
        predictions.slice(0, 5).map(
          (prediction) =>
            new Promise<PlaceOption | null>((resolve) => {
              detailsService.getDetails(
                { placeId: prediction.place_id, fields: ['name', 'formatted_address', 'geometry'] },
                (place, status) => {
                  const position = place?.geometry?.location;
                  if (status !== 'OK' || !position) {
                    resolve(null);
                    return;
                  }
                  resolve({
                    id: prediction.place_id,
                    label: place.name ?? prediction.description,
                    address: place.formatted_address ?? prediction.description,
                    position: { lat: position.lat(), lng: position.lng() },
                  });
                }
              );
            })
        )
      );

      return options.filter((option): option is PlaceOption => option !== null);
    },

    async reverseGeocode(position: Coordinate): Promise<string> {
      const maps = await getMaps();
      const geocoder = new maps.maps.Geocoder();
      return new Promise<string>((resolve, reject) => {
        geocoder.geocode({ location: toLatLng(maps, position) }, (results, status) => {
          if (status !== 'OK' || !results?.length) {
            reject(new Error('Reverse geocoding failed.'));
            return;
          }
          resolve(results[0].formatted_address);
        });
      });
    },

    async getRoute(points: Coordinate[]): Promise<RoutePreview> {
      if (points.length < 2) {
        throw new Error('Add a pickup and destination before calculating a route.');
      }

      const maps = await getMaps();
      const service = new maps.maps.DirectionsService();
      const result = await new Promise<GoogleDirectionsRoute>((resolve, reject) => {
        service.route(
          {
            origin: toLatLng(maps, points[0]),
            destination: toLatLng(maps, points[points.length - 1]),
            waypoints: points.slice(1, -1).map((point) => ({ location: toLatLng(maps, point) })),
            travelMode: 'DRIVING',
          },
          (directions, status) => {
            if (status !== 'OK' || !directions?.routes.length) {
              reject(new Error('No road route was found for these locations.'));
              return;
            }
            resolve(directions.routes[0]);
          }
        );
      });

      const distanceMeters = result.legs.reduce((total, leg) => total + leg.distance.value, 0);
      const durationSeconds = result.legs.reduce((total, leg) => total + leg.duration.value, 0);
      const encodedPath = result.overview_polyline?.points;

      return {
        provider: 'google',
        routeId: `google-route-${Date.now()}`,
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        path: encodedPath ? decodePolyline(encodedPath) : points,
        summary: 'Google road route',
        calculatedAt: new Date().toISOString(),
      };
    },

    async createMap(element: HTMLElement, options) {
      const maps = await getMaps();
      const center = options.points[0]
        ? toLatLng(maps, options.points[0].position)
        : new maps.maps.LatLng(12.9716, 77.5946);
      const map = new maps.maps.Map(element, {
        center,
        zoom: 13,
        mapId: mapId || undefined,
        streetViewControl: false,
        fullscreenControl: false,
      });
      const bounds = new maps.maps.LatLngBounds();
      const listeners: GoogleEventListener[] = [];

      const markers = options.points.map((point, index) => {
        const position = toLatLng(maps, point.position);
        bounds.extend(position);
        const marker = new maps.maps.Marker({
          map,
          position,
          draggable: true,
          label: index === 0 ? 'A' : index === options.points.length - 1 ? 'B' : String(index),
          title: point.label,
        });

        if (options.onDragEnd) {
          listeners.push(
            maps.maps.event.addListener(marker, 'dragend', () => {
              const moved = marker as unknown as { getPosition: () => GoogleLatLng };
              const latLng = moved.getPosition();
              options.onDragEnd?.(index, { lat: latLng.lat(), lng: latLng.lng() });
            })
          );
        }

        return marker;
      });

      let polyline: GoogleOverlay | null = null;
      if (options.route?.path.length) {
        polyline = new maps.maps.Polyline({
          map,
          path: options.route.path.map((point) => toLatLng(maps, point)),
          geodesic: true,
          strokeColor: '#B8F23A',
          strokeOpacity: 0.95,
          strokeWeight: 5,
        });
      }

      if (options.points.length > 1) {
        map.fitBounds(bounds);
      }

      return {
        destroy() {
          listeners.forEach((listener) => listener.remove());
          markers.forEach((marker) => {
            maps.maps.event.clearInstanceListeners(marker);
            marker.setMap(null);
          });
          polyline?.setMap(null);
        },
      };
    },
  };
}
