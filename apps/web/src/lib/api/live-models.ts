import type { AdminApplicationRecord, BookingQuote, BookingRecord, DriverCandidate, DriverOffer, DriverProfileDetails, FinalFare, TripRecord, TripState, CustomerAccountRecord, DriverDocumentMeta, ReportRecord } from './types';

// Canonical API records are normalized here; screens never consume an unchecked demo-shaped response.
export type Wire = Record<string, any>;
export function iso(value: unknown): string {
  if (value == null || value === '') return '';
  if (value && typeof value === 'object' && '_seconds' in value) return new Date(Number(value._seconds) * 1000).toISOString();
  const date = new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}
export function candidate(d: Wire, vehicle?: Wire): DriverCandidate {
  return { id: d.id, name: d.fullName ?? d.firstName ?? 'Driver', rating: d.rating ?? 0, reviews: d.reviews ?? 0,
    experienceYears: Number(d.experienceYears ?? 0), languages: d.languages ?? [], hourlyRate: d.hourlyRateInr,
    pickupDistanceKm: d.pickupDistanceKm ?? 0, responseEtaMinutes: d.pickupEtaMinutes ?? 0, verified: true,
    vehicle: { make: vehicle?.make ?? '', model: vehicle?.model ?? '', category: vehicle?.category ?? '',
      transmission: vehicle?.transmission ?? 'MANUAL', fuelType: vehicle?.fuelType ?? '' },
    ...(d.position && typeof d.position === 'object' && 'lat' in d.position ? { position: { lat: d.position.lat, lng: d.position.lng } } : {}) };
}
export function quoteView(id: string, fare: Wire, driver: DriverCandidate, pickupAt: number | null, routeId?: string): BookingQuote {
  return { quoteId: id, routeId, currency: 'INR', pricingMode: 'HOURLY', driver, hourlyRate: fare.hourlyRateInr,
    estimatedDistanceKm: fare.estimatedRouteKm, estimatedDurationMinutes: fare.estimatedRouteMinutes,
    estimatedBaseFare: fare.estimatedBaseFareInr, policyVersion: fare.cancellationPolicyVersion,
    waitingPolicy: '15 minutes free; ₹50 after 15 minutes; customer no-show after 30 minutes replaces waiting with ₹150.',
    cancellationPolicy: 'Instant ₹0; scheduled ₹0 within 5 minutes of acceptance, ₹50 thereafter, ₹100 after arrival.',
    exclusions: ['Fuel', 'Tolls', 'Parking'], frozenAt: iso(fare.quotedAt), expiresAt: iso(Date.parse(fare.quotedAt) + 300000),
    broadcastStartAt: pickupAt === null ? null : iso(Math.max(Date.now(), pickupAt - 12 * 3600000)),
    broadcastEndAt: pickupAt === null ? null : iso(pickupAt - 2 * 3600000),
    responseDeadlineAt: pickupAt === null ? iso(Date.now() + 300000) : null, demo: false };
}
export const tripState = (status: string): TripState => ({ DRIVER_EN_ROUTE: 'EN_ROUTE', ARRIVED: 'ARRIVED_WAITING',
  IN_PROGRESS: 'ACTIVE', COMPLETED: 'COMPLETED' } as Record<string, TripState>)[status] ??
  (['CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(status) ? 'CANCELLED' : 'AWAITING_DRIVER');
export function bookingView(v: Wire): BookingRecord {
  const b = v.booking, r = v.route, vehicle = v.vehicle;
  if (!b || !r?.pickup || !r.destination || !vehicle || !b.fare) throw new Error('Booking details are incomplete.');
  const driver = v.driver ? candidate(v.driver, vehicle) : null;
  const state = v.trip?.status;
  const status: BookingRecord['status'] = state === 'COMPLETED' ? 'COMPLETED' : state === 'IN_PROGRESS' ? 'ACTIVE' :
    ['CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(state) || b.status.startsWith('CANCELLED') ? 'CANCELLED' :
    state ? 'EN_ROUTE' : b.status === 'ASSIGNED' ? 'ACCEPTED' : b.status === 'SEARCHING' ? 'AWAITING_DRIVER' : b.status;
  const points = r.points ?? [r.pickup, r.destination];
  const place = (position: Wire, label: string) => ({ id: label, label, address: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`, position: { lat: position.lat, lng: position.lng } });
  return { id: b.id, status, bookingType: b.kind, createdAt: iso(b.createdAt), pickupAt: b.pickupAt == null ? null : iso(b.pickupAt),
    pickup: place(r.pickup, 'Pickup'), destination: place(r.destination, 'Destination'),
    stops: points.slice(1, -1).map((p: Wire, i: number) => place(p, `Stop ${i + 1}`)), vehicle, driver,
    quote: quoteView(b.id, b.fare, driver ?? candidate({ id: '', firstName: 'Eligible driver after acceptance', hourlyRateInr: b.fare.hourlyRateInr }, vehicle), b.pickupAt, b.routeId) };
}
export function tripView(v: Wire, viewerUid?: string): TripRecord {
  const b = bookingView(v), t = v.trip, r = v.route, p = v.payable;
  const amount = p?.amountPaise ?? t?.amountPaise;
  let finalFare: FinalFare | null = null;
  if (amount != null) finalFare = { lines: [{ label: 'Final fare', amountInr: amount / 100 }], totalInr: amount / 100,
    estimateInr: b.quote.estimatedBaseFare, pricingMode: 'HOURLY', billableMinutes: t?.startedAt && t?.endedAt ? (t.endedAt - t.startedAt) / 60000 : 0,
    billableKm: r.distanceKm, waitingFeeInr: (t?.waitingFeePaise ?? 0) / 100, noShowFeeInr: p?.source === 'CUSTOMER_NO_SHOW' ? amount / 100 : 0,
    commissionInr: 0, exclusions: b.quote.exclusions, paymentReference: p?.paymentReference ?? undefined,
    paymentStatus: p?.isUnderActiveDispute ? 'DISPUTED' :
      p?.status === 'CAPTURED' || p?.status === 'SETTLED_ZERO' ? 'CAPTURED' : 'PENDING' };
  const l = v.location;
  return { id: b.id, bookingId: b.id, bookingType: b.bookingType, state: t ? tripState(t.status) :
    ['CANCELLED', 'EXPIRED', 'NEEDS_REBOOK'].includes(b.status) ? 'CANCELLED' : 'AWAITING_DRIVER', createdAt: b.createdAt,
    pickup: b.pickup, destination: b.destination, stops: b.stops,
    route: { provider: 'google', routeId: r.id, distanceKm: r.distanceKm, durationMinutes: r.durationMinutes,
      path: r.path ?? [], summary: 'Server-verified road route', calculatedAt: iso(r.createdAt) },
    vehicle: b.vehicle, driver: b.driver, quotedFareInr: b.quote.estimatedBaseFare, customerName: 'Customer', customerPhone: '',
    liveLocation: l ? { position: { lat: l.lat, lng: l.lng }, updatedAt: iso(l.observedAt), accuracyMeters: l.accuracy,
      stale: Date.now() - l.observedAt > 30000 } : null, driverEtaMinutes: v.driverEtaMinutes ?? null,
    arrivalAt: t?.arrivedAt ? iso(t.arrivedAt) : null, waitingStartedAt: t?.arrivedAt ? iso(t.arrivedAt) : null,
    waitingFeeInr: (t?.waitingFeePaise ?? 0) / 100,
    isTripCustomer: !!t && !!viewerUid && (t.customerId ?? v.booking.customerId) === viewerUid,
    driverNoShowEligible: v.driverNoShowEligible === true, driverNoShowReportStatus: v.driverNoShowReportStatus ?? null,
    startOtp: '', endOtp: '', startOtpShownAt: null, endOtpShownAt: null,
    sosEvents: [], share: v.share ? { shareId: v.share.shareId, token: '', createdAt: iso(v.share.createdAt), expiresAt: '' } : null, finalFare, rating: v.rating ?? undefined, demo: false };
}
export function offerView(v: Wire): DriverOffer {
  const b = bookingView(v);
  return { id: b.id, bookingId: b.id, type: b.bookingType, customerName: 'Customer', vehicle: b.vehicle,
    pickup: b.pickup, destination: b.destination, route: tripView(v).route, estimatedEarningsInr: Number.isFinite(v.offeredHourlyRateInr) ? v.offeredHourlyRateInr * b.quote.estimatedDurationMinutes / 60 : b.quote.estimatedBaseFare,
    expiresAt: iso(v.offer.closesAt), broadcastStartAt: iso(v.booking.opensAt), broadcastEndAt: iso(v.booking.closesAt),
    pickupAt: b.pickupAt, status: 'AVAILABLE' };
}
export function driverProfile(v: Wire, uid: string): DriverProfileDetails {
  const d = v.driver ?? {}, u = v.user, a = v.application, fresh = Number.isSafeInteger(v.presence.updatedAt) && Date.now() >= v.presence.updatedAt && Date.now() - v.presence.updatedAt < 30000;
  return { uid, role: 'DRIVER', fullName: d.fullName ?? u.fullName ?? '', phone: d.phone ?? u.phone ?? '',
    onboardingComplete: u.onboardingComplete === true, applicationStatus: d.approvalStatus ?? a?.status ?? 'PENDING_REVIEW',
    adminReason: a?.reviewReason, documents: documentViews(a?.documents ?? []), updatedAt: iso(d.updatedAt),
    experienceYears: String(d.experienceYears ?? ''), languages: d.languages ?? [], categories: d.categories ?? [],
    transmissions: d.transmissions ?? [], serviceAreas: d.serviceAreas ?? '', hourlyRateInr: d.hourlyRateInr ?? 0,
    online: v.presence.online && fresh, gpsFresh: fresh, locationPermission: v.presence.online && fresh ? 'GRANTED' : 'PROMPT', activeTripId: v.activeTripId,
    activeTripState: v.activeTripStatus ? tripState(v.activeTripStatus) : undefined,
    noShowIncidents: u.driverNoShowCount, suspensionReason: d.controlReason };
}
export function documentViews(docs: Wire[]): DriverDocumentMeta[] {
  return docs.map(d => ({ id: d.id, kind: d.kind, fileName: d.kind.replaceAll('_', ' '), storagePath: d.storagePath,
    contentType: d.contentType ?? '', size: d.size ?? 0, uploadedAt: iso(d.createdAt) }));
}
export function applicationView(v: Wire): AdminApplicationRecord {
  const d = v.driver ?? {};
  return { serviceAreaBounds: d.serviceAreaBounds, serviceAreaPlaceIds: d.serviceAreaPlaceIds,
    id: v.id, driverUid: v.driverId ?? v.uid ?? v.id, driverName: d.fullName ?? '', phone: d.phone ?? '',
    submittedAt: iso(v.submittedAt), status: v.status, experienceYears: String(d.experienceYears ?? ''), languages: d.languages ?? [],
    categories: d.categories ?? [], transmissions: d.transmissions ?? [], serviceAreas: d.serviceAreas ?? '', hourlyRateInr: d.hourlyRateInr ?? 0,
    documents: documentViews(v.documents ?? []), adminReason: v.reviewReason, missingItems: v.requestedChanges ?? [],
    incidentCount: d.driverNoShowCount ?? 0, incidentHistory: (v.incidents ?? []).map((i: Wire) => ({ id: i.id, createdAt: iso(i.processedAt ?? i.createdAt), kind: 'NO_SHOW' as const, tripId: i.tripId, description: i.kind })), auditTrail: (v.audit ?? []).map(auditView) };
}
export const auditView = (a: Wire) => ({ id: a.id, createdAt: iso(a.createdAt), adminId: a.adminId, action: a.action,
  oldState: a.before ?? '', newState: a.after ?? '', reason: a.reason });
export function customerAccount(v: Wire): CustomerAccountRecord {
  return { id: v.id, customerUid: v.id, fullName: v.fullName ?? '', phone: v.phone ?? '', status: v.status,
    suspensionReason: v.suspensionReason, cancellationIncidentCount: v.customerCancellationCount ?? 0, incidents: (v.incidents ?? []).map((i: Wire) => ({ id: i.id, createdAt: iso(i.processedAt ?? i.createdAt), category: 'CANCELLATION' as const, description: i.kind, qualifying: i.qualifies === true })),
    auditTrail: (v.audit ?? []).map(auditView) };
}
export function reportView(v: Wire): ReportRecord {
  return { id: v.id, tripId: v.tripId, reporterRole: v.reporterRole, reporterName: 'Private reporter', category: v.category,
    description: v.description, createdAt: iso(v.createdAt), status: v.status, resolutionNote: v.resolutionNote,
    driverNoShowReview: v.kind === 'DRIVER_NO_SHOW' };
}
