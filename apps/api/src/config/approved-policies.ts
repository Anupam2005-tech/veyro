// Approved by the project owner on 22 November 2026.
// Selecting a reason does not itself qualify an incident or waive a charge.
export const bookingPolicyVersions = {
  waitingPolicyVersion: 'DEC-06-2026-11-22',
  cancellationPolicyVersion: 'DEC-05-2026-11-22',
  platformFeeConfigVersion: 'DEC-04-2026-11-22',
} as const;

export const reportCategories = [
  'SAFETY_CONCERN', 'DRIVER_CONDUCT', 'CUSTOMER_CONDUCT', 'SERVICE_ISSUE',
  'FARE_OR_PAYMENT', 'LOST_ITEM', 'OTHER',
] as const;

export const customerCancellationReasons = [
  'PLANS_CHANGED', 'PICKUP_OR_TIME_ISSUE', 'DRIVER_DELAYED', 'DRIVER_NO_SHOW',
  'TECHNICAL_ISSUE', 'OTHER',
] as const;

export const driverCancellationReasons = [
  'UNAVAILABLE', 'VEHICLE_INCOMPATIBLE', 'PICKUP_ACCESS_ISSUE', 'SAFETY_CONCERN',
  'TECHNICAL_ISSUE', 'OTHER',
] as const;
