import type { AuthUser } from '../auth/types';
import { getBroadcastWindow } from '../booking/policy';
import { publicPolicy } from '../public-policy';
import { bootstrapDemoSession, getDemoProfile, saveDemoProfile } from './demo';
import type {
  BookingLocation,
  BookingQuote,
  BookingQuoteRequest,
  BookingRecord,
  BookingVehicle,
  CustomerNotificationPreferences,
  CustomerPrivacyPreferences,
  CustomerProfileDetails,
  CustomerProfileUpdate,
  DriverCandidate,
  DriverSearchFilters,
  EmergencyContact,
} from './types';

const CUSTOMER_DETAILS_KEY = 'veyro:demo:customer-details:';
const BOOKINGS_KEY = 'veyro:demo:bookings:';

const DRIVERS: DriverCandidate[] = [
  {
    id: 'driver-arjun',
    name: 'Arjun Menon',
    rating: 4.9,
    reviews: 428,
    experienceYears: 8,
    languages: ['English', 'Hindi', 'Kannada'],
    hourlyRate: 349,
    pickupDistanceKm: 2.4,
    responseEtaMinutes: 3,
    verified: true,
    vehicle: {
      make: 'Toyota',
      model: 'Innova Crysta',
      category: 'MPV',
      transmission: 'AUTOMATIC',
      fuelType: 'Diesel',
    },
  },
  {
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
  },
  {
    id: 'driver-imran',
    name: 'Imran Qureshi',
    rating: 4.7,
    reviews: 205,
    experienceYears: 5,
    languages: ['English', 'Hindi', 'Urdu'],
    hourlyRate: 299,
    pickupDistanceKm: 5.1,
    responseEtaMinutes: 5,
    verified: true,
    vehicle: {
      make: 'Maruti',
      model: 'Swift Dzire',
      category: 'Sedan',
      transmission: 'MANUAL',
      fuelType: 'Petrol',
    },
  },
  {
    id: 'driver-priya',
    name: 'Priya Raman',
    rating: 5,
    reviews: 517,
    experienceYears: 11,
    languages: ['English', 'Tamil', 'Kannada'],
    hourlyRate: 399,
    pickupDistanceKm: 6.7,
    responseEtaMinutes: 4,
    verified: true,
    vehicle: {
      make: 'BMW',
      model: '3 Series',
      category: 'Luxury',
      transmission: 'AUTOMATIC',
      fuelType: 'Petrol',
    },
  },
  {
    id: 'driver-sanjay',
    name: 'Sanjay Rao',
    rating: 4.6,
    reviews: 184,
    experienceYears: 4,
    languages: ['English', 'Telugu', 'Hindi'],
    hourlyRate: 279,
    pickupDistanceKm: 8.2,
    responseEtaMinutes: 5,
    verified: true,
    vehicle: {
      make: 'Hyundai',
      model: 'Creta',
      category: 'SUV',
      transmission: 'AUTOMATIC',
      fuelType: 'Diesel',
    },
  },
];

interface DemoCustomerExtras {
  vehicles: BookingVehicle[];
  emergencyContacts: EmergencyContact[];
  unpaidBalance: number;
  disputedAmountUnderReview: boolean;
  favouriteDriverIds: string[];
  notifications: CustomerNotificationPreferences;
  privacy: CustomerPrivacyPreferences;
}

