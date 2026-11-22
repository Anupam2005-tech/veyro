import { AppError } from '../../shared/http/app-error.js';

export const minute = 60_000;
const hour = 60 * minute;

export function scheduledWindow(createdAt: number, pickupAt: number) {
  const lead = pickupAt - createdAt;
  if (!Number.isSafeInteger(pickupAt) || lead < 4 * hour || lead > 30 * 24 * hour) {
    throw new AppError(422, 'INVALID_PICKUP_TIME', 'Choose a pickup between four hours and thirty days ahead.');
  }
  return { opensAt: Math.max(createdAt, pickupAt - 12 * hour), closesAt: pickupAt - 2 * hour };
}

export interface CancellationFacts {
  arrived: boolean;
  verifiedDriverNoShow: boolean;
}

export function cancellationFeeInr(kind: 'INSTANT' | 'SCHEDULED', role: 'CUSTOMER' | 'DRIVER',
  acceptedAt: number | null, now: number, facts: CancellationFacts) {
  if (kind === 'INSTANT' || role === 'DRIVER' || acceptedAt === null || facts.verifiedDriverNoShow) return 0;
  if (facts.arrived) return 100;
  return now - acceptedAt <= 5 * minute ? 0 : 50;
}
