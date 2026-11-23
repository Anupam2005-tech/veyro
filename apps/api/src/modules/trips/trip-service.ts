import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Firestore, Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { documentId } from '../quotes/quote-repository.js';
import { calculateFinalHourlyBaseFare } from '../quotes/hourly-fare.js';
import { writeCharge } from '../ledger/ledger.js';
import { enqueueNotification } from '../notifications/notifications.js';
import { activeRoles } from '../auth/profile.js';

const minute = 60_000;
const conflict = () => new AppError(409, 'TRIP_STATE_CONFLICT', 'This trip action is unavailable.');
type Phase = 'START' | 'END';

function otpHash(secret: string, salt: string, phase: Phase, tripId: string, code: string) {
  return createHmac('sha256', secret).update(tripId + '\0' + phase + '\0' + salt + '\0' + code).digest('hex');
}

export class TripService {
  constructor(private readonly db: Firestore, private readonly now: () => number = Date.now) {}
  private trip(id: string) { return this.db.collection('trips').doc(documentId(id)); }
  private async actor(tx: Transaction, uid: string, role: 'CUSTOMER' | 'DRIVER') {
    const user = await tx.get(this.db.collection('users').doc(documentId(uid)));
    if (!activeRoles(user.data()).includes(role)) throw new AppError(403, 'ROLE_FORBIDDEN', 'Required trip role is missing.');
  }

  initialize(id: string, uid: string) {
    const ref = this.trip(id);
    return this.db.runTransaction(async tx => {
      const booking = await tx.get(this.db.collection('bookings').doc(id));
      const existing = await tx.get(ref);
      if (!booking.exists || booking.get('status') !== 'ASSIGNED' ||
          ![booking.get('driverId'), booking.get('customerId')].includes(uid)) {
        throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Assigned booking unavailable.');
      }
      if (existing.exists) return;
      tx.create(ref, { bookingId: id, customerId: booking.get('customerId'), driverId: booking.get('driverId'),
        status: 'DRIVER_EN_ROUTE', fare: booking.get('fare'), promisedArrivalAt: booking.get('pickupAt') ??
          booking.get('promisedArrivalAt') ?? null,
        createdAt: this.now() });
    });
  }

  // Team 3 supplies a short-lived server-only verified geofence result; clients cannot
  // supply a location verdict. The customer-confirmed fallback is independently authorized.
  arrive(id: string, uid: string, customerConfirmed = false) {
    const ref = this.trip(id);
    return this.db.runTransaction(async tx => {
      const trip = await tx.get(ref);
      const role = customerConfirmed ? 'CUSTOMER' : 'DRIVER';
      if (!trip.exists || trip.get(customerConfirmed ? 'customerId' : 'driverId') !== uid) {
        throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      }
      await this.actor(tx, uid, role);
      const at = this.now();
      if (trip.get('status') === 'ARRIVED') return;
      if (trip.get('status') !== 'DRIVER_EN_ROUTE') throw conflict();
      if (!customerConfirmed) {
        const evidence = await tx.get(this.db.collection('arrivalEvidence').doc(id));
        if (evidence.get('driverId') !== uid || evidence.get('verified') !== true ||
            evidence.get('withinPickup100m') !== true || evidence.get('accuracyAccepted') !== true ||
            !Number.isSafeInteger(evidence.get('observedAt')) ||
            at - evidence.get('observedAt') < 0 || at - evidence.get('observedAt') > 30_000) {
          throw new AppError(409, 'ARRIVAL_UNVERIFIED', 'Fresh verified pickup location or customer confirmation is required.');
        }
      }
      tx.update(ref, { status: 'ARRIVED', arrivedAt: at, arrivalMethod: customerConfirmed ? 'CUSTOMER_CONFIRMATION' : 'VERIFIED_GPS' });
      enqueueNotification(this.db, tx, trip.get('customerId'), 'arrived-' + id, 'DRIVER_ARRIVED', id);
    });
  }

  private secret() {
    const value = process.env.TRIP_OTP_SECRET;
    if (!value || Buffer.byteLength(value) < 32) throw new AppError(503, 'OTP_UNAVAILABLE', 'Trip verification unavailable.');
    return value;
  }

