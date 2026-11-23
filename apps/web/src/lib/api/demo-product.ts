import type { AuthUser } from '../auth/types';
import { publicPolicy } from '../public-policy';
import { listBookingsDemo } from './demo-booking';
import { getDemoApplication, getDemoProfile, saveDemoProfile } from './demo';
import type {
  AdminApplicationRecord,
  AdminAuditEntry,
  AdminOverviewData,
  AdminReviewInput,
  BookingRecord,
  CustomerAccountRecord,
  CustomerIncidentEntry,
  DriverDocumentMeta,
  DriverIncidentEntry,
  DriverEarningsEntry,
  DriverEarningsSummary,
  DriverOffer,
  DriverProfileDetails,
  DriverProfileUpdate,
  DriverApplicationStatus,
  DriverCandidate,
  FinalFare,
  RatingSubmission,
  ReportRecord,
  ReportResolutionInput,
  ReportSubmission,
  ShareLinkDetails,
  SharedTripView,
  SosEventRecord,
  TripRecord,
  TripState,
} from './types';

const TRIPS_KEY = 'veyro:demo:trips:';
const SHARES_KEY = 'veyro:demo:shares';
const OFFERS_KEY = 'veyro:demo:offers:';
const DRIVER_STATE_KEY = 'veyro:demo:driver-state:';
const ADMIN_APPLICATIONS_KEY = 'veyro:demo:admin-applications';
const ADMIN_CUSTOMERS_KEY = 'veyro:demo:admin-customers';
const REPORTS_KEY = 'veyro:demo:reports';

