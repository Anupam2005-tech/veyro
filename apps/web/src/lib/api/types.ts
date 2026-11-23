import type { Coordinate, RoutePreview } from '../maps/types';

export type VeyroRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';
export type DriverApplicationStatus =
  | 'PENDING_REVIEW'
  | 'NEEDS_CHANGES'
  | 'REJECTED'
  | 'APPROVED'
  | 'DEACTIVATED';
export type RoleIntent = 'customer' | 'driver';

export interface DriverDocumentMeta {
  id?: string;
  kind: 'LICENCE' | 'GOVERNMENT_ID' | 'PROFILE_PHOTO';
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface VeyroProfile {
  uid: string;
  role: VeyroRole;
  fullName: string;
  phone: string;
  onboardingComplete: boolean;
  applicationStatus?: DriverApplicationStatus;
  adminReason?: string;
  documents?: DriverDocumentMeta[];
  updatedAt: string;
}

export interface CustomerVehicleInput {
  make: string;
  model: string;
  category: string;
  transmission: string;
  fuelType: string;
}

export interface CustomerOnboardingInput {
  fullName: string;
  phone: string;
  consentTerms: boolean;
  consentPrivacy: boolean;
  vehicle: CustomerVehicleInput | null;
}

export interface DriverApplicationInput {
  serviceAreaBounds?: { southWest: Coordinate; northEast: Coordinate };
  serviceAreaPlaceIds?: string[];
  fullName: string;
  phone: string;
  experienceYears: string;
  languages: string[];
  categories: string[];
  transmissions: string[];
  serviceAreas: string;
  hourlyRate: string;
  perKmRate: string;
  documents: DriverDocumentMeta[];
}

export type BookingType = 'INSTANT' | 'SCHEDULED';
export type BookingStatus =
  | 'EXPIRED'
  | 'NEEDS_REBOOK'
  | 'SCHEDULED_QUEUED'
  | 'SCHEDULED_BROADCASTING'
  | 'AWAITING_DRIVER'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';
export type DriverSort = 'RECOMMENDED' | 'CLOSEST' | 'LOWEST_FARE' | 'HIGHEST_RATED';
export type VehicleTransmission = 'MANUAL' | 'AUTOMATIC';

export interface BookingLocation {
  id: string;
  label: string;
  address: string;
  position: Coordinate;
}

export interface BookingVehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  transmission: VehicleTransmission;
  fuelType: string;
  registrationNumber?: string;
}

export interface DriverCandidate {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  experienceYears: number;
  languages: string[];
  hourlyRate: number;
  pickupDistanceKm: number;
  responseEtaMinutes: number;
  verified: boolean;
  vehicle: Omit<BookingVehicle, 'id'>;
  position?: Coordinate;
}

export interface DriverSearchFilters {
  maxHourlyRate: number | null;
  maxPickupDistanceKm: number;
  minRating: number;
  minExperienceYears: number;
  languages: string[];
  sort: DriverSort;
  radiusKm: number;
}

export interface BookingQuoteRequest {
  pickup: BookingLocation;
  destination: BookingLocation;
  stops: BookingLocation[];
  bookingType: BookingType;
  pickupAt: string | null;
  vehicle: BookingVehicle;
  driver: DriverCandidate;
  route: RoutePreview;
  filters: DriverSearchFilters;
}

export interface BookingQuote {
  routeId?: string;
  quoteId: string;
  currency: 'INR';
  pricingMode: 'HOURLY';
  driver: DriverCandidate;
  hourlyRate: number;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedBaseFare: number;
  policyVersion: string;
  waitingPolicy: string;
  cancellationPolicy: string;
  exclusions: string[];
  broadcastStartAt: string | null;
  broadcastEndAt: string | null;
  responseDeadlineAt: string | null;
  frozenAt: string;
  expiresAt: string;
  demo: boolean;
}

