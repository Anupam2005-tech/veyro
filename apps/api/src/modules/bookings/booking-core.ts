import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { enqueueNotification } from '../notifications/notifications.js';
import { writeCharge } from '../ledger/ledger.js';
import { enforceBookingBalance } from '../payments/payment-service.js';
import { AppError } from '../../shared/http/app-error.js';
import { documentId, type BookingQuote, type FareSnapshot } from '../quotes/quote-repository.js';
import { cancellationFeeInr, minute, scheduledWindow, type CancellationFacts } from './booking-policy.js';

type Kind = 'INSTANT' | 'SCHEDULED';
type Status = 'SEARCHING' | 'SCHEDULED_QUEUED' | 'SCHEDULED_BROADCASTING' | 'NEEDS_REBOOK' |
  'EXPIRED' | 'ASSIGNED' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_CUSTOMER';

export interface Booking extends BookingQuote {
  kind: Kind;
  status: Status;
  createdAt: number;
  pickupAt: number | null;
  opensAt: number;
  closesAt: number;
  driverId: string | null;
  acceptedAt: number | null;
}

// These adapters must read authoritative data within the transaction. A rejection throws.
// In particular, verifyAcceptance checks approval, availability and the driver's frozen rate.
export interface BookingChecks {
  verifyCreation(tx: Transaction, quote: BookingQuote, pickupAt?: number | null): Promise<void>;
  verifyAcceptance(tx: Transaction, booking: Booking, driverId: string): Promise<void | FareSnapshot>;
  promisedArrival?(tx: Transaction, booking: Booking, driverId: string): Promise<number>;
  cancellationFacts(tx: Transaction, bookingId: string, policyVersion: string,
    role: 'CUSTOMER' | 'DRIVER', reason: string): Promise<CancellationFacts>;
}

const conflict = () => new AppError(409, 'BOOKING_CONFLICT', 'Booking action is no longer available.');
const unavailable = () => new AppError(404, 'BOOKING_NOT_ACCESSIBLE', 'Booking is unavailable.');

async function readBooking(tx: Transaction, ref: DocumentReference): Promise<Booking> {
  const record = await tx.get(ref);
  if (!record.exists) throw unavailable();
  return record.data() as Booking;
}

function event(tx: Transaction, ref: DocumentReference, state: Status, at: number, customerId: string, driverId: string | null) {
  tx.create(ref.collection('events').doc(state), { bookingId: ref.id, state, at, customerId, driverId });
  enqueueNotification(ref.firestore, tx, customerId, 'booking-' + ref.id + '-' + state, 'BOOKING_' + state, ref.id);
}

export class BookingCore {
  constructor(private readonly db: Firestore, private readonly checks: BookingChecks,
    private readonly now: () => number = Date.now) {}

  private booking(id: string) { return this.db.collection('bookings').doc(documentId(id)); }

