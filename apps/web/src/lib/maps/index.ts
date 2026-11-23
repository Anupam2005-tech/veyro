import { googleMapsApiKey, googleMapsMapId, isDemoDataMode } from '../env';
import { demoMapsProvider } from './demo-provider';
import { createGoogleMapsProvider } from './google-provider';
import type { MapsProvider } from './types';

let cachedProvider: MapsProvider | null = null;

export function getMapsProvider(): MapsProvider {
  if (!cachedProvider) {
    const unavailable = async (): Promise<never> => { throw new Error('Google Maps is not configured. Add the browser Maps key to use live maps.'); };
    cachedProvider = isDemoDataMode ? demoMapsProvider : googleMapsApiKey ? createGoogleMapsProvider(googleMapsApiKey, googleMapsMapId) : {
      id: 'google', searchPlaces: unavailable, reverseGeocode: unavailable, getRoute: unavailable, createMap: unavailable,
    };
  }
  return cachedProvider;
}

export type {
  Coordinate,
  MapHandle,
  MapRenderOptions,
  MapsProvider,
  PlaceOption,
  PlaceSuggestion,
  RoutePreview,
} from './types';
