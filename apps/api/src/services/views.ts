import { POLICY } from '../config/policy.js';
import { waitingCharge } from '../modules/trips/trip.service.js';
import { driverNoShowDeadline } from '../modules/bookings/booking.service.js';
import { db } from '../store/db.js';
import type { Booking, Driver, Trip, User } from '../store/types.js';
import { findDriver, findUser, presenceFresh, rating } from './domain.js';

/** Public driver card — never includes documents, phone or email. */
export function driverCard(driver: Driver) {
  const user = findUser(driver.id);
  return {
    id: driver.id,
    name: user?.name ?? 'Driver',
    firstName: (user?.name ?? 'Driver').split(' ')[0],
    hourlyRateInr: driver.hourlyRateInr,
    rating: rating(driver),
    ratingCount: driver.ratingCount,
    experienceYears: driver.experienceYears,
    languages: driver.languages,
    categories: driver.categories,
    transmissions: driver.transmissions,
    bio: driver.bio,
  };
}

export function locationView(loc: Trip['location'] | Driver['presence']) {
  if (!loc) return null;
  const ageMs = Date.now() - new Date(loc.capturedAt).getTime();
  return { lat: loc.lat, lng: loc.lng, accuracyM: loc.accuracyM, capturedAt: loc.capturedAt, stale: ageMs > POLICY.locationStaleMs, source: loc.source };
}

export function tripView(trip: Trip, viewer: User) {
  const booking = db().bookings.find((b) => b.id === trip.bookingId);
  const waiting =
    trip.status === 'ARRIVED' && trip.arrivedAt ? waitingCharge(new Date(trip.arrivedAt), new Date()) : null;
  const driver = findDriver(trip.driverId);
  const customer = findUser(trip.customerId);
  return {
    id: trip.id,
    bookingId: trip.bookingId,
    status: trip.status,
    arrivedAt: trip.arrivedAt,
    arrivalMethod: trip.arrivalMethod,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    fare: trip.fare,
    rating: trip.rating,
    location: locationView(trip.location),
    waiting: waiting
      ? {
          ...waiting,
          elapsedMin: Math.floor((Date.now() - new Date(trip.arrivedAt!).getTime()) / 60_000),
          noShowAvailableAt: new Date(new Date(trip.arrivedAt!).getTime() + POLICY.waitMaxMin * 60_000).toISOString(),
          freeUntil: new Date(new Date(trip.arrivedAt!).getTime() + POLICY.waitFreeMin * 60_000).toISOString(),
        }
      : null,
    startOtpIssued: Boolean(trip.startOtp),
    endOtpIssued: Boolean(trip.endOtp),
    driver: driver ? driverCard(driver) : null,
    // Driver sees the customer's first name and contact for pickup coordination only.
    customer: viewer.role !== 'CUSTOMER' && customer ? { firstName: customer.name.split(' ')[0], phone: customer.phone } : null,
    driverPhone: viewer.role === 'CUSTOMER' ? findUser(trip.driverId)?.phone ?? null : null,
    booking: booking ? bookingCore(booking) : null,
  };
}

export function bookingCore(b: Booking) {
  return {
    id: b.id,
    type: b.type,
    status: b.status,
    pickup: b.pickup,
    destination: b.destination,
    stops: b.stops,
    routePolyline: b.routePolyline,
    pickupAt: b.pickupAt,
    vehicle: b.vehicleSnapshot,
    quote: b.quoteSnapshot,
    offerExpiresAt: b.offerExpiresAt,
    offerOutcome: b.offerOutcome,
    broadcastStartAt: b.broadcastStartAt,
    broadcastEndAt: b.broadcastEndAt,
    acceptedAt: b.acceptedAt,
    promisedArrivalAt: b.promisedArrivalAt,
    driverNoShowAt:
      b.status === 'ASSIGNED'
        ? driverNoShowDeadline({
            type: b.type,
            pickupAt: new Date(b.pickupAt),
            promisedArrivalAt: b.promisedArrivalAt ? new Date(b.promisedArrivalAt) : null,
          }).toISOString()
        : null,
    cancellation: b.cancellation,
    tripId: b.tripId,
    createdAt: b.createdAt,
  };
}

export function bookingView(b: Booking, viewer: User) {
  const driverId = b.driverId ?? b.offeredDriverId;
  const driver = driverId ? findDriver(driverId) : undefined;
  const trip = b.tripId ? db().trips.find((t) => t.id === b.tripId) : undefined;
  return {
    ...bookingCore(b),
    driver: driver ? driverCard(driver) : null,
    driverLocation:
      driver && b.status === 'ASSIGNED' && trip && trip.status === 'DRIVER_EN_ROUTE'
        ? locationView(trip.location ?? driver.presence)
        : null,
    trip: trip ? { id: trip.id, status: trip.status, fare: trip.fare, rating: trip.rating } : null,
    customer: viewer.role !== 'CUSTOMER' ? { firstName: (findUser(b.customerId)?.name ?? '').split(' ')[0] } : null,
  };
}

export function driverSelfView(driver: Driver) {
  return {
    ...driverCard(driver),
    approvalStatus: driver.approvalStatus,
    isSuspended: driver.isSuspended,
    suspensionReason: driver.suspensionReason,
    isOnline: driver.isOnline,
    perKmRateInr: driver.perKmRateInr,
    serviceArea: driver.serviceArea,
    verifiedNoShowCount: driver.verifiedNoShowCount,
    presence: locationView(driver.presence),
    presenceFresh: presenceFresh(driver),
  };
}
