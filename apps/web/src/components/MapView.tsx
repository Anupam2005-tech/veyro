'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import { cx } from './ui';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: 'pickup' | 'destination' | 'stop' | 'driver' | 'driver-stale' | 'area';
  label?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  polyline?: [number, number][];
  circle?: { lat: number; lng: number; radiusKm: number } | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  /** Change this key to refit the view (e.g. when the route changes). */
  fitKey?: string;
  ariaLabel?: string;
}

const DEFAULT_CENTER: [number, number] = [22.5726, 88.3639]; // Kolkata

const STYLES: Record<MapMarker['kind'], { bg: string; fg: string; text: string; size: number }> = {
  pickup: { bg: '#0F766E', fg: '#FFFFFF', text: 'A', size: 28 },
  destination: { bg: '#111827', fg: '#FFFFFF', text: 'B', size: 28 },
  stop: { bg: '#FFFFFF', fg: '#111827', text: '•', size: 22 },
  driver: { bg: '#2563EB', fg: '#FFFFFF', text: '', size: 18 },
  'driver-stale': { bg: '#9CA3AF', fg: '#FFFFFF', text: '', size: 18 },
  area: { bg: '#6B7280', fg: '#FFFFFF', text: '◎', size: 22 },
};

/**
 * Map display (OpenStreetMap tiles via Leaflet). Markers use plain HTML so
 * they render without image assets. The map is never the only way to set a
 * location — PlaceInput provides the accessible text alternative.
 */
export function MapView({ markers = [], polyline, circle, onPick, className, fitKey, ariaLabel = 'Map' }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const lastFit = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = lib;
      const m = lib.map(el.current, { zoomControl: true, attributionControl: true }).setView(DEFAULT_CENTER, 12);
      lib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(m);
      layer.current = lib.layerGroup().addTo(m);
      m.on('click', (e: Leaflet.LeafletMouseEvent) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const lib = L.current;
    const m = map.current;
    const group = layer.current;
    if (!lib || !m || !group) return;
    group.clearLayers();
    const bounds: [number, number][] = [];
    if (circle) {
      lib.circle([circle.lat, circle.lng], { radius: circle.radiusKm * 1000, color: '#0F766E', weight: 1, fillOpacity: 0.06 }).addTo(group);
    }
    if (polyline && polyline.length > 1) {
      lib.polyline(polyline, { color: '#FFFFFF', weight: 8, opacity: 0.9 }).addTo(group);
      lib.polyline(polyline, { color: '#0F766E', weight: 5, opacity: 1 }).addTo(group);
      bounds.push(...polyline);
    }
    for (const mk of markers) {
      if (!Number.isFinite(mk.lat) || !Number.isFinite(mk.lng)) continue;
      const s = STYLES[mk.kind];
      const icon = lib.divIcon({
        className: '',
        iconSize: [s.size, s.size],
        iconAnchor: [s.size / 2, s.size / 2],
        html: `<div style="width:${s.size}px;height:${s.size}px;border-radius:999px;background:${s.bg};color:${s.fg};display:flex;align-items:center;justify-content:center;font:700 13px Inter,sans-serif;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${s.text}</div>`,
      });
      const marker = lib.marker([mk.lat, mk.lng], { icon, keyboard: false, title: mk.label ?? mk.kind });
      if (mk.label) marker.bindTooltip(mk.label);
      marker.addTo(group);
      bounds.push([mk.lat, mk.lng]);
    }
    if (fitKey !== lastFit.current && bounds.length) {
      lastFit.current = fitKey;
      if (bounds.length === 1) m.setView(bounds[0]!, 14);
      else m.fitBounds(lib.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
    }
  }

  useEffect(draw);

  return (
    <div
      ref={el}
      role="region"
      aria-label={ariaLabel}
      className={cx('relative z-0 h-72 w-full overflow-hidden rounded-xl border border-studio-border bg-studio-tint', className)}
    />
  );
}
