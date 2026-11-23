/**
 * Server-side policy configuration (docs/veyro.md §5, DEC-01..DEC-14).
 * All money in INR. Keep thresholds here — never in React components.
 */
export const POLICY = {
  versions: {
    waiting: 'WAIT-2026.11-DEC06',
    cancellation: 'CANCEL-2026.11-DEC05',
    platformFee: 'FEE-2026.11-DEC04',
  },
  /** DEC-08 */
  searchRadiusKm: 15,
  radiusExpansionStepKm: 10,
  /** §5.2 instant offer window */
  instantOfferMs: 5 * 60 * 1000,
  /** §5.3 scheduled window */
  scheduledMinLeadMs: 4 * 60 * 60 * 1000,
  scheduledMaxLeadMs: 30 * 24 * 60 * 60 * 1000,
  broadcastStartBeforePickupMs: 12 * 60 * 60 * 1000,
  broadcastEndBeforePickupMs: 2 * 60 * 60 * 1000,
  /** DEC-06 */
  waitFreeMin: 15,
  waitMaxMin: 30,
  waitFeeInr: 50,
  noShowFeeInr: 150,
  /** DEC-07 */
  driverArrivalGraceMin: 20,
  /** DEC-05 scheduled customer cancellation */
  cancelFreeAfterAcceptMin: 5,
  cancelBeforeArrivalFeeInr: 50,
  cancelAfterArrivalFeeInr: 100,
  instantCancelFeeInr: 0,
  suspensionIncidentThreshold: 5,
  /** DEC-04 */
  driverCommissionPct: 0,
  customerPlatformFeeInr: 0,
  /** §5.5 arrival geofence */
  arrivalGeofenceM: 100,
  arrivalMaxAccuracyM: 50,
  /** §5.10 */
  locationStaleMs: 30_000,
  /** Documents */
  maxDocumentBytes: 5 * 1024 * 1024,
  allowedDocumentMimes: ['image/jpeg', 'image/png', 'application/pdf'] as readonly string[],
  /** DEC-09 */
  sosMode: 'DEMO' as const,
} as const;

export const CANCELLATION_REASONS = {
  CUSTOMER: ['CHANGE_OF_PLANS', 'DRIVER_TOO_FAR', 'DRIVER_LATE', 'BOOKED_BY_MISTAKE', 'OTHER'],
  DRIVER: ['VEHICLE_ISSUE', 'CUSTOMER_UNREACHABLE', 'PERSONAL_EMERGENCY', 'UNSAFE_PICKUP', 'OTHER'],
} as const;

export const REPORT_CATEGORIES = [
  'SAFETY_CONCERN',
  'UNPROFESSIONAL_BEHAVIOUR',
  'VEHICLE_DAMAGE',
  'FARE_DISPUTE',
  'INCORRECT_NO_SHOW',
  'OTHER',
] as const;

export const VEHICLE_CATEGORIES = ['HATCHBACK', 'SEDAN', 'SUV', 'MUV'] as const;
export const TRANSMISSIONS = ['MANUAL', 'AUTOMATIC'] as const;
export const FUEL_TYPES = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'] as const;
