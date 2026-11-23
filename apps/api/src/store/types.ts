/**
 * Durable entity shapes (docs/veyro.md §9). Dates are ISO strings so the
 * local JSON store and a future Firestore adapter share one shape.
 */
export type Role = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone: string;
  status: AccountStatus;
  onboarded: boolean;
  consentAt: string | null;
  customerCancellationCount: number;
  suspensionReason: string | null;
  suspendedAt: string | null;
  emergencyContacts: EmergencyContact[];
  favouriteDriverIds: string[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  plate: string;
  category: string;
  transmission: string;
  fuelType: string;
  isDefault: boolean;
  createdAt: string;
}

export type DriverApprovalStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'NEEDS_CHANGES'
  | 'REJECTED'
  | 'APPROVED'
  | 'DEACTIVATED';

export interface Presence {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
  receivedAt: string;
  source: 'DEVICE' | 'DEMO';
}

export interface Driver {
  id: string;
  approvalStatus: DriverApprovalStatus;
  isSuspended: boolean;
  isOnline: boolean;
  hourlyRateInr: number;
  perKmRateInr: number | null;
  categories: string[];
  transmissions: string[];
  serviceArea: Place & { radiusKm: number };
  languages: string[];
  experienceYears: number;
  bio: string;
  ratingSum: number;
  ratingCount: number;
  verifiedNoShowCount: number;
  suspensionReason: string | null;
  suspendedAt: string | null;
  presence: Presence | null;
  /** Seeded demo drivers whose GPS the server simulates when no device is reporting. */
  simulated: boolean;
  lastDevicePostAt: string | null;
}

export interface DriverDocument {
  id: string;
  kind: 'LICENCE' | 'GOVERNMENT_ID' | 'PHOTO';
  filename: string;
  mime: string;
  size: number;
  storagePath: string;
  uploadedAt: string;
}

export interface DriverApplication {
  id: string;
  driverId: string;
  status: DriverApprovalStatus;
  profile: {
    name: string;
    phone: string;
    experienceYears: number;
    languages: string[];
    bio: string;
  };
  capabilities: { categories: string[]; transmissions: string[] };
  serviceArea: Place & { radiusKm: number };
  rates: { hourlyRateInr: number; perKmRateInr: number | null };
  documents: DriverDocument[];
  reviewReason: string | null;
  requestedChanges: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  updatedAt: string;
}

export type BookingType = 'INSTANT' | 'SCHEDULED';
export type BookingStatus =
  | 'SEARCHING'
  | 'SCHEDULED_QUEUED'
  | 'SCHEDULED_BROADCASTING'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'NEEDS_REBOOK'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_DRIVER'
  | 'EXPIRED'
  | 'CUSTOMER_NO_SHOW'
  | 'DRIVER_NO_SHOW';

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
  routeSource: RouteSource;
}

export type RouteSource = 'OSRM' | 'ESTIMATE';

export interface Booking {
  id: string;
  customerId: string;
  driverId: string | null;
  offeredDriverId: string | null;
  vehicleSnapshot: Omit<Vehicle, 'customerId' | 'isDefault' | 'createdAt'>;
  pickup: Place;
  destination: Place;
  stops: Place[];
  routePolyline: [number, number][];
  type: BookingType;
  pickupAt: string;
  status: BookingStatus;
  offerExpiresAt: string | null;
  offerOutcome: 'REJECTED' | 'EXPIRED' | null;
  declinedBy: string[];
  /** Scheduled only: highest driver hourly rate shown in the customer's estimate range. */
  rateCapInr: number | null;
  broadcastStartAt: string | null;
  broadcastEndAt: string | null;
  quoteSnapshot: QuoteSnapshot;
  acceptedAt: string | null;
  promisedArrivalAt: string | null;
  cancellation: {
    by: Role;
    reason: string;
    note: string;
    feeInr: number;
    at: string;
  } | null;
  tripId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TripStatus =
  | 'NOT_STARTED'
  | 'DRIVER_EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CUSTOMER_NO_SHOW'
  | 'DRIVER_NO_SHOW';

export interface OtpState {
  hash: string;
  expiresAt: string;
  attempts: number;
}

export interface Trip {
  id: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  status: TripStatus;
  arrivedAt: string | null;
  arrivalMethod: 'GPS' | 'CUSTOMER_CONFIRMED' | null;
  startedAt: string | null;
  endedAt: string | null;
  startOtp: OtpState | null;
  endOtp: OtpState | null;
  /** DEC-06 waiting fee fixed at the moment the Start OTP succeeds. */
  waitingFeeInr: number;
  location: Presence | null;
  fare: {
    baseFareInr: number;
    waitingFeeInr: number;
    noShowFeeInr: number;
    platformFeeInr: number;
    totalInr: number;
    billableMinutes: number;
  } | null;
  rating: { stars: number; comment: string; at: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type LedgerType = 'TRIP_FARE' | 'NO_SHOW_FEE' | 'CANCELLATION_FEE' | 'DRIVER_EARNING' | 'DRIVER_NO_SHOW_CREDIT';

export interface LedgerEntry {
  id: string;
  ownerId: string;
  ownerRole: 'CUSTOMER' | 'DRIVER';
  tripId: string | null;
  bookingId: string;
  type: LedgerType;
  amountInr: number;
  status: 'UNPAID' | 'PAID' | 'CREDITED' | 'WAIVED';
  reason: string;
  disputeStatus: 'NONE' | 'UNDER_REVIEW' | 'UPHELD' | 'REJECTED';
  linkedReportId: string | null;
  paymentId: string | null;
  createdAt: string;
}

export type PaymentStatus =
  | 'CREATED'
  | 'ORDER_CREATED'
  | 'PENDING'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'REVIEW_REQUIRED';

export interface Payment {
  id: string;
  customerId: string;
  ledgerEntryIds: string[];
  amountInr: number;
  currency: 'INR';
  mode: 'RAZORPAY_TEST' | 'DEMO';
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  idempotencyKey: string;
  status: PaymentStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  tripId: string;
  reporterId: string;
  reporterRole: Role;
  reportedUserId: string;
  category: string;
  description: string;
  status: ReportStatus;
  linkedLedgerEntryId: string | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  reason: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  tripId: string;
  tokenHash: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface SosEvent {
  id: string;
  tripId: string;
  customerId: string;
  raisedBy: string;
  status: 'ACTIVE' | 'CANCELLED';
  locationSnapshot: Presence | null;
  deliveryAttempts: { contactId: string; name: string; phone: string; status: 'DEMO_NOT_SENT' }[];
  createdAt: string;
  cancelledAt: string | null;
}

export interface SignInCode {
  email: string;
  hash: string;
  expiresAt: string;
  attempts: number;
}

export interface Database {
  meta: { version: number; sessionSecret: string; seededAt: string };
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  applications: DriverApplication[];
  bookings: Booking[];
  trips: Trip[];
  ledger: LedgerEntry[];
  payments: Payment[];
  webhookEvents: string[];
  reports: Report[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  shareLinks: ShareLink[];
  sosEvents: SosEvent[];
  signInCodes: SignInCode[];
}
