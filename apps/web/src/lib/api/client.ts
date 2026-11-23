import type { AuthUser } from '../auth/types';
import { isDemoDataMode } from '../env';
import {
  bootstrapDemoSession,
  getDemoApplication,
  resubmitDriverApplicationDemo,
  saveCustomerOnboardingDemo,
  saveDriverApplicationDemo,
} from './demo';
import {
  cancelBookingDemo,
  createBookingDemo,
  createQuoteDemo,
  getCustomerDetailsDemo,
  listBookingsDemo,
  saveCustomerDetailsDemo,
  searchDriversDemo,
  setDriverFavouriteDemo,
} from './demo-booking';
import {
  advanceTripStageDemo,
  createShareLinkDemo,
  createTripReportDemo,
  driverSafetyControlDemo,
  getAdminApplicationDemo,
  getAdminCustomerDemo,
  getAdminCustomersDemo,
  getAdminOverviewDemo,
  getAdminReportsDemo,
  restoreAdminCustomerDemo,
  getDriverEarningsDemo,
  getDriverOffersDemo,
  getDriverProfileDemo,
  getSharedTripDemo,
  getTripDemo,
  payTripDemo,
  respondToOfferDemo,
  resolveReportDemo,
  reviewAdminApplicationDemo,
  revokeShareLinkDemo,
  saveDriverProfileDemo,
  setDriverOnlineDemo,
  submitTripRatingDemo,
  triggerSosDemo,
} from './demo-product';
import type {
  AdminReviewInput,
  BookingQuote,
  BookingQuoteRequest,
  BookingRecord,
  CustomerAccountRecord,
  CustomerOnboardingInput,
  CustomerProfileDetails,
  CustomerProfileUpdate,
  DriverApplicationInput,
  DriverApplicationStatus,
  DriverCandidate,
  DriverProfileUpdate,
  DriverSearchFilters,
  RatingSubmission,
  ReportResolutionInput,
  ReportSubmission,
  RoleIntent,
  VeyroProfile,
  BookingVehicle,
} from './types';

import { request, apiFetch, ApiClientError } from './transport';
import { applicationView, bookingView, candidate, customerAccount, driverProfile, iso, offerView, quoteView, reportView, tripState, tripView, type Wire } from './live-models';
import { openCheckout, type CheckoutStatus } from './razorpay-checkout';
import type { Coordinate } from '../maps/types';
export { ApiClientError } from './transport';

export interface DriverApplicationView { status: DriverApplicationStatus | null; adminReason?: string; submittedAt?: string }
const json = (body: unknown, headers?: HeadersInit): RequestInit => ({ method: 'POST', headers, body: JSON.stringify(body) });
const endpoint = (id: string) => encodeURIComponent(id);
const pendingMutations = new Map<string, string>();
async function mutation<T>(user: AuthUser, path: string, body: unknown): Promise<T> {
  const fingerprint = user.uid + ':' + path + ':' + JSON.stringify(body);
  const id = pendingMutations.get(fingerprint) ?? crypto.randomUUID();
  pendingMutations.set(fingerprint, id);
  const result = await request<T>(path, json(body, { 'Idempotency-Key': id }), await user.getIdToken());
  pendingMutations.delete(fingerprint);
  return result;
}


