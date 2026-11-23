/** Client-side views of API payloads (mirrors apps/api/src/services/views.ts). */
export type Role = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
  stale: boolean;
  source: 'DEVICE' | 'DEMO';
}

export interface DriverCard {
  id: string;
  name: string;
  firstName: string;
  hourlyRateInr: number;
  rating: number | null;
  ratingCount: number;
  experienceYears: number;
  languages: string[];
  categories: string[];
  transmissions: string[];
  bio: string;
}

export interface DriverSelf extends DriverCard {
  approvalStatus: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  isOnline: boolean;
  perKmRateInr: number | null;
  serviceArea: Place & { radiusKm: number };
  verifiedNoShowCount: number;
  presence: LiveLocation | null;
  presenceFresh: boolean;
}

export interface Me {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  suspensionReason: string | null;
  onboarded: boolean;
  consentAt: string | null;
  emergencyContacts: { id: string; name: string; phone: string }[];
  favouriteDriverIds: string[];
  customerCancellationCount: number;
  outstandingBalanceInr: number;
  driver: DriverSelf | null;
  applicationStatus: string | null;
  unreadNotifications: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
  category: string;
  transmission: string;
  fuelType: string;
  isDefault?: boolean;
}

export interface QuoteSnapshot {
  pricing_mode: 'HOURLY';
  hourlyRateInr: number;
  estimatedRouteKm: number;
  estimatedRouteMinutes: number;
  estimatedBaseFareInr: number;
  displayEstimatedFareInr: number;
  waitingPolicyVersion: string;
  cancellationPolicyVersion: string;
  platformFeeConfigVersion: string;
  quotedAt: string;
  routeSource: 'OSRM' | 'ESTIMATE';
}

export interface Fare {
  baseFareInr: number;
  waitingFeeInr: number;
  noShowFeeInr: number;
  platformFeeInr: number;
  totalInr: number;
  billableMinutes: number;
}

export interface BookingCore {
  id: string;
  type: 'INSTANT' | 'SCHEDULED';
  status: string;
  pickup: Place;
  destination: Place;
  stops: Place[];
  routePolyline: [number, number][];
  pickupAt: string;
  vehicle: Vehicle;
  quote: QuoteSnapshot;
  offerExpiresAt: string | null;
  offerOutcome: 'REJECTED' | 'EXPIRED' | null;
  broadcastStartAt: string | null;
  broadcastEndAt: string | null;
  acceptedAt: string | null;
  promisedArrivalAt: string | null;
  driverNoShowAt: string | null;
  cancellation: { by: Role; reason: string; note: string; feeInr: number; at: string } | null;
  tripId: string | null;
  createdAt: string;
}

export interface Booking extends BookingCore {
  driver: DriverCard | null;
  driverLocation: LiveLocation | null;
  trip: { id: string; status: string; fare: Fare | null; rating: unknown } | null;
  customer: { firstName: string } | null;
  cancellationFeePreviewInr?: number | null;
  estimatedEarningsInr?: number;
}

export interface Trip {
  id: string;
  bookingId: string;
  status: string;
  arrivedAt: string | null;
  arrivalMethod: string | null;
  startedAt: string | null;
  endedAt: string | null;
  fare: Fare | null;
  rating: { stars: number; comment: string; at: string } | null;
  location: LiveLocation | null;
  waiting: { feeInr: number; noShow: boolean; elapsedMin: number; noShowAvailableAt: string; freeUntil: string } | null;
  startOtpIssued: boolean;
  endOtpIssued: boolean;
  driver: DriverCard | null;
  customer: { firstName: string; phone: string } | null;
  driverPhone: string | null;
  booking: BookingCore | null;
}

export interface Policy {
  versions: Record<string, string>;
  searchRadiusKm: number;
  radiusExpansionStepKm: number;
  instantOfferMinutes: number;
  scheduledMinLeadHours: number;
  scheduledMaxLeadDays: number;
  broadcastStartHoursBefore: number;
  broadcastEndHoursBefore: number;
  waitFreeMin: number;
  waitMaxMin: number;
  waitFeeInr: number;
  noShowFeeInr: number;
  driverArrivalGraceMin: number;
  cancelFreeAfterAcceptMin: number;
  cancelBeforeArrivalFeeInr: number;
  cancelAfterArrivalFeeInr: number;
  instantCancelFeeInr: number;
  driverCommissionPct: number;
  customerPlatformFeeInr: number;
  arrivalGeofenceM: number;
  locationStaleSeconds: number;
  sosMode: string;
  cancellationReasons: { CUSTOMER: string[]; DRIVER: string[] };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  tripId: string | null;
  bookingId: string;
  type: string;
  amountInr: number;
  status: string;
  reason: string;
  disputeStatus: string;
  createdAt: string;
}
