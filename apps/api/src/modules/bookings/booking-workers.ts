import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { BookingCore } from './booking-core.js';
import { bookingChecks } from './booking-checks.js';
import { MobilityService } from '../mobility/mobility-service.js';
import { googleRoadProvider } from '../mobility/geo.js';
import { AppError } from '../../shared/http/app-error.js';

export async function expireBookings(db: Firestore) {
  const service = new BookingCore(db, bookingChecks(db));
  const records = await db.collection('bookings').where('status', 'in',
    ['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING']).where('closesAt', '<=', Date.now());
  for await (const record of (records.stream() as unknown as AsyncIterable<QueryDocumentSnapshot>)) await service.advance(record.id);
}

export async function broadcastBookings(db: Firestore) {
  const service = new BookingCore(db, bookingChecks(db));
  const bookings = await db.collection('bookings').where('status', 'in',
    ['SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING']).where('opensAt', '<=', Date.now());
  const drivers = db.collection('driverAvailability').where('online', '==', true);
  for await (const booking of (bookings.stream() as unknown as AsyncIterable<QueryDocumentSnapshot>)) {
    if (await service.advance(booking.id) !== 'SCHEDULED_BROADCASTING') continue;
    for await (const driver of (drivers.stream() as unknown as AsyncIterable<QueryDocumentSnapshot>)) {
      try {
        if (typeof booking.get('vehicleId') !== 'string' || typeof booking.get('routeId') !== 'string') continue;
        const existing = await booking.ref.collection('offers').doc(driver.id).get();
        if (existing.exists) continue;
        const eligibility = await db.collection('driverEligibility').doc(driver.id).collection('vehicles').doc(booking.get('vehicleId')).get();
        if (eligibility.get('routeId') !== booking.get('routeId') || eligibility.get('expiresAt') <= Date.now() || !eligibility.exists) {
          await new MobilityService(db, googleRoadProvider()).eligibility(booking.get('customerId'), driver.id, booking.get('routeId'), true);
        }
        await service.offerScheduled(booking.id, driver.id);
      }
      catch (error) {
        // Ineligible candidates are normal. Infrastructure failures must surface for retry.
        if (!(error instanceof AppError) || error.statusCode >= 500) throw error;
      }
    }
  }
}