  // Internal issuance only. The approved secure display/delivery flow remains pending.
  issueCode(id: string, customerId: string, phase: Phase) {
    if (phase !== 'START' && phase !== 'END') throw conflict();
    const secret = this.secret();
    let code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = randomBytes(16).toString('hex');
    const ref = this.trip(id);
    return this.db.runTransaction(async tx => {
      const trip = await tx.get(ref);
      await this.actor(tx, customerId, 'CUSTOMER');
      if (!trip.exists || trip.get('customerId') !== customerId) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      if (trip.get('status') !== (phase === 'START' ? 'ARRIVED' : 'IN_PROGRESS')) throw conflict();
      const otp = ref.collection('verification').doc(phase);
      const existing = await tx.get(otp);
      if (phase === 'END') {
        const start = await tx.get(ref.collection('verification').doc('START'));
        if (start.exists && otpHash(secret, start.get('salt'), 'START', id, code) === start.get('hash')) {
          code = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
        }
      }
      const at = this.now();
      if ((existing.get('attempts') ?? 0) >= 5) throw new AppError(409, 'OTP_LOCKED', 'Verification recovery requires authorized review.');
      if (existing.exists && at - existing.get('issuedAt') < minute) throw new AppError(429, 'OTP_COOLDOWN', 'Wait before regenerating a code.');
      tx.set(otp, { hash: otpHash(secret, salt, phase, id, code), salt, issuedAt: at, expiresAt: at + 5 * minute,
        attempts: existing.get('attempts') ?? 0, consumed: false });
      return code;
    });
  }

  async verifyCode(id: string, driverId: string, phase: Phase, code: string) {
    if (phase !== 'START' && phase !== 'END') throw conflict();
    const secret = this.secret();
    const ref = this.trip(id);
    const failure = await this.db.runTransaction(async tx => {
      const trip = await tx.get(ref);
      await this.actor(tx, driverId, 'DRIVER');
      if (!trip.exists || trip.get('driverId') !== driverId) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      const otpRef = ref.collection('verification').doc(phase);
      const otp = await tx.get(otpRef);
      const at = this.now();
      if (trip.get('status') !== (phase === 'START' ? 'ARRIVED' : 'IN_PROGRESS')) throw conflict();
      if (!otp.exists || otp.get('consumed') || at >= otp.get('expiresAt') || otp.get('attempts') >= 5) return 'OTP_UNAVAILABLE';
      const valid = /^\d{6}$/.test(code) && timingSafeEqual(Buffer.from(otp.get('hash'), 'hex'),
        Buffer.from(otpHash(secret, otp.get('salt'), phase, id, code), 'hex'));
      if (!valid) {
        tx.update(otpRef, { attempts: otp.get('attempts') + 1 });
        return 'OTP_INVALID';
      }
      if (phase === 'START') {
        const waited = at - trip.get('arrivedAt');
        if (waited < 0 || waited >= 30 * minute) throw conflict();
        tx.update(ref, { status: 'IN_PROGRESS', startedAt: at, waitingFeePaise: waited > 15 * minute ? 5000 : 0 });
        enqueueNotification(this.db, tx, trip.get('customerId'), 'started-' + id, 'TRIP_STARTED', id);
      } else {
        await tx.get(this.db.collection('users').doc(trip.get('customerId')));
        const calendar = this.db.collection('driverReservations').doc(driverId);
        await tx.get(calendar);
        const fare = calculateFinalHourlyBaseFare(trip.get('fare'), new Date(trip.get('startedAt')), new Date(at));
        const amountPaise = Math.round(fare.displayBaseFareInr * 100) + trip.get('waitingFeePaise');
        writeCharge(this.db, tx, id, { customerId: trip.get('customerId'), driverId, amountPaise, source: 'COMPLETED_TRIP' });
        tx.delete(this.db.collection('liveLocations').doc(id));
        tx.delete(this.db.collection('arrivalEvidence').doc(id));
        tx.update(ref, { status: 'COMPLETED', endedAt: at, baseFarePaise: Math.round(fare.displayBaseFareInr * 100), amountPaise });
        tx.set(calendar, { updatedAt: at });
        tx.delete(calendar.collection('active').doc(id));
        enqueueNotification(this.db, tx, trip.get('customerId'), 'completed-' + id, 'TRIP_COMPLETED', id);
        enqueueNotification(this.db, tx, driverId, 'driver-completed-' + id, 'DRIVER_TRIP_COMPLETED', id);
      }
      tx.update(otpRef, { consumed: true, consumedAt: at });
      return null;
    });
    // Return failure only after the attempted verification count has committed.
    if (failure) throw new AppError(409, failure, 'Trip verification failed.');
  }