export interface BookingRecord {
  id: string;
  status: BookingStatus;
  bookingType: BookingType;
  createdAt: string;
  pickupAt: string | null;
  pickup: BookingLocation;
  destination: BookingLocation;
  stops: BookingLocation[];
  vehicle: BookingVehicle;
  driver: DriverCandidate | null;
  quote: BookingQuote;
  cancelReason?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface CustomerNotificationPreferences {
  bookingUpdates: boolean;
  tripStatus: boolean;
  safetyAlerts: boolean;
  serviceMessages: boolean;
}

export interface CustomerPrivacyPreferences {
  tripSharing: boolean;
  matchingProfile: boolean;
  analytics: boolean;
}

export interface CustomerProfileDetails extends VeyroProfile {
  hasAvatar?: boolean;
  unpaidInvoiceId?: string | null;
  vehicles: BookingVehicle[];
  emergencyContacts: EmergencyContact[];
  unpaidBalance: number;
  disputedAmountUnderReview: boolean;
  favouriteDriverIds: string[];
  notifications: CustomerNotificationPreferences;
  privacy: CustomerPrivacyPreferences;
}

export interface CustomerProfileUpdate {
  fullName: string;
  phone: string;
  vehicles: BookingVehicle[];
  emergencyContacts: EmergencyContact[];
  notifications: CustomerNotificationPreferences;
  privacy: CustomerPrivacyPreferences;
}

export type TripState =
  | 'AWAITING_DRIVER'
  | 'EN_ROUTE'
  | 'ARRIVED_WAITING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LiveLocation {
  position: Coordinate;
  updatedAt: string;
  accuracyMeters: number;
  stale: boolean;
}

export interface SosContactDelivery {
  name: string;
  channel: 'SMS' | 'CALL' | 'WHATSAPP';
  status: 'QUEUED' | 'UNKNOWN' | 'DELIVERED' | 'FAILED';
}

export interface SosEventRecord {
  id: string;
  createdAt: string;
  position: Coordinate;
  contacts: SosContactDelivery[];
  demo: boolean;
}

