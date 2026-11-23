import { POLICY } from '../../config/policy.js';

export type BookingType = 'INSTANT' | 'SCHEDULED';

export const INSTANT_OFFER_MS = POLICY.instantOfferMs;

/** §5.3 scheduled lead-time window: 4 hours to 30 days before pickup. */
export function assertScheduledLeadTime(pickupAt: Date, now = new Date()): void {
  const lead = pickupAt.getTime() - now.getTime();
  if (!Number.isFinite(lead)) throw new RangeError('Pickup time must be valid');
  if (lead < POLICY.scheduledMinLeadMs || lead > POLICY.scheduledMaxLeadMs) {
    throw new RangeError('Scheduled pickup must be between 4 hours and 30 days from now');
  }
}

/** §5.3 broadcast window: start = max(created, pickup − 12h), end = pickup − 2h. */
export function broadcastWindow(pickupAt: Date, createdAt: Date): { start: Date; end: Date } {
  const start = Math.max(createdAt.getTime(), pickupAt.getTime() - POLICY.broadcastStartBeforePickupMs);
  return { start: new Date(start), end: new Date(pickupAt.getTime() - POLICY.broadcastEndBeforePickupMs) };
}

/**
 * DEC-05 customer cancellation fee.
 * Instant: ₹0. Scheduled: ₹0 before acceptance or within 5 minutes of the
 * backend acceptance timestamp; ₹50 after that until driver arrival; ₹100 once
 * the driver has arrived. (Hours-before-pickup slabs are superseded.)
 */
export function cancellationFee(
  booking: { type: BookingType; acceptedAt: Date | null; arrivedAt: Date | null },
  now = new Date(),
  reason?: string,
): number {
  if (reason === 'DRIVER_NO_SHOW') return 0;
  if (booking.type === 'INSTANT') return POLICY.instantCancelFeeInr;
  if (!booking.acceptedAt) return 0;
  if (booking.arrivedAt) return POLICY.cancelAfterArrivalFeeInr;
  const minsSinceAccept = (now.getTime() - booking.acceptedAt.getTime()) / 60_000;
  if (minsSinceAccept <= POLICY.cancelFreeAfterAcceptMin) return 0;
  return POLICY.cancelBeforeArrivalFeeInr;
}

/** DEC-07 driver no-show deadline: promise (instant) or pickup (scheduled) + 20 minutes. */
export function driverNoShowDeadline(booking: {
  type: BookingType;
  pickupAt: Date;
  promisedArrivalAt: Date | null;
}): Date {
  const base = booking.type === 'INSTANT' && booking.promisedArrivalAt ? booking.promisedArrivalAt : booking.pickupAt;
  return new Date(base.getTime() + POLICY.driverArrivalGraceMin * 60_000);
}
