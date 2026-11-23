import type { Coordinate, MapsProvider, PlaceOption, PlaceSuggestion, RoutePreview, MapDriverMarker } from './types';

interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

interface GoogleBounds {
  extend: (point: GoogleLatLng) => void;
}

interface GoogleMapInstance {
  panTo?: (position: GoogleLatLng) => void;
  fitBounds: (bounds: GoogleBounds) => void;
}

interface GoogleOverlay {
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleEventListener {
  remove: () => void;
}

interface GooglePlace {
  displayName?: string;
  formattedAddress?: string;
  location?: GoogleLatLng;
  fetchFields: (request: { fields: string[] }) => Promise<unknown>;
}
interface GooglePrediction {
  placeId: string;
  text: { toString: () => string };
  toPlace: () => GooglePlace;
}

interface GoogleGeocodeResult {
  formatted_address: string;
  geometry: { location: GoogleLatLng };
}

interface GoogleMapsNamespace {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleOverlay;
    Polyline: new (options: Record<string, unknown>) => GoogleOverlay;
    LatLng: new (lat: number, lng: number) => GoogleLatLng;
    LatLngBounds: new () => GoogleBounds;
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
      AutocompleteSessionToken: new () => object;
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{ suggestions: { placePrediction?: GooglePrediction }[] }> };
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

function toLatLng(maps: GoogleMapsNamespace, position: Coordinate): GoogleLatLng {
  return new maps.maps.LatLng(position.lat, position.lng);
}

export function createGoogleMapsProvider(apiKey: string, mapId?: string): MapsProvider {
  async function getMaps(): Promise<GoogleMapsNamespace> {
    return loadGoogleMaps(apiKey);
  }

  let sessionToken: object | undefined;
  const predictionsById = new Map<string, GooglePrediction>();
  return {
    id: 'google',

    async searchPlaces(query: string, biasLocation?: Coordinate | null): Promise<PlaceSuggestion[]> {
      const normalized = query.trim();
      if (normalized.length < 2) return [];
      const maps = await getMaps();
      sessionToken ??= new maps.maps.places.AutocompleteSessionToken();
      const { suggestions } = await maps.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: normalized, sessionToken, includedRegionCodes: ['in'],
        ...(biasLocation ? { locationBias: { center: biasLocation, radius: 35000 } } : {}),
      });
      const predictions = suggestions.flatMap(s => s.placePrediction ? [s.placePrediction] : []).slice(0, 5);
      for (const p of predictions) predictionsById.set(p.placeId, p);
      return predictions.map(p => ({ id: p.placeId, label: p.text.toString(), address: p.text.toString() }));
    },
    async resolvePlace(suggestion: PlaceSuggestion): Promise<PlaceOption> {
      if (suggestion.position) return { ...suggestion, position: suggestion.position };
      const prediction = predictionsById.get(suggestion.id);
      if (!prediction) throw new Error('Search again to choose this place.');
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      if (!place.location) throw new Error('This place has no usable pickup coordinates.');
      sessionToken = undefined; predictionsById.clear();
      return { id: suggestion.id, label: place.displayName ?? suggestion.label, address: place.formattedAddress ?? suggestion.address,
        position: { lat: place.location.lat(), lng: place.location.lng() } };
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

    async getRoute(): Promise<RoutePreview> {
      throw new Error('Live road previews require the authenticated backend route service.');
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
          draggable: Boolean(options.onDragEnd),
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

      let driverOverlays: GoogleOverlay[] = [], centeredOnDriver = false;
      const updateDriverMarkers = (entries: MapDriverMarker[]) => {
        driverOverlays.forEach(marker => marker.setMap(null));
        driverOverlays = entries.map(entry => new maps.maps.Marker({ map, position: toLatLng(maps, entry.position),
          draggable: false, label: 'D', title: entry.label, opacity: entry.stale ? 0.45 : 1 }));
        if (!options.points.length && entries[0] && !centeredOnDriver) {
          map.panTo?.(toLatLng(maps, entries[0].position)); centeredOnDriver = true;
        }
      };
      updateDriverMarkers(options.driverMarkers ?? []);

      return {
        updateDriverMarkers,
        zoomIn() {
          const currentZoom = (map as unknown as { getZoom?: () => number }).getZoom?.() ?? 13;
          (map as unknown as { setZoom?: (z: number) => void }).setZoom?.(currentZoom + 1);
        },
        zoomOut() {
          const currentZoom = (map as unknown as { getZoom?: () => number }).getZoom?.() ?? 13;
          (map as unknown as { setZoom?: (z: number) => void }).setZoom?.(Math.max(1, currentZoom - 1));
        },
        destroy() {
          driverOverlays.forEach(marker => marker.setMap(null));
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