  // One booking per quote makes creation retries safe and prevents double spending a quote.
  create(customerId: string, quoteId: string, pickupAt: number | null = null) {
    const ref = this.booking(quoteId);
    return this.db.runTransaction(async tx => {
      const quoteDoc = await tx.get(this.db.collection('bookingQuotes').doc(ref.id));
      const quote = quoteDoc.data() as BookingQuote | undefined;
      if (!quote || quote.customerId !== customerId) throw unavailable();
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.get('pickupAt') !== pickupAt) throw conflict();
        return ref.id;
      }
      await enforceBookingBalance(this.db, tx, customerId);
      await this.checks.verifyCreation(tx, quote, pickupAt);
      const at = this.now();
      const scheduled = pickupAt !== null;
      if (!scheduled && !quote.selectedDriverId) throw conflict();
      const window = scheduled ? scheduledWindow(at, pickupAt) : { opensAt: at, closesAt: at + 5 * minute };
      const status = !scheduled ? 'SEARCHING' : window.opensAt === at ? 'SCHEDULED_BROADCASTING' : 'SCHEDULED_QUEUED';
      const booking: Booking = { ...quote, ...window, pickupAt, kind: scheduled ? 'SCHEDULED' : 'INSTANT',
        status, createdAt: at, acceptedAt: null, driverId: null };
      tx.create(ref, booking);
      if (!scheduled && quote.selectedDriverId) {
        tx.create(ref.collection('offers').doc(quote.selectedDriverId), {
          driverId: quote.selectedDriverId, status: 'OPEN', ...window,
        });
        enqueueNotification(this.db, tx, quote.selectedDriverId, 'offer-' + ref.id, 'BOOKING_OFFER', ref.id);
      }
      event(tx, ref, status, at, customerId, scheduled ? null : quote.selectedDriverId);
      return ref.id;
    });
  }

  // Safe for repeated and delayed deadline jobs; a missed window never opens after close.
  advance(id: string) {
    const ref = this.booking(id);
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref);
      const at = this.now();
      let state = b.status;
      if (b.status === 'SEARCHING' && at >= b.closesAt) state = 'EXPIRED';
      if (b.status === 'SCHEDULED_QUEUED' || b.status === 'SCHEDULED_BROADCASTING') {
        if (at >= b.closesAt) state = 'NEEDS_REBOOK';
        else if (at >= b.opensAt) state = 'SCHEDULED_BROADCASTING';
      }
      if (state !== b.status) {
        tx.update(ref, { status: state });
        if (state === 'EXPIRED' && b.selectedDriverId) {
          tx.update(ref.collection('offers').doc(b.selectedDriverId), { status: 'EXPIRED' });
        }
        event(tx, ref, state, at, b.customerId, b.kind === 'INSTANT' ? b.selectedDriverId : null);
      }
      return state;
    });
  }

  offerScheduled(id: string, driverId: string) {
    const ref = this.booking(id);
    const offer = ref.collection('offers').doc(documentId(driverId));
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref);
      if (b.status !== 'SCHEDULED_BROADCASTING') throw conflict();
      const existing = await tx.get(offer);
      await this.checks.verifyAcceptance(tx, b, driverId);
      const at = this.now();
      if (at < b.opensAt || at >= b.closesAt) throw conflict();
      if (!existing.exists) {
        tx.create(offer, { driverId, status: 'OPEN', opensAt: at, closesAt: b.closesAt });
        enqueueNotification(this.db, tx, driverId, 'offer-' + ref.id, 'BOOKING_OFFER', ref.id);
      }
    });
  }

  rejectInstant(id: string, driverId: string) {
    const ref = this.booking(id);
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref);
      if (b.kind !== 'INSTANT' || b.selectedDriverId !== driverId) throw unavailable();
      if (b.status === 'EXPIRED') return;
      if (b.status !== 'SEARCHING') throw conflict();
      const at = this.now();
      const outcome = at < b.closesAt ? 'REJECTED' : 'EXPIRED';
      tx.update(ref.collection('offers').doc(driverId), { status: outcome });
      tx.update(ref, { status: 'EXPIRED', offerOutcome: outcome });
      event(tx, ref, 'EXPIRED', at, b.customerId, driverId);
    });
  }

  async rejectOffer(id: string, driverId: string) {
    const ref = this.booking(id);
    if ((await ref.get()).get('kind') === 'INSTANT') return this.rejectInstant(id, driverId);
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref), offer = ref.collection('offers').doc(documentId(driverId));
      const record = await tx.get(offer);
      if (!record.exists) throw unavailable();
      if (record.get('status') === 'REJECTED') return;
      if (b.status !== 'SCHEDULED_BROADCASTING' || record.get('status') !== 'OPEN') throw conflict();
      tx.update(offer, { status: this.now() < b.closesAt ? 'REJECTED' : 'EXPIRED' });
    });
  }

  accept(id: string, driverId: string) {
    const ref = this.booking(id);
    const calendar = this.db.collection('driverReservations').doc(documentId(driverId));
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref);
      if (b.kind === 'INSTANT' && driverId !== b.selectedDriverId) throw unavailable();
      if (b.status === 'ASSIGNED' && b.driverId === driverId) return;
      if (b.status !== 'SEARCHING' && b.status !== 'SCHEDULED_BROADCASTING') throw conflict();
      const offer = ref.collection('offers').doc(driverId);
      if ((await tx.get(offer)).get('status') !== 'OPEN') throw unavailable();
      const acceptedFare = await this.checks.verifyAcceptance(tx, b, driverId);
      const promisedArrivalAt = this.checks.promisedArrival ? await this.checks.promisedArrival(tx, b, driverId) : b.pickupAt;
      // Serialize even initially empty calendars. Only live reservations are retained.
      await tx.get(calendar);
      const reservations = await tx.get(calendar.collection('active'));
      const at = this.now();
      if (at < b.opensAt || at >= b.closesAt) throw conflict();
      const start = b.pickupAt ?? at;
      const end = start + Math.ceil(b.fare.estimatedRouteMinutes * minute) + 30 * minute;
      if (!Number.isSafeInteger(end)) throw conflict();
      for (const entry of reservations.docs) {
        if (entry.get('kind') === 'INSTANT' && b.kind === 'INSTANT') throw conflict();
        if (start < entry.get('end') && entry.get('start') < end) throw conflict();
        if (b.kind === 'INSTANT') {
          const trip = await tx.get(this.db.collection('trips').doc(entry.id));
          if (['ARRIVED', 'IN_PROGRESS'].includes(trip.get('status')) ||
              trip.get('status') === 'DRIVER_EN_ROUTE' && entry.get('start') <= at) throw conflict();
        }
      }
      tx.set(calendar, { updatedAt: at });
      tx.create(calendar.collection('active').doc(ref.id), { start, end, kind: b.kind });
      tx.update(offer, { status: 'ACCEPTED' });
      tx.update(ref, { status: 'ASSIGNED', driverId, acceptedAt: at, promisedArrivalAt, ...(acceptedFare ? { fare: acceptedFare } : {}) });
      event(tx, ref, 'ASSIGNED', at, b.customerId, driverId);
    });
  }

  cancel(id: string, actorId: string, role: 'CUSTOMER' | 'DRIVER', reason: string, description = '') {
    const ref = this.booking(id);
    if (!reason.trim() || (role !== 'CUSTOMER' && role !== 'DRIVER')) throw conflict();
    return this.db.runTransaction(async tx => {
      const b = await readBooking(tx, ref);
      if ((role === 'CUSTOMER' ? b.customerId : b.driverId) !== actorId) throw unavailable();
      const factRef = ref.collection('facts').doc('cancellation');
      const previous = await tx.get(factRef);
      if (previous.exists) {
        if (previous.get('actorId') !== actorId || previous.get('role') !== role ||
            previous.get('reason') !== reason || previous.get('description') !== description) throw conflict();
        return Number(previous.get('feeInr'));
      }
      if (!['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED', 'NEEDS_REBOOK'].includes(b.status)) throw conflict();
      // Adapter rejects unknown reasons, unsupported policy versions and active/completed trips.
      const policyVersion = b.fare.cancellationPolicyVersion;
      const facts = await this.checks.cancellationFacts(tx, ref.id, policyVersion, role, reason);
      const tripRef = this.db.collection('trips').doc(id);
      const trip = await tx.get(tripRef);
      if (trip.exists && !['DRIVER_EN_ROUTE', 'ARRIVED', 'DRIVER_NO_SHOW'].includes(trip.get('status'))) throw conflict();
      await tx.get(this.db.collection('users').doc(b.customerId));
      const at = this.now();
      const feeInr = cancellationFeeInr(b.kind, role, b.acceptedAt, at, facts);
      const status = role === 'CUSTOMER' ? 'CANCELLED_BY_CUSTOMER' : 'CANCELLED_BY_DRIVER';
      tx.create(factRef, { actorId, role, reason, description, at, feeInr, policyVersion, ...facts });
      tx.update(ref, { status });
      if (trip.exists) tx.update(tripRef, { status: 'CANCELLED', cancelledAt: at });
      tx.delete(this.db.collection('liveLocations').doc(id));
      tx.delete(this.db.collection('arrivalEvidence').doc(id));
      if (feeInr > 0 && b.driverId) {
        writeCharge(this.db, tx, 'cancel-' + id, { customerId: b.customerId, driverId: b.driverId,
          amountPaise: feeInr * 100, source: 'CANCELLATION' });
      }
      if (b.driverId) {
        const calendar = this.db.collection('driverReservations').doc(b.driverId);
        tx.set(calendar, { updatedAt: at });
        tx.delete(calendar.collection('active').doc(ref.id));
      }
      event(tx, ref, status, at, b.customerId, b.driverId ?? b.selectedDriverId);
      return feeInr;
    });
  }
}
