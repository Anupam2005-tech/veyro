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
  points: PlaceOption[];
  route: RoutePreview | null;
  onDragEnd?: (index: number, position: Coordinate) => void;
}

export interface MapHandle {
  destroy: () => void;
}

export interface MapsProvider {
  id: 'google' | 'demo';
  searchPlaces: (query: string) => Promise<PlaceOption[]>;
  reverseGeocode: (position: Coordinate) => Promise<string>;
  getRoute: (points: Coordinate[]) => Promise<RoutePreview>;
  createMap: (element: HTMLElement, options: MapRenderOptions) => Promise<MapHandle | null>;
}
