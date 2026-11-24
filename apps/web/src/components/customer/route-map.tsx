'use client';

import * as React from 'react';
import { AlertTriangle, LoaderCircle, MapPin, Navigation, Route as RouteIcon } from 'lucide-react';
import { getMapsProvider } from '@/lib/maps';
import type { Coordinate, MapHandle, PlaceOption, RoutePreview } from '@/lib/maps';
import type { MapDriverMarker } from '@/lib/maps/types';

export interface RouteMapProps {
  className?: string;
  points: PlaceOption[];
  route: RoutePreview | null;
  loading?: boolean;
  error?: string | null;
  driverMarkers?: MapDriverMarker[];
  showDriverMarkers?: boolean;
  onPinMove?: (index: number, position: Coordinate) => void;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;
const PADDING = 64;

function boundsFor(points: Coordinate[]) {
  if (points.length === 0) {
    return { minLat: 12.9, maxLat: 13.05, minLng: 77.5, maxLng: 77.8 };
  }
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpread = Math.max(maxLat - minLat, 0.012);
  const lngSpread = Math.max(maxLng - minLng, 0.012);
  return {
    minLat: minLat - latSpread * 0.2,
    maxLat: maxLat + latSpread * 0.2,
    minLng: minLng - lngSpread * 0.2,
    maxLng: maxLng + lngSpread * 0.2,
  };
}

export default function RouteMap({
  className,
  points,
  route,
  loading = false,
  error = null,
  driverMarkers = [],
  showDriverMarkers = false,
  onPinMove,
}: RouteMapProps) {
  const provider = React.useMemo(() => getMapsProvider(), []);
  const googleContainerRef = React.useRef<HTMLDivElement | null>(null);
  const svgContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [mapReady, setMapReady] = React.useState(false);
  const gridId = React.useId();
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [dragPosition, setDragPosition] = React.useState<Coordinate | null>(null);
  const mapHandleRef = React.useRef<MapHandle | null>(null);
  const markerRef = React.useRef(driverMarkers); markerRef.current = showDriverMarkers ? driverMarkers : [];
  const markerKey = JSON.stringify(markerRef.current);
  const pointsRef = React.useRef(points); pointsRef.current = points;
  const routeRef = React.useRef(route); routeRef.current = route;
  const routeKey = JSON.stringify(route?.path ?? []);
  const [svgZoom, setSvgZoom] = React.useState(1);

  const pointsKey = React.useMemo(
    () => points.map((point) => `${point.position.lat},${point.position.lng}:${point.label}`).join('|'),
    [points]
  );

  React.useEffect(() => {
    if (provider.id !== 'google' || mapError || !googleContainerRef.current) {
      return;
    }

    let disposed = false;
    setMapReady(false);

    provider
      .createMap(googleContainerRef.current, {
        points: pointsRef.current,
        route: routeRef.current,
        driverMarkers: markerRef.current,
        onDragEnd: onPinMove,
        onReady: () => { if (!disposed) setMapReady(true); },
        onUnavailable: message => { if (!disposed) setMapError(message); },
      })
      .then((nextHandle) => {
        if (disposed) {
          nextHandle?.destroy();
          return;
        }
        if (!nextHandle) {
          setMapError('Google Maps could not start. Showing route preview.');
          return;
        }
        mapHandleRef.current = nextHandle;
        nextHandle.updateDriverMarkers?.(markerRef.current);
      })
      .catch((caught: unknown) => {
        if (!disposed) {
          setMapError(caught instanceof Error ? caught.message : 'Google Maps could not be loaded.');
        }
      });

    return () => {
      disposed = true;
      mapHandleRef.current?.destroy();
      mapHandleRef.current = null;
    };
  }, [mapError, onPinMove, pointsKey, provider, routeKey]);

  React.useEffect(() => { mapHandleRef.current?.updateDriverMarkers?.(markerRef.current); }, [markerKey]);

  const handleZoomIn = React.useCallback(() => {
    if (mapHandleRef.current?.zoomIn) {
      mapHandleRef.current.zoomIn();
    } else {
      setSvgZoom((prev) => Math.min(prev + 0.25, 2.5));
    }
  }, []);

  const handleZoomOut = React.useCallback(() => {
    if (mapHandleRef.current?.zoomOut) {
      mapHandleRef.current.zoomOut();
    } else {
      setSvgZoom((prev) => Math.max(prev - 0.25, 0.75));
    }
  }, []);

  const allPositions = React.useMemo(() => {
    const positions = points.map((point) => point.position);
    if (route?.path.length) {
      positions.push(...route.path);
    }
    if (showDriverMarkers) {
      positions.push(...driverMarkers.map((marker) => marker.position));
    }
    return positions;
  }, [driverMarkers, points, route, showDriverMarkers]);

  const bounds = React.useMemo(() => boundsFor(allPositions), [allPositions]);

  const project = React.useCallback(
    (position: Coordinate) => {
      const lngRange = bounds.maxLng - bounds.minLng;
      const latRange = bounds.maxLat - bounds.minLat;
      return {
        x: PADDING + ((position.lng - bounds.minLng) / lngRange) * (MAP_WIDTH - PADDING * 2),
        y: MAP_HEIGHT - PADDING - ((position.lat - bounds.minLat) / latRange) * (MAP_HEIGHT - PADDING * 2),
      };
    },
    [bounds]
  );

  const projectedPath = route?.path.map(project) ?? [];
  const polyline = projectedPath.length
    ? projectedPath.map((point) => `${point.x},${point.y}`).join(' ')
    : '';

  function handlePointerMove(event: React.PointerEvent<SVGGElement>) {
    if (draggingIndex === null || !svgContainerRef.current) {
      return;
    }
    const rect = svgContainerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
    const lngRange = bounds.maxLng - bounds.minLng;
    const latRange = bounds.maxLat - bounds.minLat;
    const position = {
      lng: bounds.minLng + ((x - PADDING) / (MAP_WIDTH - PADDING * 2)) * lngRange,
      lat: bounds.minLat + ((MAP_HEIGHT - PADDING - y) / (MAP_HEIGHT - PADDING * 2)) * latRange,
    };
    setDragPosition(position);
  }

  function handlePointerUp() {
    if (draggingIndex !== null && dragPosition) {
      onPinMove?.(draggingIndex, dragPosition);
    }
    setDraggingIndex(null);
    setDragPosition(null);
  }

  function handlePinKeyDown(
    event: React.KeyboardEvent<SVGGElement>,
    index: number,
    position: Coordinate
  ) {
    const directions: Record<string, { lat: number; lng: number }> = {
      ArrowUp: { lat: 1, lng: 0 },
      ArrowDown: { lat: -1, lng: 0 },
      ArrowLeft: { lat: 0, lng: -1 },
      ArrowRight: { lat: 0, lng: 1 },
    };
    const direction = directions[event.key];
    if (!direction || !onPinMove) {
      return;
    }

    event.preventDefault();
    const factor = event.shiftKey ? 0.01 : 0.002;
    onPinMove(index, {
      lat: position.lat + direction.lat * (bounds.maxLat - bounds.minLat) * factor,
      lng: position.lng + direction.lng * (bounds.maxLng - bounds.minLng) * factor,
    });
  }

  const useGoogleMap = provider.id === 'google' && !mapError;
  const showPreview = !useGoogleMap || !mapReady;

  return (
    <section className={`relative min-h-[300px] overflow-hidden bg-[#e9eef5] ${className ?? 'h-[420px] rounded-card border border-studio-border lg:min-h-[520px]'}`}>
      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
        {route ? (
          <span className="inline-flex items-center gap-1.5 rounded-control border border-studio-border bg-white px-3 py-1.5 text-xs font-semibold text-studio-ink">
            <RouteIcon aria-hidden="true" className="h-3.5 w-3.5 text-studio-ink" />
            {route.distanceKm} km · {route.durationMinutes} min
          </span>
        ) : null}
      </div>

      {useGoogleMap ? (
        <div ref={googleContainerRef} className={`absolute inset-0 ${mapReady ? '' : 'pointer-events-none opacity-0'}`}
          aria-hidden={!mapReady} aria-label="Route map" />
      ) : null}
      {showPreview ? (
        <div ref={svgContainerRef} className="absolute inset-0 overflow-hidden">
          <p className="sr-only">
            Pickup and destination pins can be moved with the arrow keys when focused.
          </p>
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="h-full w-full"
            style={{ transform: `scale(${svgZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
            role="group"
            aria-label={route ? 'Preview of the selected road route' : 'Pickup and destination map'}
          >
            <defs>
              <pattern id={gridId} width="72" height="72" patternUnits="userSpaceOnUse">
                <path d="M 72 0 L 0 0 0 72" fill="none" stroke="#d8dfeb" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#e9eef5" />
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={`url(#${gridId})`} />
            {provider.id === 'demo' ? <>
            <path
              d="M -20 430 C 180 380 260 470 430 410 S 760 330 1020 390"
              fill="none"
              stroke="#cbd5e4"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d="M 210 -20 C 250 150 190 300 300 620"
              fill="none"
              stroke="#d6ddea"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <path
              d="M 760 -20 C 700 160 820 300 730 620"
              fill="none"
              stroke="#d6ddea"
              strokeWidth="22"
              strokeLinecap="round"
            />
            </> : null}
            {polyline ? (
              <>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#090b10"
                  strokeOpacity="0.15"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#B8F23A"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="veyro-route-line"
                />
              </>
            ) : null}
            {showDriverMarkers
              ? driverMarkers.map((marker) => {
                  const point = project(marker.position);
                  return (
                    <g key={marker.id} transform={`translate(${point.x} ${point.y})`}>
                      {marker.vehicle ? <image href="/icons/driver-car.png" x="-20" y="-20" width="40" height="40" opacity={marker.stale ? 0.5 : 1} /> : <>
                        <circle r="14" fill={marker.stale ? '#64748b' : '#090b10'} />
                        <circle r="5" fill="#ffffff" />
                      </>}
                      <title>{marker.label}</title>
                    </g>
                  );
                })
              : null}
            {points.map((point, index) => {
              const position =
                draggingIndex === index && dragPosition ? dragPosition : point.position;
              const projected = project(position);
              const isPickup = index === 0;
              const isDestination = index === points.length - 1;
              return (
                <g
                  key={point.id}
                  transform={`translate(${projected.x} ${projected.y})`}
                  onPointerDown={(event) => {
                    if (!onPinMove) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDraggingIndex(index);
                    setDragPosition(point.position);
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onKeyDown={(event) => handlePinKeyDown(event, index, point.position)}
                  role={onPinMove ? 'button' : undefined}
                  tabIndex={onPinMove ? 0 : undefined}
                  style={onPinMove ? { cursor: 'grab', touchAction: 'none' } : undefined}
                  aria-label={onPinMove ? `${point.label}. Use arrow keys to adjust position.` : undefined}
                >
                  <circle r="22" fill="#090b10" fillOpacity="0.12" />
                  <circle
                    r="15"
                    fill={isPickup ? '#B8F23A' : isDestination ? '#090B10' : '#FF2E93'}
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                  <text
                    textAnchor="middle"
                    dy="5"
                    fill={isDestination ? '#ffffff' : '#090B10'}
                    fontSize="14"
                    fontWeight="700"
                  >
                    {index === 0 ? 'A' : isDestination ? 'B' : index}
                  </text>
                  <title>{point.label}</title>
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}

      {mapError ? (
        <p role="status" className="absolute bottom-4 left-4 right-20 z-10 w-fit rounded-panel bg-white px-3 py-2 text-xs text-studio-ink">
          {mapError}
        </p>
      ) : null}

      {loading ? (
        <div className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-control border border-studio-border bg-white px-3 py-2 text-xs font-semibold text-studio-ink">
          <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
          Calculating road route…
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-x-4 bottom-4 z-10 flex items-center gap-2 rounded-panel border border-red-300 bg-white p-3 text-xs font-semibold text-red-700">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Floating Zoom Controls: + for zoom in, - for zoom out */}
      <div
        className="absolute right-4 bottom-6 sm:bottom-16 z-20 flex flex-col items-center overflow-hidden rounded-2xl border border-[#DCD8CC] bg-white/95 shadow-md shadow-black/5 backdrop-blur-md"
        role="group"
        aria-label="Map zoom controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in (+)"
          className="flex h-10 w-10 items-center justify-center text-lg font-bold text-[#090B10] transition-colors hover:bg-[#FAF9F5] active:bg-[#F4F1EA] select-none"
        >
          +
        </button>
        <div className="h-px w-6 bg-[#EAE7DC]" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out (-)"
          className="flex h-10 w-10 items-center justify-center text-xl font-bold text-[#090B10] transition-colors hover:bg-[#FAF9F5] active:bg-[#F4F1EA] select-none"
        >
          −
        </button>
      </div>

      {onPinMove && !mapError ? <div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden flex-col items-end gap-1 text-[10px] font-medium text-studio-muted sm:flex">
        <span className="inline-flex items-center gap-1 rounded-control border border-studio-border bg-white/90 px-2.5 py-1">
          <MapPin aria-hidden="true" className="h-3 w-3" /> Drag pins to adjust
        </span>
        <span className="inline-flex items-center gap-1 rounded-control border border-studio-border bg-white/90 px-2.5 py-1">
          <Navigation aria-hidden="true" className="h-3 w-3" /> Route recalculates after 400ms
        </span>
      </div> : null}
    </section>
  );
}
