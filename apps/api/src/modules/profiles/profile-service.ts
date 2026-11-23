import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles } from '../auth/profile.js';
import { point } from '../mobility/geo.js';
import { documentId } from '../quotes/quote-repository.js';
import { enqueueNotification } from '../notifications/notifications.js';

export function text(value: unknown, max = 150): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AppError(400, 'INVALID_INPUT', 'A required field is invalid.');
  return value.trim();
}
export function identifier(value: unknown): string {
  try { return documentId(text(value, 128)); }
  catch { throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid resource identifier.'); }
}
function choices(value: unknown, allowed?: string[]): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new AppError(400, 'INVALID_INPUT', 'Select supported values.');
  const result = [...new Set(value.map(v => allowed ? text(v, 50).toUpperCase() : text(v, 50)))];
  if (allowed && result.some(v => !allowed.includes(v))) throw new AppError(400, 'INVALID_INPUT', 'Unsupported selection.');
  return result;
}
export function vehicleInput(body: Record<string, unknown>) {
  return {
    make: text(body.make, 60),
    model: text(body.model, 60),
    category: choices([body.category], ['STANDARD', 'PREMIUM', 'LUXURY', 'HATCHBACK', 'SEDAN', 'SUV', 'MPV'])[0]!,
    transmission: choices([body.transmission], ['MANUAL', 'AUTOMATIC'])[0]!,
    fuelType: text(body.fuelType, 40),
  };
}
export class ProfileService {
  constructor(private readonly db: Firestore) {}
  private async authorized(tx: Transaction, uid: string, role: 'CUSTOMER' | 'DRIVER') {
    const ref = this.db.collection('users').doc(identifier(uid));
    const profile = await tx.get(ref);
    if (!activeRoles(profile.data()).includes(role)) throw new AppError(403, 'ROLE_FORBIDDEN', 'Required product role is missing.');
    return { ref, profile };
  }
  updateCustomer(uid: string, body: Record<string, unknown>) {
    if (body.vehicles !== undefined && (!Array.isArray(body.vehicles) || body.vehicles.length > 20)) throw new AppError(400, 'INVALID_VEHICLES', 'Use up to twenty vehicles.');
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.fullName !== undefined) update.name = update.fullName = text(body.fullName, 100);
    if (body.phone !== undefined) {
      const phone = text(body.phone, 25);
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new AppError(400, 'INVALID_PROFILE', 'Use an international phone number.');
      update.phone = phone;
    }
    if (body.emergencyContacts !== undefined) {
      if (!Array.isArray(body.emergencyContacts) || body.emergencyContacts.length > 5) throw new AppError(400, 'INVALID_CONTACTS', 'Use up to five contacts.');
      update.emergencyContacts = body.emergencyContacts.map(c => {
        const phone = text(c?.phone, 25);
        if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new AppError(400, 'INVALID_CONTACTS', 'Use international contact numbers.');
        return { id: identifier(c.id), name: text(c.name, 100), relationship: text(c.relationship, 50), phone };
      });
    }
    for (const [field, keys] of Object.entries({ notifications: ['bookingUpdates', 'tripStatus', 'safetyAlerts', 'serviceMessages'], privacy: ['tripSharing', 'matchingProfile', 'analytics'] })) {
      if (body[field] === undefined) continue;
      const value = body[field] as Record<string, unknown> | null;
      if (!value || Array.isArray(value) || keys.some(k => typeof value[k] !== 'boolean')) throw new AppError(400, 'INVALID_PREFERENCES', 'Provide boolean preferences.');
      update[field] = Object.fromEntries(keys.map(k => [k, value[k]]));
    }
    return this.db.runTransaction(async tx => {
      const { ref, profile } = await this.authorized(tx, uid, 'CUSTOMER');
      const writes: { ref: ReturnType<Firestore['doc']>; value: Record<string, unknown> | null }[] = [];
      if (Array.isArray(body.vehicles)) {
        const own = await tx.get(this.db.collection('vehicles').where('customerId', '==', uid));
        const existing = new Map(own.docs.map(d => [d.id, d]));
        const submitted = new Set<string>();
        for (const input of body.vehicles) {
          if (!input || typeof input !== 'object') throw new AppError(400, 'INVALID_VEHICLES', 'Invalid vehicle.');
          const value = { ...vehicleInput(input), registrationNumber: input.registrationNumber == null || input.registrationNumber === '' ? '' : text(input.registrationNumber, 30) };
          const suppliedId = input.id == null ? null : identifier(input.id);
          if (suppliedId && submitted.has(suppliedId)) throw new AppError(400, 'INVALID_VEHICLES', 'Duplicate vehicle.');
          if (suppliedId) submitted.add(suppliedId);
          const previous = suppliedId ? await tx.get(this.db.collection('vehicles').doc(suppliedId)) : null;
          if (previous?.exists && previous.get('customerId') !== uid) throw new AppError(404, 'VEHICLE_UNAVAILABLE', 'Vehicle unavailable.');
          const vehicleRef = previous?.exists ? previous.ref : this.db.collection('vehicles').doc(randomUUID());
          existing.delete(vehicleRef.id);
          if (previous?.exists && Object.entries(value).every(([k, v]) => (previous.get(k) ?? '') === v)) continue;
          writes.push({ ref: vehicleRef, value: { ...value, customerId: uid, updatedAt: update.updatedAt } });
        }
        for (const removed of existing.values()) writes.push({ ref: removed.ref, value: null });
        for (const write of writes) {
          const bookings = await tx.get(this.db.collection('bookings').where('vehicleId', '==', write.ref.id)
            .where('status', 'in', ['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED']));
          for (const booking of bookings.docs) {
            const trip = await tx.get(this.db.collection('trips').doc(booking.id));
            if (!['COMPLETED', 'CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(trip.get('status'))) throw new AppError(409, 'VEHICLE_RESERVED', 'Vehicle changes require an inactive booking.');
          }
        }
      }
      const shares = (update.privacy as Record<string, unknown> | undefined)?.tripSharing === false ?
        await tx.get(this.db.collection('tripShares').where('customerId', '==', uid)) : null;
      tx.update(ref, update);
      const identityChanged = ['fullName', 'phone'].some(key => update[key] !== undefined && update[key] !== profile.get(key));
      const profileUpdateId = 'profile-updated-' + new Date().toISOString().slice(0, 10);
      if (identityChanged && profile.get('lastProfileNotice') !== profileUpdateId) {
        tx.update(ref, { lastProfileNotice: profileUpdateId });
        enqueueNotification(this.db, tx, uid, profileUpdateId, 'PROFILE_UPDATED', uid);
      }
      for (const share of shares?.docs ?? []) if (share.get('revoked') !== true) tx.update(share.ref, { revoked: true });
      for (const write of writes) {
        if (write.value) tx.set(write.ref, write.value); else tx.delete(write.ref);
      }
    });
  }
  customer(uid: string, body: Record<string, unknown>) {
    const fullName = text(body.fullName, 100);
    let phone = text(body.phone, 25);
    const cleanDigits = phone.replace(/[\s-]/g, '');
    if (/^[6-9]\d{9}$/.test(cleanDigits)) {
      phone = `+91${cleanDigits}`;
    } else if (/^0[6-9]\d{9}$/.test(cleanDigits)) {
      phone = `+91${cleanDigits.slice(1)}`;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(phone) || body.consentTerms !== true || body.consentPrivacy !== true) {
      throw new AppError(400, 'INVALID_PROFILE', 'Valid phone and consent are required.');
    }
    const vehicle = body.vehicle == null ? null : vehicleInput(body.vehicle as Record<string, unknown>);
    return this.db.runTransaction(async tx => {
      const { ref, profile } = await this.authorized(tx, uid, 'CUSTOMER');
      if (vehicle) {
        const currentVehicle = await tx.get(this.db.collection('vehicles').doc(uid + '-primary'));
        if (currentVehicle.exists && currentVehicle.get('customerId') !== uid) throw new AppError(409, 'VEHICLE_CONFLICT', 'Primary vehicle identifier is unavailable.');
        const bookings = await tx.get(this.db.collection('bookings').where('vehicleId', '==', uid + '-primary')
          .where('status', 'in', ['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED']));
        for (const booking of bookings.docs) {
          const trip = await tx.get(this.db.collection('trips').doc(booking.id));
          if (!['COMPLETED', 'CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(trip.get('status'))) {
            throw new AppError(409, 'VEHICLE_RESERVED', 'Vehicle changes require an inactive booking.');
          }
        }
      }
      const updatedAt = new Date().toISOString();
      tx.update(ref, { fullName, name: fullName, phone, onboardingComplete: true, updatedAt,
        consent: { terms: true, privacy: true, recordedAt: updatedAt } });
      if (!profile.get('onboardingComplete')) enqueueNotification(this.db, tx, uid, 'profile-completed', 'PROFILE_COMPLETED', uid);
      if (vehicle) tx.set(this.db.collection('vehicles').doc(uid + '-primary'), { ...vehicle, customerId: uid, updatedAt });
      return { uid, role: 'CUSTOMER', fullName, phone, onboardingComplete: true, updatedAt };
    });
  }
  vehicle(uid: string, id: string, body: Record<string, unknown> | null, create = false) {
    const ref = this.db.collection('vehicles').doc(identifier(id));
    const vehicle = body ? vehicleInput(body) : null;
    return this.db.runTransaction(async tx => {
      await this.authorized(tx, uid, 'CUSTOMER');
      const existing = await tx.get(ref);
      const bookings = await tx.get(this.db.collection('bookings').where('vehicleId', '==', id)
        .where('status', 'in', ['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED']));
      if (!existing.exists && vehicle && !create) throw new AppError(404, 'VEHICLE_UNAVAILABLE', 'Vehicle unavailable.');
      if (existing.exists && existing.get('customerId') !== uid) throw new AppError(404, 'VEHICLE_UNAVAILABLE', 'Vehicle unavailable.');
      // ASSIGNED bookings with a terminal trip no longer lock the vehicle.
      for (const booking of bookings.docs) {
        const trip = await tx.get(this.db.collection('trips').doc(booking.id));
        if (!['COMPLETED', 'CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(trip.get('status'))) {
          throw new AppError(409, 'VEHICLE_RESERVED', 'Vehicle changes require an inactive booking.');
        }
      }
      if (vehicle) tx.set(ref, { ...vehicle, customerId: uid, updatedAt: new Date().toISOString() });
      else if (existing.exists) tx.delete(ref);
    });
  }
  driver(uid: string, body: Record<string, unknown>) {
    const rawRate = body.hourlyRateInr ?? body.hourlyRate;
    if (typeof rawRate !== 'number' && (typeof rawRate !== 'string' || !rawRate.trim())) throw new AppError(400, 'INVALID_RATE', 'A numeric hourly rate is required.');
    const rate = Number(rawRate);
    const perKmRateInr = body.perKmRate == null || body.perKmRate === '' ? null : Number(body.perKmRate);
    if (perKmRateInr !== null && (!Number.isFinite(perKmRateInr) || perKmRateInr < 0 || perKmRateInr > Number.MAX_SAFE_INTEGER)) {
      throw new AppError(400, 'INVALID_RATE', 'Invalid stored per-kilometre rate.');
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > Number.MAX_SAFE_INTEGER) throw new AppError(400, 'INVALID_RATE', 'Invalid hourly rate.');
    const categories = choices(body.categories, ['STANDARD', 'PREMIUM', 'LUXURY', 'HATCHBACK', 'SEDAN', 'SUV', 'MPV']);
    const transmissions = choices(body.transmissions, ['MANUAL', 'AUTOMATIC']);
    const languages = choices(body.languages);
    const fullName = text(body.fullName, 100);
    let phone = text(body.phone, 25);
    const cleanDigits = phone.replace(/[\s-]/g, '');
    if (/^[6-9]\d{9}$/.test(cleanDigits)) {
      phone = `+91${cleanDigits}`;
    } else if (/^0[6-9]\d{9}$/.test(cleanDigits)) {
      phone = `+91${cleanDigits.slice(1)}`;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new AppError(400, 'INVALID_PROFILE', 'Use an E.164 phone number.');
    const experienceYears = Number(body.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > Number.MAX_SAFE_INTEGER) throw new AppError(400, 'INVALID_PROFILE', 'Invalid experience.');
    let serviceAreaPlaceIds: string[] | undefined;
    if (body.serviceAreaPlaceIds !== undefined) {
      const ids = body.serviceAreaPlaceIds;
      if (!Array.isArray(ids) || !ids.length || ids.length > 10 || new Set(ids).size !== ids.length ||
        ids.some(id => typeof id !== 'string' || !/^[\w-]{1,512}$/.test(id))) {
        throw new AppError(400, 'INVALID_SERVICE_AREA', 'Choose up to ten distinct service areas.');
      }
      serviceAreaPlaceIds = ids as string[];
    }
    const serviceAreas = serviceAreaPlaceIds ? `${serviceAreaPlaceIds.length} selected service areas` : text(body.serviceAreas, 500);
    let serviceAreaBounds: { southWest: { lat: number; lng: number }; northEast: { lat: number; lng: number } } | undefined;
    if (body.serviceAreaBounds != null) {
      const bounds = body.serviceAreaBounds as Record<string, unknown>;
      serviceAreaBounds = { southWest: point(bounds.southWest), northEast: point(bounds.northEast) };
      if (serviceAreaBounds.southWest.lat > serviceAreaBounds.northEast.lat || serviceAreaBounds.southWest.lng > serviceAreaBounds.northEast.lng) {
        throw new AppError(400, 'INVALID_SERVICE_AREA', 'Invalid service area bounds.');
      }
    }
    return this.db.runTransaction(async tx => {
      const { ref } = await this.authorized(tx, uid, 'DRIVER');
      const driver = this.db.collection('drivers').doc(uid);
      const previous = await tx.get(driver);
      const applicationRef = this.db.collection('driverApplications').doc(uid);
      const application = await tx.get(applicationRef);
      const sameCapabilities = JSON.stringify(previous.get('categories')) === JSON.stringify(categories) &&
        JSON.stringify(previous.get('transmissions')) === JSON.stringify(transmissions) &&
        previous.get('fullName') === fullName && previous.get('phone') === phone &&
        previous.get('serviceAreas') === serviceAreas &&
        (!serviceAreaPlaceIds || JSON.stringify(previous.get('serviceAreaPlaceIds')) === JSON.stringify(serviceAreaPlaceIds)) &&
        (!serviceAreaBounds || previous.get('serviceAreaBounds.southWest.lat') === serviceAreaBounds.southWest.lat &&
          previous.get('serviceAreaBounds.southWest.lng') === serviceAreaBounds.southWest.lng &&
          previous.get('serviceAreaBounds.northEast.lat') === serviceAreaBounds.northEast.lat &&
          previous.get('serviceAreaBounds.northEast.lng') === serviceAreaBounds.northEast.lng);
      const approvalStatus = previous.exists && sameCapabilities ? previous.get('approvalStatus') ?? 'PENDING_REVIEW' : 'PENDING_REVIEW';
      tx.set(driver, { fullName, phone, experienceYears, languages, categories, transmissions, serviceAreas,
        ...(serviceAreaPlaceIds ? { serviceAreaPlaceIds } : {}),
        ...(serviceAreaBounds ? { serviceAreaBounds } : previous.get('serviceAreaBounds') ? { serviceAreaBounds: previous.get('serviceAreaBounds') } : {}),
        hourlyRateInr: rate, perKmRateInr: body.perKmRate === undefined ? previous.get('perKmRateInr') ?? null : perKmRateInr, pricing_mode: 'HOURLY', approvalStatus, ...(approvalStatus !== 'APPROVED' ? { online: false } : {}), updatedAt: new Date().toISOString() }, { merge: true });
      tx.update(ref, { fullName, name: fullName, phone, updatedAt: new Date().toISOString() });
      if (!sameCapabilities && application.exists) {
        tx.update(applicationRef, { status: 'NEEDS_CHANGES', reviewReason: 'Profile details changed; resubmission required.' });
      }
      if (approvalStatus !== 'APPROVED') tx.set(this.db.collection('driverAvailability').doc(uid), { online: false, updatedAt: Date.now() });
    });
  }
  submitApplication(uid: string, documents: unknown) {
    if (!Array.isArray(documents) || documents.length !== 3) throw new AppError(400, 'DOCUMENTS_REQUIRED', 'Licence, government ID and photo are required.');
    return this.db.runTransaction(async tx => {
      const { ref: userRef, profile: userProfile } = await this.authorized(tx, uid, 'DRIVER');
      const ref = this.db.collection('driverApplications').doc(uid);
      const old = await tx.get(ref);
      const driver = await tx.get(this.db.collection('drivers').doc(uid));
      const verified = [];
      const kinds = new Set<string>();
      for (const input of documents) {
        const upload = await tx.get(this.db.collection('driverUploads').doc(identifier(input?.id)));
        if (upload.get('uid') !== uid || upload.get('verified') !== true) {
          throw new AppError(409, 'DOCUMENT_UNVERIFIED', 'Upload verification is required.');
        }
        const kind = upload.get('kind');
        if (!['LICENCE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'].includes(kind) || kinds.has(kind)) throw new AppError(400, 'DOCUMENTS_REQUIRED', 'Each document kind is required once.');
        kinds.add(kind);
        verified.push({ id: upload.id, storagePath: upload.get('storagePath'), kind, generation: upload.get('generation') });
      }
      if (!driver.exists) throw new AppError(409, 'DRIVER_PROFILE_REQUIRED', 'Save the driver profile first.');
      const storedDocuments: unknown = old.get('documents');
      const sameDocuments = Array.isArray(storedDocuments) && storedDocuments.length === verified.length &&
        verified.every(document => storedDocuments.some(existing => existing.id === document.id &&
          existing.kind === document.kind && existing.generation === document.generation &&
          existing.storagePath === document.storagePath));
      if (old.get('status') === 'PENDING_REVIEW' && sameDocuments) {
        if (userProfile.get('onboardingComplete') !== true || userProfile.get('applicationStatus') !== 'PENDING_REVIEW') {
          tx.update(userRef, { onboardingComplete: true, applicationStatus: 'PENDING_REVIEW', updatedAt: new Date().toISOString() });
        }
        if (driver.get('approvalStatus') !== 'PENDING_REVIEW') {
          tx.update(driver.ref, { approvalStatus: 'PENDING_REVIEW' });
          tx.set(this.db.collection('driverAvailability').doc(uid), { online: false, updatedAt: Date.now() });
        }
        return;
      }
      if (old.exists && !['NEEDS_CHANGES', 'REJECTED'].includes(old.get('status'))) throw new AppError(409, 'APPLICATION_STATE_CONFLICT', 'Application is already under review or approved.');
      tx.set(ref, { driverId: uid, uid, status: 'PENDING_REVIEW', documents: verified, submittedAt: new Date().toISOString() });
      enqueueNotification(this.db, tx, uid, 'application-submitted-' + randomUUID(), 'DRIVER_APPLICATION_SUBMITTED', uid);
      tx.update(driver.ref, { approvalStatus: 'PENDING_REVIEW' });
      tx.update(userRef, { onboardingComplete: true, applicationStatus: 'PENDING_REVIEW', updatedAt: new Date().toISOString() });
      tx.set(this.db.collection('driverAvailability').doc(uid), { online: false, updatedAt: Date.now() });
    });
  }
}