export interface ShareLinkDetails {
  shareId?: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface FinalFareLine {
  label: string;
  amountInr: number;
}

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_VERIFICATION'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'REVIEW_REQUIRED';

export interface FinalFare {
  lines: FinalFareLine[];
  totalInr: number;
  estimateInr: number;
  pricingMode: 'HOURLY';
  billableMinutes: number;
  billableKm: number;
  waitingFeeInr: number;
  noShowFeeInr: number;
  commissionInr: number;
  exclusions: string[];
  paymentStatus: PaymentStatus;
  paymentReference?: string;
}

export interface TripRecord {
  id: string;
  bookingId: string;
  bookingType: BookingType;
  state: TripState;
  createdAt: string;
  pickup: BookingLocation;
  destination: BookingLocation;
  stops: BookingLocation[];
  route: RoutePreview;
  vehicle: BookingVehicle;
  driver: DriverCandidate | null;
  quotedFareInr: number;
  customerName: string;
  customerPhone: string;
  liveLocation: LiveLocation | null;
  driverEtaMinutes: number | null;
  arrivalAt: string | null;
  waitingStartedAt: string | null;
  waitingFeeInr: number;
  startOtp: string;
  endOtp: string;
  startOtpShownAt: string | null;
  endOtpShownAt: string | null;
  sosEvents: SosEventRecord[];
  share: ShareLinkDetails | null;
  finalFare: FinalFare | null;
  rating?: number;
  reportId?: string;
  noShowRequested?: boolean;
  demo: boolean;
}

export interface SharedTripView {
  tripId: string;
  state: TripState;
  pickupLabel: string;
  destinationLabel: string;
  pickupPosition: Coordinate | null;
  destinationPosition: Coordinate | null;
  driverName: string | null;
  driverVehicle: string | null;
  driverEtaMinutes: number | null;
  liveLocation: LiveLocation | null;
  shareExpiresAt: string;
  demo: boolean;
}

export interface RatingSubmission {
  rating: number;
  note?: string;
}

export interface ReportSubmission {
  tripId: string;
  reporterRole: 'CUSTOMER' | 'DRIVER';
  category: 'SAFETY_CONCERN' | 'FARE_OR_PAYMENT' | 'SERVICE_ISSUE' | 'DRIVER_CONDUCT' | 'CUSTOMER_CONDUCT' | 'LOST_ITEM' | 'OTHER';
  description: string;
}

export interface DriverOffer {
  id: string;
  bookingId: string;
  type: BookingType;
  customerName: string;
  vehicle: BookingVehicle;
  pickup: BookingLocation;
  destination: BookingLocation;
  route: RoutePreview;
  estimatedEarningsInr: number;
  expiresAt: string;
  broadcastStartAt: string | null;
  broadcastEndAt: string | null;
  pickupAt: string | null;
  status: 'AVAILABLE' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'ALREADY_ACCEPTED';
}

export interface DriverEarningsEntry {
  id: string;
  tripId: string;
  completedAt: string;
  description: string;
  grossInr: number;
  waitingCreditInr: number;
  commissionInr: number;
  adjustmentInr: number;
  netInr: number;
  demo: boolean;
}

export interface DriverEarningsSummary {
  totalNetInr: number;
  grossInr: number;
  waitingCreditInr: number;
  commissionInr: number;
  adjustmentsInr: number;
  completedTrips: number;
  hourlyRateInr: number;
  rateEffectiveFrom: string;
  rateChangeCopy: string;
  entries: DriverEarningsEntry[];
  demo: boolean;
}

export interface DriverIncidentEntry {
  id: string;
  createdAt: string;
  kind: 'NO_SHOW' | 'LATE_ARRIVAL' | 'CANCELLATION';
  tripId?: string;
  description: string;
}

export interface DriverProfileDetails extends VeyroProfile {
  activeTripState?: TripState;
  experienceYears: string;
  languages: string[];
  categories: string[];
  transmissions: string[];
  serviceAreas: string;
  hourlyRateInr: number;
  online: boolean;
  gpsFresh: boolean;
  locationPermission: 'GRANTED' | 'PROMPT' | 'DENIED';
  activeTripId: string | null;
  noShowIncidents: number;
  suspensionReason?: string;
}

export interface DriverProfileUpdate {
  hourlyRateInr?: number;
  transmissions?: string[];
  fullName: string;
  phone: string;
  experienceYears: string;
  languages: string[];
  categories: string[];
  serviceAreas: string;
}

export type AdminReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface AdminReviewInput {
  action: AdminReviewAction;
  reason?: string;
  missingItems?: string[];
}

export interface AdminAuditEntry {
  id: string;
  createdAt: string;
  adminId: string;
  action: string;
  oldState: string;
  newState: string;
  reason?: string;
}

export interface AdminApplicationRecord {
  serviceAreaPlaceIds?: string[];
  serviceAreaBounds?: { southWest: Coordinate; northEast: Coordinate };
  id: string;
  driverUid: string;
  driverName: string;
  phone: string;
  submittedAt: string;
  status: DriverApplicationStatus;
  experienceYears: string;
  languages: string[];
  categories: string[];
  transmissions: string[];
  serviceAreas: string;
  hourlyRateInr: number;
  documents: DriverDocumentMeta[];
  adminReason?: string;
  missingItems?: string[];
  incidentCount: number;
  incidentHistory: DriverIncidentEntry[];
  auditTrail: AdminAuditEntry[];
}

export interface CustomerIncidentEntry {
  id: string;
  createdAt: string;
  category: 'CANCELLATION' | 'NO_SHOW_DISPUTE' | 'PAYMENT_DISPUTE';
  description: string;
  qualifying: boolean;
}

export interface CustomerAccountRecord {
  id: string;
  customerUid: string;
  fullName: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  suspensionReason?: string;
  cancellationIncidentCount: number;
  incidents: CustomerIncidentEntry[];
  auditTrail: AdminAuditEntry[];
}

export interface AdminOverviewData {
  pendingApplications: number;
  approvedDrivers: number;
  rejectedApplications: number;
  openReports: number;
  applications: AdminApplicationRecord[];
  demo: boolean;
}

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface ReportRecord {
  id: string;
  tripId: string;
  reporterRole: 'CUSTOMER' | 'DRIVER';
  reporterName: string;
  category: ReportSubmission['category'];
  description: string;
  createdAt: string;
  status: ReportStatus;
  resolutionNote?: string;
  dismissReason?: string;
}

export interface ReportResolutionInput {
  action: 'UNDER_REVIEW' | 'RESOLVE' | 'DISMISS';
  note?: string;
}
