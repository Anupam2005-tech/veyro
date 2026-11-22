import { googleMapsApiKey, googleMapsMapId } from '../env';
import { demoMapsProvider } from './demo-provider';
import { createGoogleMapsProvider } from './google-provider';
import type { MapsProvider } from './types';

let cachedProvider: MapsProvider | null = null;

export function getMapsProvider(): MapsProvider {
  if (!cachedProvider) {
    cachedProvider = googleMapsApiKey
      ? createGoogleMapsProvider(googleMapsApiKey, googleMapsMapId)
      : demoMapsProvider;
  }
  return cachedProvider;
}

export type {
  Coordinate,
  MapHandle,
  MapRenderOptions,
  MapsProvider,
  PlaceOption,
  RoutePreview,
} from './types';