  driverNoShow(id: string, customerId: string) {
    const ref = this.trip(id);
    return this.db.runTransaction(async tx => {
      const trip = await tx.get(ref);
      await this.actor(tx, customerId, 'CUSTOMER');
      if (!trip.exists || trip.get('customerId') !== customerId) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      if (trip.get('status') === 'DRIVER_NO_SHOW') return;
      const evidence = await tx.get(this.db.collection('driverNoShowEvidence').doc(id));
      const promised = trip.get('promisedArrivalAt');
      if (trip.get('status') !== 'DRIVER_EN_ROUTE' || !Number.isSafeInteger(promised) ||
          this.now() < promised + 20 * minute || evidence.get('verified') !== true ||
          evidence.get('driverId') !== trip.get('driverId') || evidence.get('customerReportId') == null) throw conflict();
      const calendar = this.db.collection('driverReservations').doc(trip.get('driverId'));
      await tx.get(calendar);
      tx.delete(this.db.collection('liveLocations').doc(id));
      tx.delete(this.db.collection('arrivalEvidence').doc(id));
      tx.update(ref, { status: 'DRIVER_NO_SHOW', noShowAt: this.now() });
      tx.set(calendar, { updatedAt: this.now() });
      tx.delete(calendar.collection('active').doc(id));
      if (evidence.get('qualifies') === true) {
        tx.create(this.db.collection('verifiedIncidents').doc('driver-no-show-' + id), {
          uid: trip.get('driverId'), kind: 'DRIVER_NO_SHOW', verified: true, qualifies: true,
          source: id, createdAt: this.now(),
        });
      }
      enqueueNotification(this.db, tx, customerId, 'driver-no-show-' + id, 'DRIVER_NO_SHOW', id);
    });
  }

  customerNoShow(id: string, driverId: string) {
    const ref = this.trip(id);
    return this.db.runTransaction(async tx => {
      const trip = await tx.get(ref);
      await this.actor(tx, driverId, 'DRIVER');
      if (!trip.exists || trip.get('driverId') !== driverId) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      if (trip.get('status') === 'CUSTOMER_NO_SHOW') return;
      if (trip.get('status') !== 'ARRIVED' || this.now() - trip.get('arrivedAt') < 30 * minute) throw conflict();
      await tx.get(this.db.collection('users').doc(trip.get('customerId')));
      const calendar = this.db.collection('driverReservations').doc(driverId);
      await tx.get(calendar);
      writeCharge(this.db, tx, id, { customerId: trip.get('customerId'), driverId, amountPaise: 15000, source: 'CUSTOMER_NO_SHOW' });
      tx.delete(this.db.collection('liveLocations').doc(id));
      tx.delete(this.db.collection('arrivalEvidence').doc(id));
      tx.update(ref, { status: 'CUSTOMER_NO_SHOW', noShowAt: this.now(), amountPaise: 15000, waitingFeePaise: 0 });
      tx.create(this.db.collection('tripAuditLogs').doc('no-show-' + id), {
        actorId: driverId, action: 'CUSTOMER_NO_SHOW', tripId: id, at: this.now(), arrivalMethod: trip.get('arrivalMethod'),
      });
      tx.set(calendar, { updatedAt: this.now() });
      tx.delete(calendar.collection('active').doc(id));
      enqueueNotification(this.db, tx, trip.get('customerId'), 'no-show-' + id, 'CUSTOMER_NO_SHOW', id);
    });
  }
}

// Read once while authorizing a route. Never return OTP hashes or verification documents.
export function publicTrip(trip: DocumentSnapshot) {
  if (!trip.exists) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
  const d = trip.data()!;
  return { id: trip.id, customerId: d.customerId, driverId: d.driverId, status: d.status,
    arrivedAt: d.arrivedAt ?? null, startedAt: d.startedAt ?? null, endedAt: d.endedAt ?? null,
    waitingFeePaise: d.waitingFeePaise ?? 0, amountPaise: d.amountPaise ?? null };
}
