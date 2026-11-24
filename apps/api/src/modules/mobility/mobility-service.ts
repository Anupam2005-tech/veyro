import { createHash, randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { scheduledWindow } from '../bookings/booking-policy.js';
import { activeRoles } from '../auth/profile.js';
import { identifier } from '../profiles/profile-service.js';
import { point, distanceMetres, type RoadProvider } from './geo.js';

const liveStates = ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
export class MobilityService {
  constructor(private readonly db: Firestore, private readonly roads: RoadProvider, private readonly now = Date.now) {}
  async availability(uid: string, online: boolean, position?: unknown, renew = false) {
    const p = online ? point(position) : null;
    const ref = this.db.collection('driverAvailability').doc(uid);
    await this.db.runTransaction(async tx => {
      const user = await tx.get(this.db.collection('users').doc(uid));
      const driver = await tx.get(this.db.collection('drivers').doc(uid));
      if (!activeRoles(user.data()).includes('DRIVER') || online && driver.get('approvalStatus') !== 'APPROVED') {
        throw new AppError(403, 'DRIVER_INELIGIBLE', 'Approved active driver required.');
      }
      if (renew) {
        const previous = await tx.get(ref);
        if (previous.get('online') !== true || previous.get('expiresAt') <= this.now()) {
          throw new AppError(409, 'DRIVER_OFFLINE', 'Go online to receive offers.');
        }
      }
      if (!online) {
        const active = await tx.get(this.db.collection('trips').where('driverId', '==', uid).where('status', '==', 'IN_PROGRESS'));
        if (!active.empty) throw new AppError(409, 'TRIP_IN_PROGRESS', 'Finish the active trip before going offline.');
      }
      tx.set(ref, { online, updatedAt: this.now(), expiresAt: this.now() + 24 * 60 * 60000, ...(p ? { position: p } : {}) });
    });
  }
  async route(uid: string, vehicleId: string, points: unknown[], radiusKm = 15, expanded = false, pickupAt: number | null = null) {
    if (points.length < 2 || points.length > 27 || !Number.isFinite(radiusKm) || radiusKm < 15 ||
        radiusKm > 15 && !expanded) throw new AppError(400, 'INVALID_ROUTE', 'Use two to twenty-seven route points and explicitly confirm search expansion.');
    if (pickupAt !== null) scheduledWindow(this.now(), pickupAt);
    const vehicle = await this.db.collection('vehicles').doc(identifier(vehicleId)).get();
    if (vehicle.get('customerId') !== uid) throw new AppError(404, 'VEHICLE_UNAVAILABLE', 'Vehicle unavailable.');
    const coordinates = points.map(point);
    const road = await this.roads.route(coordinates);
    const ref = this.db.collection('routeQuotes').doc();
    await ref.create({ customerId: uid, vehicleId, points: coordinates, pickup: coordinates[0], destination: coordinates[coordinates.length - 1],
      ...road, pickupAt, searchRadiusKm: radiusKm, customerExpandedRadius: expanded, verified: true,
      createdAt: this.now(), expiresAt: this.now() + 5 * 60000 });
    return { routeId: ref.id, ...road };
  }
  async eligibility(uid: string, driverId: string, routeId: string, allowStoredRoute = false) {
    const routeRef = this.db.collection('routeQuotes').doc(identifier(routeId));
    const route = await routeRef.get();
    const vehicleId = route.get('vehicleId');
    if (route.get('customerId') !== uid || route.get('verified') !== true || !Number.isSafeInteger(route.get('expiresAt')) || !allowStoredRoute && route.get('expiresAt') <= this.now()) {
      throw new AppError(404, 'ROUTE_UNAVAILABLE', 'An owned fresh road route is required.');
    }
    const vehicle = await this.db.collection('vehicles').doc(identifier(vehicleId)).get();
    const driver = await this.db.collection('drivers').doc(identifier(driverId)).get();
    const user = await this.db.collection('users').doc(driverId).get();
    const presence = await this.db.collection('driverAvailability').doc(driverId).get();
    if (user.get('status') !== 'ACTIVE' || !activeRoles(user.data()).includes('DRIVER') || driver.get('approvalStatus') !== 'APPROVED' ||
        presence.get('online') !== true || !Number.isSafeInteger(presence.get('updatedAt')) ||
        this.now() < presence.get('updatedAt') || this.now() - presence.get('updatedAt') > 30000 ||
        !(driver.get('categories') ?? []).includes(vehicle.get('category')) ||
        !(driver.get('transmissions') ?? []).includes(vehicle.get('transmission'))) {
      throw new AppError(409, 'DRIVER_INELIGIBLE', 'Driver is unavailable or incompatible.');
    }
    const pickup = point(route.get('pickup'));
    const bounds = driver.get('serviceAreaBounds');
    if (!bounds || pickup.lat < point(bounds.southWest).lat || pickup.lng < point(bounds.southWest).lng ||
        pickup.lat > point(bounds.northEast).lat || pickup.lng > point(bounds.northEast).lng) {
      throw new AppError(409, 'OUTSIDE_SERVICE_AREA', 'An approved service area covering pickup is required.');
    }
    const reservations = await this.db.collection('driverReservations').doc(driverId).collection('active').get();
    const start = route.get('pickupAt') ?? this.now();
    const end = start + route.get('durationMinutes') * 60000 + 30 * 60000;
    for (const reservation of reservations.docs) {
      if (reservation.get('kind') === 'INSTANT' && route.get('pickupAt') == null ||
          start < reservation.get('end') && reservation.get('start') < end) {
        throw new AppError(409, 'DRIVER_BUSY', 'Driver has a conflicting reservation.');
      }
      if (route.get('pickupAt') == null) {
        const trip = await this.db.collection('trips').doc(reservation.id).get();
        if (['ARRIVED', 'IN_PROGRESS'].includes(trip.get('status')) ||
            trip.get('status') === 'DRIVER_EN_ROUTE' && reservation.get('start') <= this.now()) {
          throw new AppError(409, 'DRIVER_BUSY', 'Driver is still on an active trip.');
        }
      }
    }
    const pickupRoad = await this.roads.route([point(presence.get('position')), pickup]);
    if (pickupRoad.distanceKm > route.get('searchRadiusKm')) throw new AppError(409, 'OUTSIDE_SEARCH_RADIUS', 'Driver is outside the selected radius.');
    const ref = this.db.collection('driverEligibility').doc(driverId).collection('vehicles').doc(vehicleId);
    // Final acceptance revalidates profile, route, presence and reservations transactionally.
    await ref.set({ eligible: true, routeId, vehicleCategory: vehicle.get('category'), transmission: vehicle.get('transmission'),
      expiresAt: allowStoredRoute ? this.now() + 30000 : Math.min(route.get('expiresAt'), this.now() + 30000),
      driverRevision: driver.updateTime!.toMillis(), pickupDistanceKm: pickupRoad.distanceKm, pickupEtaMinutes: pickupRoad.durationMinutes });
    return { driverId, hourlyRateInr: driver.get('hourlyRateInr'), pickupDistanceKm: pickupRoad.distanceKm,
      pickupEtaMinutes: pickupRoad.durationMinutes, position: point(presence.get('position')) };
  }
  async location(uid: string, id: string, input: { position: unknown; accuracy: number; observedAt: number }) {
    const position = point(input.position), at = this.now();
    if (!Number.isFinite(input.accuracy) || input.accuracy < 0 || !Number.isSafeInteger(input.observedAt) ||
        at - input.observedAt < 0 || at - input.observedAt > 30000) throw new AppError(400, 'INVALID_GPS_SAMPLE', 'A fresh accurate GPS sample is required.');
    const ref = this.db.collection('liveLocations').doc(identifier(id));
    const sample = { ...position, accuracy: input.accuracy, observedAt: input.observedAt };
    const pickup = await this.db.runTransaction(async tx => {
      const trip = await tx.get(this.db.collection('trips').doc(id));
      const user = await tx.get(this.db.collection('users').doc(uid));
      const previous = await tx.get(ref);
      if (!activeRoles(user.data()).includes('DRIVER') || trip.get('driverId') !== uid || !liveStates.includes(trip.get('status'))) {
        throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Assigned active trip required.');
      }
      if (previous.exists) {
        const elapsed = input.observedAt - previous.get('observedAt');
        if (elapsed === 0 && previous.get('lat') === position.lat && previous.get('lng') === position.lng &&
            previous.get('accuracy') === input.accuracy) return;
        if (elapsed <= 0) throw new AppError(409, 'GPS_OUT_OF_ORDER', 'GPS timestamps must increase.');
        if (distanceMetres(point(previous.data()), position) > elapsed / 1000 * 100 + input.accuracy + previous.get('accuracy')) {
          throw new AppError(400, 'GPS_JUMP', 'Implausible GPS jump.');
        }
      }
      const booking = await tx.get(this.db.collection('bookings').doc(trip.get('bookingId')));
      const routeId = booking.get('routeId');
      const route = typeof routeId === 'string' ? await tx.get(this.db.collection('routeQuotes').doc(routeId)) : null;
      tx.set(ref, { ...sample, driverId: uid, tripId: id, expiresAt: at + 24 * 60 * 60000 });
      if (route?.get('pickup')) {
        const destination = point(route.get('pickup'));
        const distance = distanceMetres(position, destination);
        tx.set(this.db.collection('arrivalEvidence').doc(id), { driverId: uid, verified: true,
          withinPickup100m: distance + input.accuracy <= 100, accuracyAccepted: input.accuracy <= 100, observedAt: input.observedAt });
        const lastRequest = trip.get('pickupEtaRequestedAt');
        if (trip.get('status') === 'DRIVER_EN_ROUTE' && input.accuracy <= 100 &&
            (lastRequest === undefined || at - lastRequest >= 60_000)) {
          tx.update(trip.ref, { pickupEtaRequestedAt: at });
          return destination;
        }
      }
    });
    const app = getFirebaseAdminApp();
    if (!app.options.databaseURL) throw new AppError(503, 'REALTIME_UNAVAILABLE', 'Configure the realtime database URL.');
    await getDatabase(app).ref('tripLocations/' + id).transaction(current => {
      if (current?.state === 'DISABLED' || current?.sample?.observedAt >= sample.observedAt) return;
      return { state: 'ACTIVE', sample };
    });
    if (pickup) await this.updatePickupEta(id, position, pickup, at);
  }
  private async updatePickupEta(id: string, position: ReturnType<typeof point>, pickup: ReturnType<typeof point>, requestedAt: number) {
    try {
      const { durationMinutes } = await this.roads.route([position, pickup]);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
      const ref = this.db.collection('trips').doc(id);
      await this.db.runTransaction(async tx => {
        const trip = await tx.get(ref);
        if (trip.get('status') === 'DRIVER_EN_ROUTE' && trip.get('pickupEtaRequestedAt') === requestedAt) {
          tx.update(ref, { pickupEta: { requestedAt, arrivalAt: requestedAt + Math.round(durationMinutes * 60_000) } });
        }
      });
    } catch {
      // GPS remains usable when the optional Routes lookup is unavailable.
    }
  }
  async createShare(uid: string, id: string) {
    const token = randomBytes(32).toString('base64url'), hash = createHash('sha256').update(token).digest('hex');
    await this.db.runTransaction(async tx => {
      const trip = await tx.get(this.db.collection('trips').doc(identifier(id)));
      if (trip.get('customerId') !== uid || !liveStates.includes(trip.get('status'))) throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Active owned trip required.');
      const owner = await tx.get(this.db.collection('users').doc(uid));
      if (owner.get('privacy.tripSharing') === false) throw new AppError(403, 'SHARING_DISABLED', 'Trip sharing is disabled in your privacy preferences.');
      const previous = await tx.get(this.db.collection('tripShares').where('tripId', '==', id));
      for (const share of previous.docs) if (share.get('customerId') === uid && share.get('revoked') !== true) tx.update(share.ref, { revoked: true });
      tx.create(this.db.collection('tripShares').doc(hash), { customerId: uid, tripId: id, revoked: false, createdAt: this.now() });
    });
    return { token, shareId: hash };
  }
  async readShare(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AppError(404, 'SHARE_UNAVAILABLE', 'Share unavailable.');
    const hash = createHash('sha256').update(token).digest('hex');
    return this.db.runTransaction(async tx => {
      const share = await tx.get(this.db.collection('tripShares').doc(hash));
      if (!share.exists || share.get('revoked')) throw new AppError(404, 'SHARE_UNAVAILABLE', 'Share unavailable.');
      const trip = await tx.get(this.db.collection('trips').doc(share.get('tripId')));
      const owner = await tx.get(this.db.collection('users').doc(share.get('customerId')));
      const location = await tx.get(this.db.collection('liveLocations').doc(trip.id));
      if (!liveStates.includes(trip.get('status')) || owner.get('privacy.tripSharing') === false) throw new AppError(404, 'SHARE_UNAVAILABLE', 'Share unavailable.');
      const fresh = location.exists && this.now() - location.get('observedAt') <= 30000;
      return { tripId: trip.id, status: trip.get('status'), stale: !fresh,
        position: fresh ? { lat: Math.round(location.get('lat') * 1000) / 1000, lng: Math.round(location.get('lng') * 1000) / 1000 } : null,
        observedAt: location.get('observedAt') ?? null };
    });
  }
  revokeShare(uid: string, id: string) {
    const ref = this.db.collection('tripShares').doc(identifier(id));
    return this.db.runTransaction(async tx => {
      const record = await tx.get(ref);
      if (record.get('customerId') !== uid) throw new AppError(404, 'SHARE_UNAVAILABLE', 'Share unavailable.');
      tx.update(ref, { revoked: true });
    });
  }
}
export async function clearTripLocation(db: Firestore, id: string) {
  const trip = await db.collection('trips').doc(id).get();
  if (!trip.exists || !liveStates.includes(trip.get('status'))) {
    await db.collection('liveLocations').doc(id).delete();
    await db.collection('arrivalEvidence').doc(id).delete();
    const app = getFirebaseAdminApp();
    if (app.options.databaseURL) await getDatabase(app).ref('tripLocations/' + id).set({ state: 'DISABLED' });
  }
}

export async function cleanupLocations(db: Firestore) {
  const now = Date.now();
  const samples = await db.collection('liveLocations').where('expiresAt', '<=', now).get();
  for (const sample of samples.docs) {
    await clearTripLocation(db, sample.id);
    await db.runTransaction(async tx => {
      const current = await tx.get(sample.ref);
      if (current.exists && current.get('expiresAt') <= now) {
        tx.delete(sample.ref);
        tx.delete(db.collection('arrivalEvidence').doc(sample.id));
      }
    });
    const app = getFirebaseAdminApp();
    if (app.options.databaseURL) {
      await getDatabase(app).ref('tripLocations/' + sample.id).transaction(current => {
        if (current?.state === 'DISABLED') return;
        if (current?.sample?.observedAt + 24 * 60 * 60000 <= now) return { state: 'ACTIVE' };
        return;
      });
    }
  }
  const presence = await db.collection('driverAvailability').where('expiresAt', '<=', now).get();
  for (const record of presence.docs) {
    await db.runTransaction(async tx => {
      const current = await tx.get(record.ref);
      if (current.exists && current.get('expiresAt') <= now) tx.set(record.ref, { online: false, updatedAt: now });
    });
  }
}
