import type { Firestore } from 'firebase-admin/firestore';
import { createHourlyQuoteSnapshot } from './hourly-quote-snapshot.js';

export type FareSnapshot = ReturnType<typeof createHourlyQuoteSnapshot>;
type QuoteTerms = Omit<Parameters<typeof createHourlyQuoteSnapshot>[0], 'quotedAt'>;

export interface BookingQuote {
  customerId: string;
  vehicleId: string;
  routeId: string;
  selectedDriverId: string | null;
  fare: FareSnapshot;
}

export function documentId(value: string): string {
  if (typeof value !== 'string' || !value.trim() || /[/]/.test(value) ||
      value === '.' || value === '..' || /^__.*__$/.test(value) || Buffer.byteLength(value) > 1500) {
    throw new RangeError('Invalid document identifier');
  }
  return value;
}

/** Called only after server-side ownership, routing and pricing checks. */
export async function storeBookingQuote(db: Firestore, owner: Omit<BookingQuote, 'fare'>, terms: QuoteTerms) {
  const quote: BookingQuote = {
    customerId: documentId(owner.customerId), vehicleId: documentId(owner.vehicleId),
    routeId: documentId(owner.routeId),
    selectedDriverId: owner.selectedDriverId === null ? null : documentId(owner.selectedDriverId),
    fare: createHourlyQuoteSnapshot({ ...terms, quotedAt: new Date() }),
  };
  const ref = db.collection('bookingQuotes').doc();
  await ref.create(quote);
  return ref.id;
}
