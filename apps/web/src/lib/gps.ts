'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

export type GpsMode = 'device' | 'demo' | 'off';
type Pt = { lat: number; lng: number };

const MODE_KEY = 'veyro.gpsMode';
const SEND_EVERY_MS = 5000;
const DEMO_SPEED_MPS = 20;

function haversineM(a: Pt, b: Pt): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function step(from: Pt, to: Pt, meters: number): Pt {
  const d = haversineM(from, to);
  if (d <= meters || d < 1) return to;
  const f = meters / d;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}

export interface GpsTarget {
  /** Points to travel through, in order (pickup while en route; route polyline during the trip). */
  path: Pt[];
  key: string;
}

/**
 * Foreground driver GPS reporter (§5.10). "device" uses the browser's
 * geolocation; "demo" simulates movement toward the current target so the
 * demo works on a desktop. Samples go to POST /drivers/presence, which also
 * updates the active trip's live location. A PWA cannot report in the
 * background — the page must stay open.
 */
export function useDriverGps(start: Pt | null, target: GpsTarget | null) {
  const [mode, setModeState] = useState<GpsMode>('off');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [lastSent, setLastSent] = useState<{ at: number; lat: number; lng: number; accuracyM: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pos = useRef<Pt | null>(null);
  const pathIdx = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as GpsMode | null;
      setModeState(saved ?? (typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'device' : 'demo'));
    } catch {
      setModeState('demo');
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) setPermission('unavailable');
  }, []);

  useEffect(() => {
    pathIdx.current = 0;
  }, [target?.key]);

  useEffect(() => {
    if (!pos.current && start) pos.current = start;
  }, [start]);

  const setMode = (m: GpsMode) => {
    setModeState(m);
    setError(null);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  async function send(p: Pt, accuracyM: number, source: 'DEVICE' | 'DEMO', capturedAt: number) {
    try {
      await api('/drivers/presence', { body: { lat: p.lat, lng: p.lng, accuracyM, timestamp: new Date(capturedAt).toISOString(), source } });
      setLastSent({ at: capturedAt, lat: p.lat, lng: p.lng, accuracyM });
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    if (mode !== 'device') return;
    if (!('geolocation' in navigator)) {
      setPermission('unavailable');
      return;
    }
    let lastPost = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPermission('granted');
        const now = Date.now();
        pos.current = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (now - lastPost < SEND_EVERY_MS) return;
        lastPost = now;
        void send(pos.current, Math.min(999, p.coords.accuracy), 'DEVICE', p.timestamp || now);
      },
      (err) => {
        setPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        setError(err.code === err.PERMISSION_DENIED ? 'Location permission denied. Allow it in your browser, or switch to demo GPS.' : 'Could not get a GPS fix.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'demo') return;
    const tick = () => {
      let p = pos.current ?? start;
      if (!p) return;
      const t = targetRef.current;
      if (t && t.path.length) {
        let budget = (DEMO_SPEED_MPS * SEND_EVERY_MS) / 1000;
        while (budget > 0 && pathIdx.current < t.path.length) {
          const goal = t.path[pathIdx.current]!;
          const next = step(p, goal, budget);
          budget -= haversineM(p, next);
          p = next;
          if (next.lat === goal.lat && next.lng === goal.lng) pathIdx.current += 1;
          else break;
        }
      } else {
        p = { lat: p.lat + (Math.random() - 0.5) * 0.0004, lng: p.lng + (Math.random() - 0.5) * 0.0004 };
      }
      pos.current = p;
      void send(p, 8, 'DEMO', Date.now());
    };
    tick();
    const id = setInterval(tick, SEND_EVERY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, start?.lat, start?.lng]);

  return { mode, setMode, permission, lastSent, error };
}