const DRIVER_FIXTURE: DriverCandidate = {
  id: 'driver-neha',
  name: 'Neha Kulkarni',
  rating: 4.8,
  reviews: 312,
  experienceYears: 6,
  languages: ['English', 'Hindi', 'Marathi'],
  hourlyRate: 329,
  pickupDistanceKm: 3.8,
  responseEtaMinutes: 4,
  verified: true,
  vehicle: {
    make: 'Honda',
    model: 'City',
    category: 'Sedan',
    transmission: 'AUTOMATIC',
    fuelType: 'Petrol',
  },
};

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readJson<T>(key: string): T | null {
  const store = storage();
  if (!store) {
    return null;
  }
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const store = storage();
  if (!store) {
    return;
  }
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hashShareToken(token: string): string {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createShareToken(): string {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function completedFare(quoteTotal: number): FinalFare {
  const waitingFeeInr = 100;
  return {
    lines: [
      { label: 'Driver service · HOURLY (120 min)', amountInr: quoteTotal },
      { label: 'Waiting after grace', amountInr: waitingFeeInr },
      { label: 'No-show', amountInr: 0 },
      { label: 'Customer platform fee', amountInr: publicPolicy.customerPlatformFeeInr },
      { label: 'Driver commission', amountInr: publicPolicy.driverCommissionPercent },
    ],
    totalInr: quoteTotal + waitingFeeInr,
    estimateInr: quoteTotal,
    pricingMode: 'HOURLY',
    billableMinutes: 120,
    billableKm: 18.4,
    waitingFeeInr,
    noShowFeeInr: 0,
    commissionInr: 0,
    exclusions: [...publicPolicy.excludedExpenses],
    paymentStatus: 'CAPTURED',
    paymentReference: 'DEMO-RZP-CAPTURED',
  };
}

function tripStateFromBooking(booking: BookingRecord): TripState {
  if (booking.status === 'COMPLETED') return 'COMPLETED';
  if (booking.status === 'CANCELLED') return 'CANCELLED';
  if (booking.status === 'EN_ROUTE' || booking.status === 'ACCEPTED') return 'EN_ROUTE';
  if (booking.status === 'ACTIVE') return 'ACTIVE';
  return 'AWAITING_DRIVER';
}

function buildTrip(booking: BookingRecord): TripRecord {
  const state = tripStateFromBooking(booking);
  const driver = booking.driver ?? DRIVER_FIXTURE;
  const midpoint = {
    lat: (booking.pickup.position.lat + booking.destination.position.lat) / 2,
    lng: (booking.pickup.position.lng + booking.destination.position.lng) / 2,
  };
  const completed = state === 'COMPLETED';
  return {
    id: booking.id,
    bookingId: booking.id,
    bookingType: booking.bookingType,
    state,
    createdAt: booking.createdAt,
    pickup: booking.pickup,
    destination: booking.destination,
    stops: booking.stops,
    route: {
      provider: 'demo',
      routeId: `${booking.id}-route`,
      distanceKm: booking.quote.estimatedDistanceKm,
      durationMinutes: booking.quote.estimatedDurationMinutes,
      path: [booking.pickup.position, midpoint, booking.destination.position],
      summary: 'Demo road route',
      calculatedAt: booking.createdAt,
    },
    vehicle: booking.vehicle,
    driver,
    quotedFareInr: booking.quote.estimatedBaseFare,
    customerName: 'Aarav Sharma',
    customerPhone: '+919900000123',
    liveLocation:
      state === 'AWAITING_DRIVER'
        ? null
        : {
            position: midpoint,
            updatedAt: new Date(Date.now() - 12 * 1000).toISOString(),
            accuracyMeters: 14,
            stale: false,
          },
    driverEtaMinutes: state === 'EN_ROUTE' ? 6 : state === 'ARRIVED_WAITING' ? 0 : null,
    arrivalAt:
      state === 'ARRIVED_WAITING' || state === 'ACTIVE' || completed
        ? new Date(Date.now() - 8 * 60 * 1000).toISOString()
        : null,
    waitingStartedAt: state === 'ARRIVED_WAITING' ? new Date(Date.now() - 4 * 60 * 1000).toISOString() : null,
    waitingFeeInr: state === 'ARRIVED_WAITING' ? 0 : completed ? 100 : 0,
    startOtp: '481920',
    endOtp: '605731',
    startOtpShownAt:
      state === 'ARRIVED_WAITING' || state === 'ACTIVE' || completed
        ? new Date(Date.now() - 7 * 60 * 1000).toISOString()
        : null,
    endOtpShownAt: state === 'ACTIVE' ? new Date(Date.now() - 3 * 60 * 1000).toISOString() : null,
    sosEvents: [],
    share: null,
    finalFare: completed ? completedFare(booking.quote.estimatedBaseFare + 1150) : null,
    rating: completed ? 5 : undefined,
    demo: true,
  };
}

function seedTrips(uid: string): TripRecord[] {
  return listBookingsDemo(uid).map(buildTrip);
}

function listTripsDemo(uid: string): TripRecord[] {
  const existing = readJson<TripRecord[]>(`${TRIPS_KEY}${uid}`);
  if (existing) {
    return existing;
  }
  const seeded = seedTrips(uid);
  writeJson(`${TRIPS_KEY}${uid}`, seeded);
  return seeded;
}

function saveTripsDemo(uid: string, trips: TripRecord[]): void {
  writeJson(`${TRIPS_KEY}${uid}`, trips);
}

function updateTripDemo(
  uid: string,
  tripId: string,
  update: (trip: TripRecord) => TripRecord
): TripRecord {
  const trips = listTripsDemo(uid);
  const index = trips.findIndex((trip) => trip.id === tripId);
  if (index === -1) {
    throw new Error('Trip not found.');
  }
  const next = update(trips[index]);
  const updated = [...trips];
  updated[index] = next;
  saveTripsDemo(uid, updated);
  return next;
}

export function getTripDemo(uid: string, tripId: string): TripRecord {
  const trip = listTripsDemo(uid).find((item) => item.id === tripId);
  if (trip) {
    return trip;
  }
  const booking = listBookingsDemo(uid).find((item) => item.id === tripId);
  if (!booking) {
    throw new Error('Trip not found.');
  }
  const seeded = buildTrip(booking);
  saveTripsDemo(uid, [...listTripsDemo(uid), seeded]);
  return seeded;
}

interface DemoShareRecord {
  tokenHash: string;
  uid: string;
  tripId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export function triggerSosDemo(uid: string, tripId: string): SosEventRecord {
  const trip = getTripDemo(uid, tripId);
  const event: SosEventRecord = {
    id: newId('sos'),
    createdAt: new Date().toISOString(),
    position: trip.liveLocation?.position ?? trip.pickup.position,
    contacts: [
      { name: 'Emergency contact', channel: 'SMS', status: 'QUEUED' },
      { name: 'Veyro safety desk', channel: 'CALL', status: 'UNKNOWN' },
    ],
    demo: true,
  };
  updateTripDemo(uid, tripId, (current) => ({
    ...current,
    sosEvents: [event, ...current.sosEvents],
  }));
  return event;
}

export function createShareLinkDemo(uid: string, tripId: string): ShareLinkDetails {
  const token = createShareToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const share: ShareLinkDetails = { token, createdAt, expiresAt };
  updateTripDemo(uid, tripId, (current) => ({ ...current, share }));
  const records = readJson<DemoShareRecord[]>(SHARES_KEY) ?? [];
  writeJson(SHARES_KEY, [
    ...records.filter((record) => record.tripId !== tripId),
    {
      tokenHash: hashShareToken(token),
      uid,
      tripId,
      createdAt,
      expiresAt,
    },
  ]);
  return share;
}

export function revokeShareLinkDemo(uid: string, tripId: string): ShareLinkDetails | null {
  const trip = getTripDemo(uid, tripId);
  const revokedAt = new Date().toISOString();
  const records = readJson<DemoShareRecord[]>(SHARES_KEY) ?? [];
  writeJson(
    SHARES_KEY,
    records.map((record) =>
      record.tripId === tripId && !record.revokedAt ? { ...record, revokedAt } : record
    )
  );
  if (!trip.share) {
    return null;
  }
  return updateTripDemo(uid, tripId, (current) => ({
    ...current,
    share: current.share ? { ...current.share, revokedAt } : null,
  })).share;
}

export function getSharedTripDemo(token: string): SharedTripView {
  const tokenHash = hashShareToken(token);
  const record = (readJson<DemoShareRecord[]>(SHARES_KEY) ?? []).find(
    (item) => item.tokenHash === tokenHash
  );
  if (!record || record.revokedAt || new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error('This trip link is invalid, revoked or expired.');
  }
  const trip = getTripDemo(record.uid, record.tripId);
  return {
    tripId: trip.id,
    state: trip.state,
    pickupLabel: trip.pickup.label,
    destinationLabel: trip.destination.label,
    pickupPosition: trip.pickup.position,
    destinationPosition: trip.destination.position,
    driverName: trip.driver?.name.split(' ')[0] ?? null,
    driverVehicle: trip.driver
      ? `${trip.driver.vehicle.make} ${trip.driver.vehicle.model}`
      : null,
    driverEtaMinutes: trip.driverEtaMinutes,
    liveLocation: trip.liveLocation?.stale
      ? { ...trip.liveLocation, position: trip.liveLocation.position }
      : trip.liveLocation,
    shareExpiresAt: record.expiresAt,
    demo: true,
  };
}

export function submitTripRatingDemo(
  uid: string,
  tripId: string,
  input: RatingSubmission
): TripRecord {
  return updateTripDemo(uid, tripId, (trip) => ({ ...trip, rating: input.rating }));
}

export function createTripReportDemo(
  uid: string,
  input: ReportSubmission
): ReportRecord {
  const report: ReportRecord = {
    id: newId('RPT').toUpperCase(),
    tripId: input.tripId,
    reporterRole: input.reporterRole,
    reporterName: 'Veyro user',
    category: input.category,
    description: input.description,
    createdAt: new Date().toISOString(),
    status: 'OPEN',
  };
  const reports = readJson<ReportRecord[]>(REPORTS_KEY) ?? [];
  writeJson(REPORTS_KEY, [report, ...reports]);
  updateTripDemo(uid, input.tripId, (trip) => ({ ...trip, reportId: report.id }));
  return report;
}

export function payTripDemo(uid: string, tripId: string): TripRecord {
  return updateTripDemo(uid, tripId, (trip) => ({
    ...trip,
    finalFare: trip.finalFare
      ? {
          ...trip.finalFare,
          paymentStatus: 'PENDING_VERIFICATION',
          paymentReference: `DEMO-RZP-${Date.now().toString(36).toUpperCase()}`,
        }
      : null,
  }));
}

export type TripStageAction = 'ARRIVED' | 'START' | 'END' | 'NO_SHOW_REQUEST';

export function advanceTripStageDemo(
  uid: string,
  tripId: string,
  action: TripStageAction,
  input: { otp?: string } = {}
): TripRecord {
  const trip = getTripDemo(uid, tripId);
  if (action === 'START' && input.otp !== trip.startOtp) {
    throw new Error('Start OTP is incorrect.');
  }
  if (action === 'END' && input.otp !== trip.endOtp) {
    throw new Error('End OTP is incorrect.');
  }

  return updateTripDemo(uid, tripId, (current) => {
    if (action === 'ARRIVED') {
      const now = new Date().toISOString();
      return {
        ...current,
        state: 'ARRIVED_WAITING',
        arrivalAt: now,
        waitingStartedAt: now,
        driverEtaMinutes: 0,
        startOtpShownAt: now,
        startOtp: current.startOtp,
      };
    }
    if (action === 'START') {
      return {
        ...current,
        state: 'ACTIVE',
        waitingStartedAt: null,
        endOtpShownAt: new Date().toISOString(),
      };
    }
    if (action === 'END') {
      return {
        ...current,
        state: 'COMPLETED',
        finalFare: completedFare(current.quotedFareInr + 1150),
      };
    }
    return { ...current, noShowRequested: true };
  });
}

function seedOffers(): DriverOffer[] {
  const pickup = {
    id: 'offer-pickup',
    label: 'Indiranagar Metro Station',
    address: '100 Feet Road, Indiranagar',
    position: { lat: 12.9719, lng: 77.6412 },
  };
  const destination = {
    id: 'offer-destination',
    label: 'Koramangala 5th Block',
    address: '80 Feet Road, Koramangala',
    position: { lat: 12.9352, lng: 77.6245 },
  };
  const route = {
    provider: 'demo' as const,
    routeId: 'offer-route',
    distanceKm: 6.2,
    durationMinutes: 22,
    path: [pickup.position, destination.position],
    summary: 'Demo road route',
    calculatedAt: new Date().toISOString(),
  };
  const vehicle = { id: 'offer-vehicle-city', ...DRIVER_FIXTURE.vehicle };

  return [
    {
      id: 'OFFER-INSTANT-2041',
      bookingId: 'VEY-DEMO-3041',
      type: 'INSTANT',
      customerName: 'Aarav Sharma',
      vehicle,
      pickup,
      destination,
      route,
      estimatedEarningsInr: 127,
      expiresAt: new Date(Date.now() + 4 * 60 * 1000 + 32 * 1000).toISOString(),
      broadcastStartAt: null,
      broadcastEndAt: null,
      pickupAt: null,
      status: 'AVAILABLE',
    },
    {
      id: 'OFFER-SCHEDULED-2042',
      bookingId: 'VEY-DEMO-3042',
      type: 'SCHEDULED',
      customerName: 'Meera Iyer',
      vehicle: {
        ...vehicle,
        id: 'offer-vehicle-innova',
        make: 'Toyota',
        model: 'Innova Crysta',
        category: 'MPV',
      },
      pickup,
      destination,
      route: { ...route, distanceKm: 14.8, durationMinutes: 41 },
      estimatedEarningsInr: 224,
      expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
      broadcastStartAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      broadcastEndAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
      pickupAt: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
      status: 'AVAILABLE',
    },
  ];
}

export function getDriverOffersDemo(uid: string): DriverOffer[] {
  const existing = readJson<DriverOffer[]>(`${OFFERS_KEY}${uid}`);
  if (existing) {
    return existing;
  }
  const seeded = seedOffers();
  writeJson(`${OFFERS_KEY}${uid}`, seeded);
  return seeded;
}

export function respondToOfferDemo(
  uid: string,
  offerId: string,
  action: 'ACCEPT' | 'DECLINE'
): DriverOffer[] {
  const offers = getDriverOffersDemo(uid).map((offer) => {
    if (offer.id !== offerId) {
      return action === 'ACCEPT' && offer.status === 'AVAILABLE'
        ? { ...offer, status: 'EXPIRED' as const }
        : offer;
    }
    if (offer.status !== 'AVAILABLE') {
      return { ...offer, status: 'ALREADY_ACCEPTED' as const };
    }
    return { ...offer, status: action === 'ACCEPT' ? 'ACCEPTED' as const : 'DECLINED' as const };
  });
  writeJson(`${OFFERS_KEY}${uid}`, offers);
  return offers;
}

interface DemoDriverState {
  online: boolean;
  gpsFresh: boolean;
  locationPermission: 'GRANTED' | 'PROMPT' | 'DENIED';
}

function getDriverState(uid: string): DemoDriverState {
  return readJson<DemoDriverState>(`${DRIVER_STATE_KEY}${uid}`) ?? {
    online: false,
    gpsFresh: true,
    locationPermission: 'GRANTED',
  };
}

export function setDriverOnlineDemo(uid: string, online: boolean): DriverProfileDetails {
  const state = getDriverState(uid);
  if (online) {
    const profile = getDemoProfile(uid);
    if (profile?.applicationStatus !== 'APPROVED') {
      throw new Error('Your driver application must be approved before you can go online.');
    }
    if (!state.gpsFresh || state.locationPermission !== 'GRANTED') {
      throw new Error('Location permission and fresh GPS are required to go online.');
    }
    const activeTrip = listTripsDemo(uid).find((trip) => trip.state === 'ACTIVE');
    if (activeTrip) {
      throw new Error('Finish your active trip before going online again.');
    }
  }
  writeJson(`${DRIVER_STATE_KEY}${uid}`, { ...state, online });
  return getDriverProfileDemo({ uid, email: null, phoneNumber: null, displayName: null, getIdToken: async () => 'demo-token' });
}

export function getDriverProfileDemo(user: AuthUser): DriverProfileDetails {
  const stored = getDemoProfile(user.uid);
  const application = getDemoApplication(user.uid);
  const saved = stored as Partial<DriverProfileDetails> | null;
  const state = getDriverState(user.uid);
  const activeTrip = listTripsDemo(user.uid).find((trip) => trip.state === 'ACTIVE');
  return {
    uid: user.uid,
    role: 'DRIVER',
    fullName: stored?.fullName ?? 'Arjun Menon',
    phone: stored?.phone ?? '+919800000321',
    onboardingComplete: stored?.onboardingComplete ?? true,
    applicationStatus: stored?.applicationStatus ?? 'APPROVED',
    adminReason: stored?.adminReason,
    documents: stored?.documents ?? [],
    updatedAt: stored?.updatedAt ?? new Date().toISOString(),
    experienceYears: application?.input.experienceYears ?? saved?.experienceYears ?? '8',
    languages: application?.input.languages ?? saved?.languages ?? ['English', 'Hindi', 'Kannada'],
    categories: application?.input.categories ?? saved?.categories ?? ['Sedan', 'MPV', 'SUV'],
    transmissions: application?.input.transmissions ?? saved?.transmissions ?? ['AUTOMATIC', 'MANUAL'],
    serviceAreas: application?.input.serviceAreas ?? saved?.serviceAreas ?? 'Bengaluru — Indiranagar, Koramangala, Whitefield',
    hourlyRateInr: Number(application?.input.hourlyRate ?? saved?.hourlyRateInr ?? 349),
    online: state.online,
    gpsFresh: state.gpsFresh,
    locationPermission: state.locationPermission,
    activeTripId: activeTrip?.id ?? null,
    noShowIncidents: 0,
  };
}

export function saveDriverProfileDemo(
  user: AuthUser,
  input: DriverProfileUpdate
): DriverProfileDetails {
  const current = getDriverProfileDemo(user);
  const updated = {
    ...current,
    ...input,
    role: 'DRIVER' as const,
    fullName: input.fullName,
    phone: input.phone,
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };
  saveDemoProfile(updated);
  const application = getDemoApplication(user.uid);
  if (application) {
    const store = storage();
    store?.setItem(
      `veyro:demo:application:${user.uid}`,
      JSON.stringify({
        ...application,
        input: {
          ...application.input,
          fullName: input.fullName,
          phone: input.phone,
          experienceYears: input.experienceYears,
          languages: input.languages,
          categories: input.categories,
          hourlyRate: String(input.hourlyRateInr ?? current.hourlyRateInr),
          transmissions: input.transmissions ?? current.transmissions,
          serviceAreas: input.serviceAreas,
        },
      })
    );
  }
  return getDriverProfileDemo(user);
}

export function getDriverEarningsDemo(uid: string): DriverEarningsSummary {
  const stored = readJson<DriverEarningsEntry[]>(`${'veyro:demo:earnings:'}${uid}`);
  const entries = stored ?? [
    {
      id: 'EARN-2041',
      tripId: 'VEY-DEMO-2041',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Indiranagar → Koramangala · 62 min',
      grossInr: 361,
      waitingCreditInr: 0,
      commissionInr: 0,
      adjustmentInr: 0,
      netInr: 361,
      demo: true,
    },
    {
      id: 'EARN-2040',
      tripId: 'VEY-DEMO-2040',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Whitefield → Indiranagar · 81 min',
      grossInr: 471,
      waitingCreditInr: 50,
      commissionInr: 0,
      adjustmentInr: -20,
      netInr: 501,
      demo: true,
    },
    {
      id: 'EARN-2039',
      tripId: 'VEY-DEMO-2039',
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Koramangala → HSR · 35 min',
      grossInr: 204,
      waitingCreditInr: 0,
      commissionInr: 0,
      adjustmentInr: 0,
      netInr: 204,
      demo: true,
    },
  ];
  if (!stored) {
    writeJson(`veyro:demo:earnings:${uid}`, entries);
  }
  const sum = (key: 'grossInr' | 'waitingCreditInr' | 'commissionInr' | 'adjustmentInr' | 'netInr') =>
    entries.reduce((total, entry) => total + entry[key], 0);
  return {
    totalNetInr: sum('netInr'),
    grossInr: sum('grossInr'),
    waitingCreditInr: sum('waitingCreditInr'),
    commissionInr: sum('commissionInr'),
    adjustmentsInr: sum('adjustmentInr'),
    completedTrips: entries.length,
    hourlyRateInr: 349,
    rateEffectiveFrom: '2026-11-01',
    rateChangeCopy: 'Rate changes affect future bookings only.',
    entries,
    demo: true,
  };
}

function seedAdminApplications(): AdminApplicationRecord[] {
  const documents: DriverDocumentMeta[] = [
    {
      kind: 'LICENCE',
      fileName: 'licence-front.jpg',
      storagePath: 'private/drivers/demo/licence-front.jpg',
      contentType: 'image/jpeg',
      size: 482112,
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: 'GOVERNMENT_ID',
      fileName: 'aadhaar-front.jpg',
      storagePath: 'private/drivers/demo/aadhaar-front.jpg',
      contentType: 'image/jpeg',
      size: 391004,
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const noShowHistory: DriverIncidentEntry[] = [
    {
      id: 'INC-501',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      kind: 'NO_SHOW',
      tripId: 'VEY-DEMO-1987',
      description: 'Verified driver no-show at scheduled pickup after 20 minutes.',
    },
  ];

  return [
    {
      id: 'APP-2041',
      driverUid: 'driver-demo-2041',
      driverName: 'Rahul Bhat',
      phone: '+919844001241',
      submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING_REVIEW',
      experienceYears: '6',
      languages: ['English', 'Hindi', 'Tamil'],
      categories: ['Sedan', 'SUV'],
      transmissions: ['AUTOMATIC'],
      serviceAreas: 'Bengaluru — north and central',
      hourlyRateInr: 329,
      documents,
      incidentCount: 0,
      incidentHistory: [],
      auditTrail: [],
    },
    {
      id: 'APP-2040',
      driverUid: 'driver-demo-2040',
      driverName: 'Sana Qureshi',
      phone: '+919844001240',
      submittedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING_REVIEW',
      experienceYears: '4',
      languages: ['English', 'Hindi', 'Urdu'],
      categories: ['Sedan'],
      transmissions: ['MANUAL', 'AUTOMATIC'],
      serviceAreas: 'Bengaluru — east',
      hourlyRateInr: 299,
      documents,
      incidentCount: 0,
      incidentHistory: [],
      auditTrail: [],
    },
    {
      id: 'APP-2039',
      driverUid: 'driver-demo-2039',
      driverName: 'Vikram Rao',
      phone: '+919844001239',
      submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'NEEDS_CHANGES',
      experienceYears: '9',
      languages: ['English', 'Kannada'],
      categories: ['MPV', 'Luxury'],
      transmissions: ['AUTOMATIC'],
      serviceAreas: 'Bengaluru — south',
      hourlyRateInr: 399,
      documents,
      adminReason: 'Licence image is unclear.',
      missingItems: ['Readable licence front', 'Profile photo'],
      incidentCount: 0,
      incidentHistory: [],
      auditTrail: [],
    },
    {
      id: 'APP-2038',
      driverUid: 'driver-demo-2038',
      driverName: 'Anita Desai',
      phone: '+919844001238',
      submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'APPROVED',
      experienceYears: '11',
      languages: ['English', 'Hindi', 'Marathi'],
      categories: ['Sedan', 'MPV'],
      transmissions: ['AUTOMATIC'],
      serviceAreas: 'Bengaluru — central',
      hourlyRateInr: 349,
      documents,
      incidentCount: 1,
      incidentHistory: noShowHistory,
      auditTrail: [],
    },
  ];
}

function listAdminApplicationsDemo(): AdminApplicationRecord[] {
  const existing = readJson<AdminApplicationRecord[]>(ADMIN_APPLICATIONS_KEY);
  if (existing) {
    return existing.map((item) => ({ ...item, incidentHistory: item.incidentHistory ?? [] }));
  }
  const seeded = seedAdminApplications();
  writeJson(ADMIN_APPLICATIONS_KEY, seeded);
  return seeded;
}

function saveAdminApplicationsDemo(applications: AdminApplicationRecord[]): void {
  writeJson(ADMIN_APPLICATIONS_KEY, applications);
}

function auditEntry(
  adminUid: string,
  action: string,
  oldState: string,
  newState: string,
  reason?: string
): AdminAuditEntry {
  return {
    id: newId('AUDIT'),
    createdAt: new Date().toISOString(),
    adminId: adminUid,
    action,
    oldState,
    newState,
    reason,
  };
}

export function getAdminOverviewDemo(adminUid: string): AdminOverviewData {
  const applications = listAdminApplicationsDemo();
  return {
    pendingApplications: applications.filter((item) => item.status === 'PENDING_REVIEW').length,
    approvedDrivers: applications.filter((item) => item.status === 'APPROVED').length,
    rejectedApplications: applications.filter((item) => item.status === 'REJECTED').length,
    openReports: getAdminReportsDemo(adminUid).filter((item) =>
      ['OPEN', 'UNDER_REVIEW'].includes(item.status)
    ).length,
    applications,
    demo: true,
  };
}

export function getAdminApplicationDemo(
  adminUid: string,
  applicationId: string
): AdminApplicationRecord {
  const application = listAdminApplicationsDemo().find((item) => item.id === applicationId);
  if (!application) {
    throw new Error('Application not found.');
  }
  return application;
}

function seedAdminCustomers(): CustomerAccountRecord[] {
  const incidents: CustomerIncidentEntry[] = [
    {
      id: 'CINC-901',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'CANCELLATION',
      description: 'Cancelled more than five minutes after driver acceptance.',
      qualifying: true,
    },
    {
      id: 'CINC-902',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'PAYMENT_DISPUTE',
      description: 'Disputed a captured payment; amount held under review.',
      qualifying: false,
    },
  ];

  return [
    {
      id: 'CUST-2041',
      customerUid: 'customer-demo-2041',
      fullName: 'Aarav Sharma',
      phone: '+919844001101',
      status: 'SUSPENDED',
      suspensionReason: 'Fifth qualifying cancellation incident.',
      cancellationIncidentCount: 5,
      incidents,
      auditTrail: [
        auditEntry(
          'admin-demo',
          'CUSTOMER_SUSPEND',
          'ACTIVE',
          'SUSPENDED',
          'Fifth qualifying cancellation incident.'
        ),
      ],
    },
    {
      id: 'CUST-2042',
      customerUid: 'customer-demo-2042',
      fullName: 'Meera Iyer',
      phone: '+919844001102',
      status: 'ACTIVE',
      cancellationIncidentCount: 1,
      incidents: [
        {
          id: 'CINC-903',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'CANCELLATION',
          description: 'Cancelled before driver acceptance.',
          qualifying: false,
        },
      ],
      auditTrail: [],
    },
  ];
}

function listAdminCustomersDemo(): CustomerAccountRecord[] {
  const existing = readJson<CustomerAccountRecord[]>(ADMIN_CUSTOMERS_KEY);
  if (existing) {
    return existing;
  }
  const seeded = seedAdminCustomers();
  writeJson(ADMIN_CUSTOMERS_KEY, seeded);
  return seeded;
}

export function getAdminCustomersDemo(): CustomerAccountRecord[] {
  return listAdminCustomersDemo();
}

export function getAdminCustomerDemo(customerId: string): CustomerAccountRecord {
  const customer = listAdminCustomersDemo().find((item) => item.id === customerId);
  if (!customer) {
    throw new Error('Customer record not found.');
  }
  return customer;
}

export function restoreAdminCustomerDemo(
  adminUid: string,
  customerId: string,
  reason: string
): CustomerAccountRecord {
  if (!reason.trim()) {
    throw new Error('An audit reason is required.');
  }
  const customers = listAdminCustomersDemo();
  const index = customers.findIndex((item) => item.id === customerId);
  if (index === -1) {
    throw new Error('Customer record not found.');
  }
  const current = customers[index];
  if (current.status === 'ACTIVE') {
    throw new Error('Only suspended customers can be restored.');
  }
  const updated: CustomerAccountRecord = {
    ...current,
    status: 'ACTIVE',
    suspensionReason: undefined,
    auditTrail: [
      auditEntry(adminUid, 'CUSTOMER_RESTORE', current.status, 'ACTIVE', reason.trim()),
      ...current.auditTrail,
    ],
  };
  customers[index] = updated;
  writeJson(ADMIN_CUSTOMERS_KEY, customers);
  return updated;
}

function statusForReviewAction(action: AdminReviewInput['action']): DriverApplicationStatus {
  if (action === 'APPROVE') return 'APPROVED';
  if (action === 'REJECT') return 'REJECTED';
  return 'NEEDS_CHANGES';
}

export function reviewAdminApplicationDemo(
  adminUid: string,
  applicationId: string,
  input: AdminReviewInput
): AdminApplicationRecord {
  const applications = listAdminApplicationsDemo();
  const index = applications.findIndex((item) => item.id === applicationId);
  if (index === -1) {
    throw new Error('Application not found.');
  }
  if ((input.action === 'REJECT' || input.action === 'REQUEST_CHANGES') && !input.reason?.trim()) {
    throw new Error('A reason is required for this decision.');
  }
  const current = applications[index];
  const nextStatus = statusForReviewAction(input.action);
  const updated: AdminApplicationRecord = {
    ...current,
    status: nextStatus,
    adminReason: input.reason?.trim(),
    missingItems: input.missingItems?.filter(Boolean),
    auditTrail: [
      auditEntry(
        adminUid,
        input.action,
        current.status,
        nextStatus,
        input.reason ?? input.missingItems?.join(', ')
      ),
      ...current.auditTrail,
    ],
  };
  applications[index] = updated;
  saveAdminApplicationsDemo(applications);
  const profile = getDemoProfile(current.driverUid);
  if (profile) {
    saveDemoProfile({
      ...profile,
      applicationStatus: nextStatus,
      adminReason: updated.adminReason,
      updatedAt: new Date().toISOString(),
    });
  }
  return updated;
}

export function driverSafetyControlDemo(
  adminUid: string,
  driverUid: string,
  input: { action: 'DEACTIVATE' | 'RESTORE'; reason: string }
): AdminApplicationRecord {
  if (!input.reason.trim()) {
    throw new Error('An audit reason is required.');
  }
  const applications = listAdminApplicationsDemo();
  const index = applications.findIndex((item) => item.driverUid === driverUid || item.id === driverUid);
  if (index === -1) {
    throw new Error('Driver application not found.');
  }
  const current = applications[index];
  const nextStatus: DriverApplicationStatus =
    input.action === 'DEACTIVATE' ? 'DEACTIVATED' : 'APPROVED';
  const updated: AdminApplicationRecord = {
    ...current,
    status: nextStatus,
    adminReason: input.reason,
    auditTrail: [
      auditEntry(adminUid, input.action, current.status, nextStatus, input.reason),
      ...current.auditTrail,
    ],
  };
  applications[index] = updated;
  saveAdminApplicationsDemo(applications);
  const profile = getDemoProfile(current.driverUid);
  if (profile) {
    saveDemoProfile({
      ...profile,
      applicationStatus: nextStatus,
      adminReason: input.reason,
      updatedAt: new Date().toISOString(),
    });
  }
  return updated;
}

function seedReports(): ReportRecord[] {
  return [
    {
      id: 'RPT-7710',
      tripId: 'VEY-DEMO-2041',
      reporterRole: 'CUSTOMER',
      reporterName: 'Aarav Sharma',
      category: 'SAFETY_CONCERN',
      description: 'Driver took an unexpected shortcut after pickup.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN',
    },
    {
      id: 'RPT-7709',
      tripId: 'VEY-DEMO-1987',
      reporterRole: 'DRIVER',
      reporterName: 'Neha Kulkarni',
      category: 'FARE_OR_PAYMENT',
      description: 'Payment confirmation was not visible after trip completion.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'UNDER_REVIEW',
    },
    {
      id: 'RPT-7708',
      tripId: 'VEY-DEMO-1962',
      reporterRole: 'CUSTOMER',
      reporterName: 'Meera Iyer',
      category: 'DRIVER_CONDUCT',
      description: 'Reported a communication issue after the trip.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'RESOLVED',
      resolutionNote: 'Driver contacted and coached. Reporter notified.',
    },
  ];
}

export function getAdminReportsDemo(_adminUid: string): ReportRecord[] {
  const created = readJson<ReportRecord[]>(REPORTS_KEY) ?? [];
  const stored = readJson<ReportRecord[]>('veyro:demo:admin-reports');
  if (!stored) {
    const seeded = [...created, ...seedReports()];
    writeJson('veyro:demo:admin-reports', seeded);
    return seeded;
  }
  const merged = [...created.filter((report) => !stored.some((item) => item.id === report.id)), ...stored];
  return merged;
}

export function resolveReportDemo(
  adminUid: string,
  reportId: string,
  input: ReportResolutionInput
): ReportRecord {
  if (input.action === 'RESOLVE' && !input.note?.trim()) {
    throw new Error('A resolution note is required.');
  }
  if (input.action === 'DISMISS' && !input.note?.trim()) {
    throw new Error('A dismissal reason is required.');
  }
  const reports = getAdminReportsDemo(adminUid);
  const index = reports.findIndex((report) => report.id === reportId);
  if (index === -1) {
    throw new Error('Report not found.');
  }
  const status = input.action === 'RESOLVE' ? 'RESOLVED' : input.action === 'DISMISS' ? 'DISMISSED' : 'UNDER_REVIEW';
  const updated: ReportRecord = {
    ...reports[index],
    status,
    resolutionNote: input.action === 'RESOLVE' ? input.note?.trim() : reports[index].resolutionNote,
    dismissReason: input.action === 'DISMISS' ? input.note?.trim() : reports[index].dismissReason,
  };
  reports[index] = updated;
  writeJson('veyro:demo:admin-reports', reports);
  return updated;
}
