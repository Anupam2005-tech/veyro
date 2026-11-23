import { haversineM } from '../modules/trips/location.service.js';
import { db, mutate, nowIso } from '../store/db.js';
import type { Driver, Presence } from '../store/types.js';
import { activeTripForDriver } from './domain.js';
import { sweep } from './engine.js';

/**
 * Local stand-in for Cloud Scheduler + a fleet of driver phones.
 *  - Runs the booking sweeper (offer expiry, scheduled broadcast, NEEDS_REBOOK).
 *  - Keeps seeded demo drivers' GPS fresh while no real device is reporting,
 *    and drives them along the route during trips. Samples are tagged DEMO.
 * Disable with SIMULATE_DRIVERS=false.
 */
const TICK_MS = 4000;
const DEVICE_GRACE_MS = 20_000;
const SPEED_MPS = 22; // ~80 km/h; well under the 200 km/h implausible-jump threshold

type Pt = { lat: number; lng: number };
const routeProgress = new Map<string, number>();

function moveToward(from: Pt, to: Pt, meters: number): { pos: Pt; reached: boolean } {
  const d = haversineM(from.lat, from.lng, to.lat, to.lng);
  if (d <= meters || d < 1) return { pos: { ...to }, reached: true };
  const f = meters / d;
  return { pos: { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f }, reached: false };
}

function followPolyline(key: string, pos: Pt, polyline: [number, number][], meters: number): Pt {
  let idx = routeProgress.get(key) ?? 0;
  let budget = meters;
  let current = pos;
  while (budget > 0 && idx < polyline.length) {
    const [lat, lng] = polyline[idx]!;
    const target = { lat, lng };
    const step = moveToward(current, target, budget);
    budget -= haversineM(current.lat, current.lng, step.pos.lat, step.pos.lng);
    current = step.pos;
    if (step.reached) idx += 1;
    else break;
  }
  routeProgress.set(key, idx);
  return current;
}

function presence(p: Pt): Presence {
  const now = nowIso();
  return { lat: p.lat, lng: p.lng, accuracyM: 8, capturedAt: now, receivedAt: now, source: 'DEMO' };
}

function tickDriver(driver: Driver): void {
  if (!driver.simulated || driver.approvalStatus !== 'APPROVED' || driver.isSuspended) return;
  if (driver.lastDevicePostAt && Date.now() - new Date(driver.lastDevicePostAt).getTime() < DEVICE_GRACE_MS) return;
  const data = db();
  const trip = activeTripForDriver(driver.id);
  const current: Pt = driver.presence ?? {
    lat: driver.serviceArea.lat + (Math.random() - 0.5) * 0.02,
    lng: driver.serviceArea.lng + (Math.random() - 0.5) * 0.02,
  };
  let next: Pt = current;
  const meters = (SPEED_MPS * TICK_MS) / 1000;
  if (trip) {
    const booking = data.bookings.find((b) => b.id === trip.bookingId);
    if (!booking) return;
    if (trip.status === 'DRIVER_EN_ROUTE') {
      next = moveToward(current, booking.pickup, meters).pos;
    } else if (trip.status === 'ARRIVED') {
      next = { lat: booking.pickup.lat, lng: booking.pickup.lng };
    } else if (trip.status === 'IN_PROGRESS') {
      next = followPolyline(trip.id, current, booking.routePolyline.length ? booking.routePolyline : [[booking.destination.lat, booking.destination.lng]], meters);
    }
    const p = presence(next);
    driver.presence = p;
    trip.location = p;
    return;
  }
  if (!driver.isOnline) return;
  // Idle: drift a little around the current spot, staying inside the service area.
  const drift = { lat: current.lat + (Math.random() - 0.5) * 0.0006, lng: current.lng + (Math.random() - 0.5) * 0.0006 };
  const fromBase = haversineM(drift.lat, drift.lng, driver.serviceArea.lat, driver.serviceArea.lng);
  driver.presence = presence(fromBase > 3000 ? moveToward(drift, driver.serviceArea, 200).pos : drift);
}

let timer: NodeJS.Timeout | null = null;

export function startBackgroundJobs(): void {
  if (timer) return;
  const simulate = process.env.SIMULATE_DRIVERS !== 'false';
  const run = () => {
    try {
      mutate((data) => {
        sweep(data);
        if (simulate) data.drivers.forEach(tickDriver);
      });
    } catch (e) {
      console.error('[Veyro API] background tick failed', e instanceof Error ? e.message : e);
    }
  };
  run();
  timer = setInterval(run, TICK_MS);
  timer.unref();
}

export function stopBackgroundJobs(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
