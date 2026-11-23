export type TripStatus =
  | 'ARRIVING'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Trip {
  readonly id: string;
  readonly bookingId: string;
  readonly driverUid: string;
  readonly status: TripStatus;
  readonly waitStartedAt: Date | null;
}

/** DEC-06: 15 min free, 30 min max, ₹50 wait fee, ₹150 no-show (replaces wait fee). */
export const WAIT_FREE_MIN = 15;
export const WAIT_MAX_MIN = 30;
export const WAIT_FEE_INR = 50;
export const NO_SHOW_FEE_INR = 150;

export function confirmArrival(trip: Trip, now = new Date()): Trip {
  if (trip.status !== 'ARRIVING') throw new Error('Only arriving trips can confirm arrival');
  return { ...trip, status: 'WAITING', waitStartedAt: new Date(now.getTime()) };
}

export function waitingCharge(waitStartedAt: Date, now = new Date()): { feeInr: number; noShow: boolean } {
  const mins = (now.getTime() - waitStartedAt.getTime()) / 60_000;
  if (mins <= WAIT_FREE_MIN) return { feeInr: 0, noShow: false };
  if (mins <= WAIT_MAX_MIN) return { feeInr: WAIT_FEE_INR, noShow: false };
  return { feeInr: NO_SHOW_FEE_INR, noShow: true };
}