export async function bootstrapSession(user: AuthUser, roleIntent: RoleIntent | null): Promise<VeyroProfile> {
  if (isDemoDataMode) return bootstrapDemoSession(user, roleIntent);
  return request('/auth/session', json({ roleIntent }), await user.getIdToken());
}
export async function saveCustomerOnboarding(user: AuthUser, input: CustomerOnboardingInput): Promise<VeyroProfile> {
  if (isDemoDataMode) return saveCustomerOnboardingDemo(user.uid, input);
  return request('/customers/onboarding', json(input), await user.getIdToken());
}
export async function saveDriverApplication(user: AuthUser, input: DriverApplicationInput): Promise<VeyroProfile> {
  if (isDemoDataMode) return saveDriverApplicationDemo(user.uid, input);
  const token = await user.getIdToken();
  await request('/drivers/profile', json(input), token);
  return request('/driver-applications/me', json({ documents: input.documents.map(d => ({ id: d.id })) }), token);
}
export async function uploadApplicationDocument(user: AuthUser, kind: string, file: File) {
  const result = await request<{ id: string; storagePath: string; contentType: string; size: number }>(
    '/driver-applications/documents?kind=' + endpoint(kind),
    { method: 'POST', body: file, headers: { 'Content-Type': file.type } }, await user.getIdToken());
  return { ...result, kind, fileName: file.name, uploadedAt: new Date().toISOString() };
}
export async function getDriverApplication(user: AuthUser): Promise<DriverApplicationView> {
  if (isDemoDataMode) {
    const a = getDemoApplication(user.uid);
    return { status: a?.status ?? null, adminReason: a?.adminReason, submittedAt: a?.submittedAt };
  }
  const a = await request<Wire>('/driver-applications/me', { method: 'GET' }, await user.getIdToken());
  return { status: a.status, adminReason: a.adminReason ?? undefined, submittedAt: a.submittedAt ? iso(a.submittedAt) : undefined };
}
export async function resubmitDriverApplication(user: AuthUser): Promise<VeyroProfile> {
  if (isDemoDataMode) return resubmitDriverApplicationDemo(user.uid);
  await request('/drivers/applications/resubmit', json({}), await user.getIdToken());
  return bootstrapSession(user, 'driver');
}
export interface SearchRoute { points: Coordinate[]; pickupAt: number | null }
export async function searchDrivers(user: AuthUser, vehicle: BookingVehicle, filters: DriverSearchFilters, route?: SearchRoute): Promise<DriverCandidate[]> {
  if (isDemoDataMode) return searchDriversDemo(vehicle, filters);
  if (!route) throw new ApiClientError('Choose a pickup and destination first.');
  const token = await user.getIdToken();
  const road = await request<Wire>('/mobility/routes', json({ vehicleId: vehicle.id, ...route,
    radiusKm: filters.radiusKm, expanded: filters.radiusKm > 15 }), token);
  const results: DriverCandidate[] = [];
  let after: string | null = null;
  do {
    const page: { drivers: Wire[]; nextCursor: string | null } = await request('/drivers' + (after ? '?after=' + endpoint(after) : ''), { method: 'GET' }, token);
    const candidates = page.drivers.filter(d => d.categories.includes(vehicle.category) && d.transmissions.includes(vehicle.transmission) &&
      (filters.maxHourlyRate == null || d.hourlyRateInr <= filters.maxHourlyRate) &&
      d.experienceYears >= filters.minExperienceYears && filters.languages.every(l => d.languages.includes(l)));
    for (let i = 0; i < candidates.length; i += 5) {
      const matches = await Promise.all(candidates.slice(i, i + 5).map(async d => {
        try {
          const e = await request<Wire>('/mobility/eligibility', json({ routeId: road.routeId, driverId: d.id }), token);
          const driver = candidate({ ...d, ...e }, vehicle);
          return driver.pickupDistanceKm <= filters.maxPickupDistanceKm && driver.rating >= filters.minRating ? driver : null;
        } catch (error) {
          if (error instanceof ApiClientError && ['DRIVER_INELIGIBLE', 'DRIVER_BUSY', 'OUTSIDE_SERVICE_AREA', 'OUTSIDE_SEARCH_RADIUS'].includes(error.code)) {
            return null;
          }
          throw error;
        }
      }));
      results.push(...matches.filter(match => match !== null));
    }
    after = page.nextCursor;
  } while (after);
  return results.sort((a, b) => filters.sort === 'LOWEST_FARE' ? a.hourlyRate - b.hourlyRate :
    filters.sort === 'HIGHEST_RATED' ? b.rating - a.rating : a.pickupDistanceKm - b.pickupDistanceKm);
}
export async function requestBookingQuote(user: AuthUser, input: BookingQuoteRequest): Promise<BookingQuote> {
  if (isDemoDataMode) return createQuoteDemo(input);
  const token = await user.getIdToken(), pickupAt = input.pickupAt ? Date.parse(input.pickupAt) : null;
  const road = await request<Wire>('/mobility/routes', json({ vehicleId: input.vehicle.id,
    points: [input.pickup, ...input.stops, input.destination].map(p => p.position), pickupAt,
    radiusKm: input.filters.radiusKm, expanded: input.filters.radiusKm > 15 }), token);
  if (input.bookingType === 'INSTANT') await request('/mobility/eligibility', json({ routeId: road.routeId, driverId: input.driver.id }), token);
  const q = await request<Wire>('/bookings/quotes', json({ vehicleId: input.vehicle.id, routeId: road.routeId,
    driverId: input.bookingType === 'INSTANT' ? input.driver.id : null,
    maxHourlyRateInr: input.filters.maxHourlyRate ?? input.driver.hourlyRate }), token);
  return quoteView(q.quoteId, q.fare, input.driver, pickupAt, road.routeId);
}
export async function createBooking(user: AuthUser, input: BookingQuoteRequest, quote: BookingQuote): Promise<BookingRecord> {
  if (isDemoDataMode) return createBookingDemo(user.uid, input, quote);
  const token = await user.getIdToken();
  const result = await request<{ bookingId: string }>('/bookings', json({ quoteId: quote.quoteId,
    pickupAt: input.pickupAt ? Date.parse(input.pickupAt) : null }), token);
  return bookingView(await request<Wire>('/views/trips/' + endpoint(result.bookingId), { method: 'GET' }, token));
}
export async function listBookings(user: AuthUser): Promise<BookingRecord[]> {
  if (isDemoDataMode) return listBookingsDemo(user.uid);
  return (await request<Wire[]>('/views/bookings', { method: 'GET' }, await user.getIdToken())).map(bookingView);
}
export async function cancelBooking(user: AuthUser, bookingId: string, reason: string): Promise<BookingRecord[]> {
  if (isDemoDataMode) return cancelBookingDemo(user.uid, bookingId, reason);
  await request('/bookings/' + endpoint(bookingId) + '/cancel', json({ reason }), await user.getIdToken());
  return listBookings(user);
}
export async function getCustomerDetails(user: AuthUser): Promise<CustomerProfileDetails> {
  if (isDemoDataMode) return getCustomerDetailsDemo(user);
  return request('/customers/me', { method: 'GET' }, await user.getIdToken());
}
export async function saveCustomerDetails(user: AuthUser, input: CustomerProfileUpdate): Promise<CustomerProfileDetails> {
  if (isDemoDataMode) return saveCustomerDetailsDemo(user, input);
  await request('/customers/me', { method: 'PATCH', body: JSON.stringify(input) }, await user.getIdToken());
  return getCustomerDetails(user);
}
export async function getTrip(user: AuthUser, tripId: string) {
  if (isDemoDataMode) return getTripDemo(user.uid, tripId);
  const token = await user.getIdToken();
  let view = await request<Wire>('/views/trips/' + endpoint(tripId), { method: 'GET' }, token);
  if (!view.trip && view.booking?.status === 'ASSIGNED' && view.booking.driverId === user.uid) {
    await request('/trips/' + endpoint(tripId) + '/initialize', json({}), token);
    view = await request<Wire>('/views/trips/' + endpoint(tripId), { method: 'GET' }, token);
  }
  return tripView(view);
}
export async function advanceTripStage(user: AuthUser, tripId: string, action: 'ARRIVED' | 'START' | 'END' | 'NO_SHOW_REQUEST', input: { otp?: string } = {}) {
  if (isDemoDataMode) return advanceTripStageDemo(user.uid, tripId, action, input);
  const path = { ARRIVED: 'arrival', START: 'start', END: 'complete', NO_SHOW_REQUEST: 'customer-no-show' }[action];
  await request('/trips/' + endpoint(tripId) + '/' + path, json({ code: input.otp }), await user.getIdToken());
  return getTrip(user, tripId);
}
export async function confirmDriverArrival(user: AuthUser, tripId: string) {
  await request('/trips/' + endpoint(tripId) + '/arrival/confirm', json({}), await user.getIdToken());
  return getTrip(user, tripId);
}
export async function triggerSos(user: AuthUser, tripId: string) {
  if (isDemoDataMode) return triggerSosDemo(user.uid, tripId);
  const result = await mutation<Wire>(user, '/sos', { tripId });
  return { id: result.id, createdAt: new Date().toISOString(), position: { lat: 0, lng: 0 }, contacts: [], demo: true };
}
export async function createTripShare(user: AuthUser, tripId: string) {
  if (isDemoDataMode) return createShareLinkDemo(user.uid, tripId);
  const result = await request<{ token: string; shareId: string }>('/shares', json({ tripId }), await user.getIdToken());
  return { ...result, createdAt: new Date().toISOString(), expiresAt: '' };
}
export async function revokeTripShare(user: AuthUser, shareId: string) {
  if (isDemoDataMode) return revokeShareLinkDemo(user.uid, shareId);
  await request('/shares/' + endpoint(shareId) + '/revoke', json({}), await user.getIdToken());
  return null;
}
export async function getSharedTrip(user: AuthUser, token: string) {
  if (isDemoDataMode) return getSharedTripDemo(token);
  const result = await request<Wire>('/shares/view', { method: 'GET', headers: { 'X-Trip-Share': token } }, await user.getIdToken());
  return { tripId: result.tripId, state: tripState(result.status), pickupLabel: 'Private pickup', destinationLabel: 'Private destination',
    pickupPosition: null, destinationPosition: null, driverName: null, driverVehicle: null, driverEtaMinutes: null,
    liveLocation: result.position ? { position: result.position, updatedAt: iso(result.observedAt), accuracyMeters: 0, stale: result.stale } : null,
    shareExpiresAt: '', demo: false };
}
export async function submitTripRating(user: AuthUser, tripId: string, input: RatingSubmission) {
  if (isDemoDataMode) return submitTripRatingDemo(user.uid, tripId, input);
  await request('/views/trips/' + endpoint(tripId) + '/rating', json(input), await user.getIdToken());
  return getTrip(user, tripId);
}
export async function createTripReport(user: AuthUser, input: ReportSubmission) {
  if (isDemoDataMode) return createTripReportDemo(user.uid, input);
  const result = await mutation<{ id: string }>(user, '/reports', input);
  return reportView({ ...result, ...input, status: 'OPEN', createdAt: Date.now() });
}
export async function payInvoice(user: AuthUser, invoiceId: string): Promise<CheckoutStatus> {
  if (isDemoDataMode) {
    const trip = payTripDemo(user.uid, invoiceId);
    return trip.finalFare?.paymentStatus === 'CAPTURED' ? 'CAPTURED' : 'PENDING';
  }
  return openCheckout(user, invoiceId);
}
export async function getDriverOffers(user: AuthUser) {
  if (isDemoDataMode) return getDriverOffersDemo(user.uid);
  return (await request<Wire[]>('/views/offers', { method: 'GET' }, await user.getIdToken())).map(offerView);
}
export async function respondToDriverOffer(user: AuthUser, offerId: string, action: 'ACCEPT' | 'DECLINE') {
  if (isDemoDataMode) return respondToOfferDemo(user.uid, offerId, action);
  const token = await user.getIdToken();
  await request('/driver-offers/' + endpoint(offerId) + (action === 'ACCEPT' ? '/accept' : '/reject'), json({}), token);
  return getDriverOffers(user);
}
export async function currentPosition(): Promise<GeolocationPosition> {
  if (!navigator.geolocation) throw new ApiClientError('Location is unavailable on this device.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve,
    () => reject(new ApiClientError('Allow location access to go online.')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
}
export async function setDriverOnline(user: AuthUser, online: boolean, renew = false) {
  if (isDemoDataMode) return setDriverOnlineDemo(user.uid, online);
  const p = online ? await currentPosition() : null;
  if (renew && document.visibilityState === 'hidden') return getDriverProfile(user);
  await request('/availability', json({ online, ...(renew ? { renew: true } : {}),
    ...(p ? { position: { lat: p.coords.latitude, lng: p.coords.longitude } } : {}) }), await user.getIdToken());
  return getDriverProfile(user);
}
export async function publishTripLocation(user: AuthUser, tripId: string, p: GeolocationPosition) {
  return request('/locations/' + endpoint(tripId), json({ position: { lat: p.coords.latitude, lng: p.coords.longitude },
    accuracy: p.coords.accuracy, observedAt: Math.floor(p.timestamp) }), await user.getIdToken());
}
export async function getDriverProfile(user: AuthUser) {
  if (isDemoDataMode) return getDriverProfileDemo(user);
  return driverProfile(await request<Wire>('/views/driver-profile', { method: 'GET' }, await user.getIdToken()), user.uid);
}
export async function saveDriverProfile(user: AuthUser, input: DriverProfileUpdate) {
  if (isDemoDataMode) return saveDriverProfileDemo(user, input);
  const p = await getDriverProfile(user);
  await request('/drivers/profile', json({ ...input, transmissions: input.transmissions ?? p.transmissions,
    hourlyRateInr: input.hourlyRateInr ?? p.hourlyRateInr }), await user.getIdToken());
  return getDriverProfile(user);
}
export async function getDriverEarnings(user: AuthUser) {
  if (isDemoDataMode) return getDriverEarningsDemo(user.uid);
  const token = await user.getIdToken(), profile = await getDriverProfile(user);
  const rows = await request<Wire[]>('/views/earnings', { method: 'GET' }, token);
  const entries = rows.filter(r => r.netPaise != null).map(r => ({ id: r.id, tripId: r.id, completedAt: iso(r.createdAt),
    description: r.source.replaceAll('_', ' '), grossInr: (r.amountPaise - r.waitingPaise - r.adjustmentPaise) / 100, waitingCreditInr: r.waitingPaise / 100,
    commissionInr: (r.commissionPaise ?? 0) / 100, adjustmentInr: r.adjustmentPaise / 100, netInr: r.netPaise / 100, demo: false, status: r.status }));
  return { totalNetInr: entries.reduce((sum, e) => sum + e.netInr, 0), grossInr: entries.reduce((sum, e) => sum + e.grossInr, 0),
    waitingCreditInr: entries.reduce((sum, e) => sum + e.waitingCreditInr, 0), commissionInr: entries.reduce((sum, e) => sum + e.commissionInr, 0), adjustmentsInr: entries.reduce((sum, e) => sum + e.adjustmentInr, 0), completedTrips: entries.length, hourlyRateInr: profile.hourlyRateInr,
    rateEffectiveFrom: profile.updatedAt, rateChangeCopy: 'Rate changes apply to future accepted bookings.', entries, demo: false };
}
export async function getAdminOverview(user: AuthUser) {
  if (isDemoDataMode) return getAdminOverviewDemo(user.uid);
  const v = await request<Wire>('/views/admin/overview', { method: 'GET' }, await user.getIdToken());
  return { pendingApplications: v.pendingApplications, approvedDrivers: v.approvedDrivers, rejectedApplications: v.rejectedApplications,
    openReports: v.openReports, applications: (v.applications as Wire[]).map(applicationView), demo: false };
}
export async function getAdminApplication(user: AuthUser, applicationId: string) {
  if (isDemoDataMode) return getAdminApplicationDemo(user.uid, applicationId);
  return applicationView(await request<Wire>('/views/admin/applications/' + endpoint(applicationId), { method: 'GET' }, await user.getIdToken()));
}
export async function downloadApplicationDocument(user: AuthUser, applicationId: string, uploadId: string) {
  const response = await apiFetch('/admin/applications/' + endpoint(applicationId) + '/documents/' + endpoint(uploadId), { method: 'GET' }, await user.getIdToken());
  if (!response.ok) throw new ApiClientError('Document download failed.');
  return response.blob();
}
export async function reviewAdminApplication(user: AuthUser, applicationId: string, input: AdminReviewInput) {
  if (isDemoDataMode) return reviewAdminApplicationDemo(user.uid, applicationId, input);
  await mutation(user, '/admin/driver-applications/' + endpoint(applicationId) + '/decision', { action: input.action,
    reason: input.reason, requestedChanges: input.missingItems });
  return getAdminApplication(user, applicationId);
}
export async function driverSafetyControl(user: AuthUser, driverUid: string, input: { action: 'DEACTIVATE' | 'RESTORE'; reason: string }) {
  if (isDemoDataMode) return driverSafetyControlDemo(user.uid, driverUid, input);
  await mutation(user, '/admin/drivers/' + endpoint(driverUid) + '/control', input);
  return getAdminApplication(user, driverUid);
}
export async function getAdminReports(user: AuthUser) {
  if (isDemoDataMode) return getAdminReportsDemo(user.uid);
  return (await request<Wire[]>('/admin/reports', { method: 'GET' }, await user.getIdToken())).map(reportView);
}
export async function resolveAdminReport(user: AuthUser, reportId: string, input: ReportResolutionInput) {
  if (isDemoDataMode) return resolveReportDemo(user.uid, reportId, input);
  const status = input.action === 'RESOLVE' ? 'RESOLVED' : input.action === 'DISMISS' ? 'DISMISSED' : 'UNDER_REVIEW';
  await request('/admin/reports/' + endpoint(reportId) + '/resolve', json({ status, note: input.note }), await user.getIdToken());
  return reportView(await request<Wire>('/admin/reports/' + endpoint(reportId), { method: 'GET' }, await user.getIdToken()));
}
export async function listFavouriteDriverIds(user: AuthUser): Promise<string[]> {
  return isDemoDataMode ? getCustomerDetailsDemo(user).favouriteDriverIds : (await getCustomerDetails(user)).favouriteDriverIds;
}
export async function setDriverFavourite(user: AuthUser, driverId: string, favourite: boolean): Promise<string[]> {
  if (isDemoDataMode) return setDriverFavouriteDemo(user, driverId, favourite).favouriteDriverIds;
  return request('/views/favourites', json({ driverId, favourite }), await user.getIdToken());
}
export async function getAdminCustomers(user: AuthUser): Promise<CustomerAccountRecord[]> {
  if (isDemoDataMode) return getAdminCustomersDemo();
  return (await request<Wire[]>('/views/admin/customers', { method: 'GET' }, await user.getIdToken())).map(customerAccount);
}
export async function getAdminCustomer(user: AuthUser, customerId: string) {
  if (isDemoDataMode) return getAdminCustomerDemo(customerId);
  return customerAccount(await request<Wire>('/views/admin/customers/' + endpoint(customerId), { method: 'GET' }, await user.getIdToken()));
}
export async function restoreAdminCustomer(user: AuthUser, customerId: string, reason: string) {
  if (isDemoDataMode) return restoreAdminCustomerDemo(user.uid, customerId, reason);
  await mutation(user, '/admin/customers/' + endpoint(customerId) + '/restore', { reason });
  return getAdminCustomer(user, customerId);
}
export async function customerAvatar(user: AuthUser, file?: File | null): Promise<Blob | null> {
  const token = await user.getIdToken();
  if (file === null) { await request('/customers/me/avatar', { method: 'DELETE' }, token); return null; }
  if (file) await request('/customers/me/avatar', { method: 'POST', body: file, headers: { 'Content-Type': file.type } }, token);
  const response = await apiFetch('/customers/me/avatar', { method: 'GET' }, token);
  if (!response.ok) throw new ApiClientError('Profile photo could not load.');
  return response.blob();
}
export async function getNotifications(user: AuthUser, role: NotificationRole) {
  if (isDemoDataMode) return [];
  const rows = await request<Wire[]>('/notifications?role=' + role, { method: 'GET' }, await user.getIdToken());
  return rows.map(r => ({ id: r.id, title: String(r.title ?? r.type ?? 'Veyro update'), createdAt: iso(r.createdAt), read: r.read === true }));
}
export type NotificationRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export async function markNotificationRead(user: AuthUser, id: string, role: NotificationRole) {
  return request('/notifications/' + endpoint(id) + '/read', json({ role }), await user.getIdToken());
}
export async function requestAccountDeletion(user: AuthUser, role: 'CUSTOMER' | 'DRIVER' = 'CUSTOMER') {
  if (isDemoDataMode) return { status: 'POLICY_REVIEW_REQUIRED' };
  return request<{ status: string }>((role === 'DRIVER' ? '/drivers' : '/customers') + '/me/deletion-request', json({}), await user.getIdToken());
}

export async function requestRoadPreview(user: AuthUser, vehicleId: string, points: Coordinate[]) {
  const road = await request<{ routeId: string; distanceKm: number; durationMinutes: number; path?: Coordinate[] }>('/mobility/routes', json({ vehicleId, points }), await user.getIdToken());
  return { provider: 'google' as const, routeId: road.routeId, distanceKm: road.distanceKm, durationMinutes: road.durationMinutes,
    path: road.path ?? [], summary: 'Server road route', calculatedAt: new Date().toISOString() };
}
