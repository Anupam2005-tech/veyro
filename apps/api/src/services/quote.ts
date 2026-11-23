import { POLICY } from '../config/policy.js';
import { createHourlyQuoteSnapshot } from '../modules/quotes/hourly-quote-snapshot.js';
import type { QuoteSnapshot, RouteSource } from '../store/types.js';

/** Immutable quote snapshot (§5.4) built on the hourly-quote service; no minimum fare. */
export function buildQuoteSnapshot(
  hourlyRateInr: number,
  route: { distanceKm: number; durationMin: number; source: RouteSource },
  quotedAt = new Date(),
): QuoteSnapshot {
  const snap = createHourlyQuoteSnapshot({
    hourlyRateInr,
    estimatedRouteKm: route.distanceKm,
    estimatedRouteMinutes: route.durationMin,
    waitingPolicyVersion: POLICY.versions.waiting,
    cancellationPolicyVersion: POLICY.versions.cancellation,
    platformFeeConfigVersion: POLICY.versions.platformFee,
    quotedAt,
  });
  return {
    ...snap,
    displayEstimatedFareInr: Math.round(snap.estimatedBaseFareInr) + POLICY.customerPlatformFeeInr,
    routeSource: route.source,
  };
}