const DEFAULT_EXTRAS: DemoCustomerExtras = {
  vehicles: [
    {
      id: 'vehicle-default',
      make: 'Honda',
      model: 'City',
      category: 'Sedan',
      transmission: 'AUTOMATIC',
      fuelType: 'Petrol',
      registrationNumber: 'KA 01 AB 1234',
    },
  ],
  emergencyContacts: [
    {
      id: 'contact-default',
      name: 'Family contact',
      relationship: 'Family',
      phone: '+919800000000',
    },
  ],
  unpaidBalance: 0,
  disputedAmountUnderReview: false,
  favouriteDriverIds: [],
  notifications: {
    bookingUpdates: true,
    tripStatus: true,
    safetyAlerts: true,
    serviceMessages: false,
  },
  privacy: {
    tripSharing: true,
    matchingProfile: true,
    analytics: false,
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

function readExtras(): DemoCustomerExtras {
  const stored = readJson<Partial<DemoCustomerExtras>>(CUSTOMER_DETAILS_KEY);
  return {
    ...DEFAULT_EXTRAS,
    ...stored,
    notifications: { ...DEFAULT_EXTRAS.notifications, ...stored?.notifications },
    privacy: { ...DEFAULT_EXTRAS.privacy, ...stored?.privacy },
    favouriteDriverIds: stored?.favouriteDriverIds ?? DEFAULT_EXTRAS.favouriteDriverIds,
  };
}

export function searchDriversDemo(
  vehicle: BookingVehicle,
  filters: DriverSearchFilters
): DriverCandidate[] {
  const matches = DRIVERS.filter((driver) => {
    const categoryMatch = driver.vehicle.category === vehicle.category;
    const transmissionMatch = driver.vehicle.transmission === vehicle.transmission;
    const radiusMatch = driver.pickupDistanceKm <= filters.radiusKm;
    const pickupMatch = driver.pickupDistanceKm <= filters.maxPickupDistanceKm;
    const priceMatch = filters.maxHourlyRate === null || driver.hourlyRate <= filters.maxHourlyRate;
    const ratingMatch = driver.rating >= filters.minRating;
    const experienceMatch = driver.experienceYears >= filters.minExperienceYears;
    const languageMatch =
      filters.languages.length === 0 ||
      filters.languages.every((language) => driver.languages.includes(language));
    return (
      categoryMatch &&
      transmissionMatch &&
      radiusMatch &&
      pickupMatch &&
      priceMatch &&
      ratingMatch &&
      experienceMatch &&
      languageMatch
    );
  });

  const sortValue: Record<DriverSearchFilters['sort'], (driver: DriverCandidate) => number> = {
    RECOMMENDED: (driver) => driver.rating * 20 - driver.pickupDistanceKm - driver.hourlyRate / 100,
    CLOSEST: (driver) => driver.pickupDistanceKm,
    LOWEST_FARE: (driver) => driver.hourlyRate,
    HIGHEST_RATED: (driver) => -driver.rating,
  };

  return [...matches].sort((left, right) => sortValue[filters.sort](left) - sortValue[filters.sort](right));
}

function buildQuote(request: BookingQuoteRequest): BookingQuote {
  const window =
    request.bookingType === 'SCHEDULED' && request.pickupAt
      ? getBroadcastWindow(request.pickupAt)
      : { startAt: null, endAt: null };
  const now = Date.now();
  const baseFare = Math.round(
    request.driver.hourlyRate * (request.route.durationMinutes / 60)
  );

  return {
    quoteId: newId('quote'),
    currency: 'INR',
    pricingMode: 'HOURLY',
    driver: request.driver,
    hourlyRate: request.driver.hourlyRate,
    estimatedDistanceKm: request.route.distanceKm,
    estimatedDurationMinutes: request.route.durationMinutes,
    estimatedBaseFare: baseFare,
    policyVersion: 'RV-RELEASE-1',
    waitingPolicy: `${publicPolicy.freeWaitingMinutes} minutes free waiting, then ₹${publicPolicy.waitingFeeInr} under the approved policy.`,
    cancellationPolicy:
      request.bookingType === 'INSTANT'
        ? 'Instant cancellation is ₹0.'
        : 'Scheduled: ₹0 before acceptance or within five minutes, ₹50 after five minutes before arrival, ₹100 after arrival.',
    exclusions: [...publicPolicy.excludedExpenses],
    broadcastStartAt: window.startAt,
    broadcastEndAt: window.endAt,
    responseDeadlineAt:
      request.bookingType === 'INSTANT'
        ? new Date(now + publicPolicy.instantResponseWindowMinutes * 60 * 1000).toISOString()
        : null,
    frozenAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
    demo: true,
  };
}

export function createQuoteDemo(request: BookingQuoteRequest): BookingQuote {
  return buildQuote(request);
}

function defaultBookingLocation(label: string): BookingLocation {
  const coordinates: Record<string, { lat: number; lng: number }> = {
    pickup: { lat: 12.9719, lng: 77.6412 },
    destination: { lat: 12.9352, lng: 77.6245 },
  };
  return {
    id: `${label}-fixture`,
    label: label === 'pickup' ? 'Indiranagar Metro Station' : 'Koramangala 5th Block',
    address: label === 'pickup' ? '100 Feet Road, Indiranagar' : '80 Feet Road, Koramangala',
    position: coordinates[label],
  };
}

function seedBookings(uid: string): BookingRecord[] {
  const pickup = defaultBookingLocation('pickup');
  const destination = defaultBookingLocation('destination');
  const vehicle = DEFAULT_EXTRAS.vehicles[0];
  const driver = DRIVERS[1];
  const request: BookingQuoteRequest = {
    pickup,
    destination,
    stops: [],
    bookingType: 'INSTANT',
    pickupAt: null,
    vehicle,
    driver,
    route: {
      provider: 'demo',
      routeId: 'seed-route',
      distanceKm: 6.2,
      durationMinutes: 22,
      path: [pickup.position, destination.position],
      summary: 'Demo road route',
      calculatedAt: new Date().toISOString(),
    },
    filters: {
      maxHourlyRate: null,
      maxPickupDistanceKm: 15,
      minRating: 0,
      minExperienceYears: 0,
      languages: [],
      sort: 'RECOMMENDED',
      radiusKm: 15,
    },
  };
  const quote = buildQuote(request);
  quote.quoteId = `${uid}-seed-quote`;

  return [
    {
      id: 'VEY-DEMO-2041',
      status: 'ACTIVE',
      bookingType: 'INSTANT',
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      pickupAt: null,
      pickup,
      destination,
      stops: [],
      vehicle,
      driver,
      quote,
    },
    {
      id: 'VEY-DEMO-1987',
      status: 'COMPLETED',
      bookingType: 'SCHEDULED',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      pickupAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      pickup,
      destination,
      stops: [],
      vehicle,
      driver: DRIVERS[0],
      quote: { ...quote, quoteId: `${uid}-seed-completed` },
    },
  ];
}

export function listBookingsDemo(uid: string): BookingRecord[] {
  const existing = readJson<BookingRecord[]>(`${BOOKINGS_KEY}${uid}`);
  if (existing) {
    return existing.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
  const seeded = seedBookings(uid);
  writeJson(`${BOOKINGS_KEY}${uid}`, seeded);
  return seeded;
}

export function createBookingDemo(
  uid: string,
  request: BookingQuoteRequest,
  quote: BookingQuote
): BookingRecord {
  const bookings = listBookingsDemo(uid);
  const booking: BookingRecord = {
    id: newId('VEY-DEMO').toUpperCase(),
    status: 'AWAITING_DRIVER',
    bookingType: request.bookingType,
    createdAt: new Date().toISOString(),
    pickupAt: request.pickupAt,
    pickup: request.pickup,
    destination: request.destination,
    stops: request.stops,
    vehicle: request.vehicle,
    driver: request.driver,
    quote,
  };
  writeJson(`${BOOKINGS_KEY}${uid}`, [booking, ...bookings]);
  return booking;
}

export function cancelBookingDemo(uid: string, bookingId: string, reason: string): BookingRecord[] {
  const bookings = listBookingsDemo(uid).map((booking) =>
    booking.id === bookingId
      ? { ...booking, status: 'CANCELLED' as const, cancelReason: reason }
      : booking
  );
  writeJson(`${BOOKINGS_KEY}${uid}`, bookings);
  return bookings;
}

export function getCustomerDetailsDemo(user: AuthUser): CustomerProfileDetails {
  const profile = getDemoProfile(user.uid) ?? bootstrapDemoSession(user, 'customer');
  const extras = readExtras();
  return {
    ...profile,
    role: 'CUSTOMER',
    ...extras,
  };
}

export function saveCustomerDetailsDemo(
  user: AuthUser,
  update: CustomerProfileUpdate
): CustomerProfileDetails {
  const current = getCustomerDetailsDemo(user);
  const profile = saveDemoProfile({
    ...current,
    fullName: update.fullName,
    phone: update.phone,
    role: 'CUSTOMER',
    updatedAt: new Date().toISOString(),
  });
  const extras: DemoCustomerExtras = {
    ...current,
    vehicles: update.vehicles,
    emergencyContacts: update.emergencyContacts,
    notifications: update.notifications,
    privacy: update.privacy,
  };
  writeJson(CUSTOMER_DETAILS_KEY, extras);

  return {
    ...profile,
    ...extras,
  };
}

export function setDriverFavouriteDemo(
  user: AuthUser,
  driverId: string,
  favourite: boolean
): CustomerProfileDetails {
  const current = getCustomerDetailsDemo(user);
  const favouriteDriverIds = favourite
    ? Array.from(new Set([...current.favouriteDriverIds, driverId]))
    : current.favouriteDriverIds.filter((id) => id !== driverId);
  const extras: DemoCustomerExtras = { ...current, favouriteDriverIds };
  writeJson(CUSTOMER_DETAILS_KEY, extras);
  return { ...current, ...extras };
}
