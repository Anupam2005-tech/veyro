export type BookingType = 'INSTANT' | 'SCHEDULED';
export type BookingStatus =
  | 'DRAFT'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'CANCELLED'
  | 'NEEDS_REBOOK'
  | 'COMPLETED';

export interface Booking {
  readonly id: string;
  readonly customerUid: string;
  readonly driverUid: string | null;
  readonly type: BookingType;
  readonly status: BookingStatus;
  readonly pickupAt: Date;
  readonly offerExpiresAt: Date | null;
  readonly vehicleId: string;
}

export const INSTANT_OFFER_MS = 5 * 60 * 1000;

export function createBooking(input: {
  id: string;
  customerUid: string;
  type: BookingType;
  vehicleId: string;
  pickupAt: Date;
  now?: Date;
}): Booking {
  const nowMs = (input.now ?? new Date()).getTime();
  if (!input.id.trim() || !input.customerUid.trim() || !input.vehicleId.trim()) {
    throw new RangeError('Booking id, customer and vehicle are required');
  }
  const pickupMs = input.pickupAt.getTime();
  if (!Number.isFinite(pickupMs)) throw new RangeError('Pickup time must be valid');
  if (input.type === 'SCHEDULED') {
    const diffH = (pickupMs - nowMs) / 3_600_000;
    if (diffH < 4 || diffH > 30 * 24) throw new RangeError('Scheduled pickup must be 4h–30d ahead');
  }
  return {
    id: input.id.trim(),
    customerUid: input.customerUid.trim(),
    driverUid: null,
    type: input.type,
    status: 'OFFERED',
    pickupAt: new Date(pickupMs),
    offerExpiresAt:
      input.type === 'INSTANT' ? new Date(nowMs + INSTANT_OFFER_MS) : null,
    vehicleId: input.vehicleId.trim(),
  };
}

/** Atomic first-acceptance: only OFFERED bookings can be assigned once. */
export function acceptBooking(booking: Booking, driverUid: string, now = new Date()): Booking {
  if (booking.status !== 'OFFERED') throw new Error('Only offered bookings can be accepted');
  if (!driverUid.trim()) throw new RangeError('Driver is required');
  if (booking.offerExpiresAt && now.getTime() > booking.offerExpiresAt.getTime()) {
    throw new Error('Offer has expired');
  }
  return { ...booking, status: 'ASSIGNED', driverUid: driverUid.trim() };
}

export type CancelReason = 'CUSTOMER_REQUEST' | 'DRIVER_NO_SHOW' | 'NO_DRIVER' | 'OTHER';

/** DEC-05 slabs: scheduled >2h ₹0, 2h–30m ₹50, <30m ₹100; instant ₹0. */
export function cancellationFee(booking: Pick<Booking, 'type' | 'pickupAt'>, now = new Date()): number {
  if (booking.type === 'INSTANT') return 0;
  const mins = (booking.pickupAt.getTime() - now.getTime()) / 60_000;
  if (mins > 120) return 0;
  if (mins >= 30) return 50;
  return 100;
}
