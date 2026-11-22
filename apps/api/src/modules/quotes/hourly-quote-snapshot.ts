import { estimateHourlyBaseFare } from './hourly-fare.js';

interface HourlyQuoteInput {
  hourlyRateInr: number;
  estimatedRouteKm: number;
  estimatedRouteMinutes: number;
  waitingPolicyVersion: string;
  cancellationPolicyVersion: string;
  platformFeeConfigVersion: string;
  quotedAt: Date;
}

export function createHourlyQuoteSnapshot(input: HourlyQuoteInput) {
  const {
    hourlyRateInr, estimatedRouteKm, estimatedRouteMinutes, waitingPolicyVersion,
    cancellationPolicyVersion, platformFeeConfigVersion, quotedAt,
  } = input;
  if (!Number.isFinite(estimatedRouteKm) || estimatedRouteKm < 0) {
    throw new RangeError('Estimated route distance must be finite and non-negative');
  }
  if ([waitingPolicyVersion, cancellationPolicyVersion, platformFeeConfigVersion].some(
    (version) => typeof version !== 'string' || !version.trim(),
  )) {
    throw new Error('Quote policy versions are required');
  }

  const pricing_mode = 'HOURLY' as const;
  const { baseFareInr } = estimateHourlyBaseFare({ pricing_mode, hourlyRateInr }, estimatedRouteMinutes);
  return Object.freeze({
    pricing_mode,
    hourlyRateInr,
    estimatedRouteKm,
    estimatedRouteMinutes,
    estimatedBaseFareInr: baseFareInr,
    waitingPolicyVersion,
    cancellationPolicyVersion,
    platformFeeConfigVersion,
    quotedAt: quotedAt.toISOString(),
  });
}
