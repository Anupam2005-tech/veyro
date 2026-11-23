export interface Coordinate {
  lat: number;
  lng: number;
}

export interface PlaceOption {
  id: string;
  label: string;
  address: string;
  position: Coordinate;
}
export interface PlaceSuggestion { id: string; label: string; address: string; position?: Coordinate }

export interface RoutePreview {
  provider: 'google' | 'demo';
  routeId: string;
  distanceKm: number;
  durationMinutes: number;
  path: Coordinate[];
  summary: string;
  calculatedAt: string;
}

export interface MapRenderOptions {
  driverMarkers?: MapDriverMarker[];
  points: PlaceOption[];
  route: RoutePreview | null;
  onDragEnd?: (index: number, position: Coordinate) => void;
}

export interface MapHandle {
  updateDriverMarkers?: (markers: MapDriverMarker[]) => void;
  destroy: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
}

export interface MapDriverMarker { id: string; position: Coordinate; label: string; stale?: boolean }

export interface MapsProvider {
  id: 'google' | 'demo';
  searchPlaces: (query: string, biasLocation?: Coordinate | null) => Promise<PlaceSuggestion[]>;
  resolvePlace?: (suggestion: PlaceSuggestion) => Promise<PlaceOption>;
  reverseGeocode: (position: Coordinate) => Promise<string>;
  getRoute: (points: Coordinate[]) => Promise<RoutePreview>;
  createMap: (element: HTMLElement, options: MapRenderOptions) => Promise<MapHandle | null>;
}
