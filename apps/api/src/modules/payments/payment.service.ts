export interface PaymentOrder {
  readonly id: string;
  readonly tripId: string;
  readonly amountInr: number;
  readonly status: 'CREATED' | 'PAID' | 'FAILED';
}

/** Server-created amounts only; browser callbacks are never authority. */
export function createPaymentOrder(id: string, tripId: string, amountInr: number): PaymentOrder {
  if (!id.trim() || !tripId.trim()) throw new RangeError('Order id and trip are required');
  if (!Number.isFinite(amountInr) || amountInr < 0) throw new RangeError('Amount must be non-negative');
  return { id: id.trim(), tripId: tripId.trim(), amountInr: Math.round(amountInr), status: 'CREATED' };
}

export function applyWebhookEvent(
  order: PaymentOrder,
  eventId: string,
  seen: ReadonlySet<string>,
  paid: boolean,
): { order: PaymentOrder; duplicate: boolean } {
  if (seen.has(eventId)) return { order, duplicate: true };
  return { order: { ...order, status: paid ? 'PAID' : 'FAILED' }, duplicate: false };
}

export interface LedgerEntry {
  readonly id: string;
  readonly tripId: string;
  readonly driverNet: number;
  readonly platformFee: number;
}

/** DEC-04: 0% commission, ₹0 platform fee in Release 1. */
export function settleLedger(id: string, tripId: string, grossInr: number): LedgerEntry {
  if (grossInr < 0) throw new RangeError('Gross must be non-negative');
  return { id, tripId, driverNet: Math.round(grossInr), platformFee: 0 };
}

/** Balance gate: any positive outstanding balance blocks new bookings. */
export function mayCreateBooking(outstandingInr: number): boolean {
  return !(outstandingInr > 0);
}
