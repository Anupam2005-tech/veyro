export const publicPolicy = {
  instantResponseWindowMinutes: 5,
  scheduledMinimumHours: 4,
  scheduledMaximumDays: 30,
  broadcastStartsHoursBeforePickup: 12,
  broadcastEndsHoursBeforePickup: 2,
  initialSearchRadiusKm: 15,
  freeWaitingMinutes: 15,
  maximumWaitingMinutes: 30,
  waitingFeeInr: 50,
  customerNoShowFeeInr: 150,
  instantCancellationFeeInr: 0,
  customerPlatformFeeInr: 0,
  driverCommissionPercent: 0,
  activePricingMode: 'HOURLY',
  disabledPricingMode: 'PER_KM',
  excludedExpenses: ['Fuel', 'Tolls', 'Parking'],
  sosMode: 'DEMO' as const,
} as const;

export const scheduledCancellationSlabCopy = [
  '₹0 before the driver accepts, and within five minutes of acceptance',
  '₹50 after five minutes but before the driver arrives',
  '₹100 after the driver arrives',
] as const;

export const landingFaq = [
  {
    question: 'Is Veyro a taxi or car-rental service?',
    answer:
      'No. You provide your own vehicle and keys. Veyro connects you with an independent professional driver who provides the driving service. We do not supply taxis or rental cars.',
  },
  {
    question: 'How does an instant booking work?',
    answer:
      'You preview the route, see eligible drivers and select one. The selected driver gets a five-minute response window. A driver is only assigned after they accept; we never claim assignment before acceptance.',
  },
  {
    question: 'How far ahead can I schedule a ride?',
    answer:
      'Scheduled bookings can be made from four hours up to 30 days before pickup. Eligible drivers are notified from 12 hours before pickup (or from booking creation, whichever is later) until two hours before pickup.',
  },
  {
    question: 'What does the driver-service fare include?',
    answer:
      'The fare pays for the driver’s time only. It is calculated on HOURLY mode with no minimum fare or minimum billable time. Fuel, tolls and parking are shown separately and are paid by the vehicle owner.',
  },
  {
    question: 'Are there platform fees or commissions?',
    answer:
      'No. Release 1 charges ₹0 customer platform fee and 0% driver commission. PER_KM pricing is stored but disabled until distance tracking passes testing.',
  },
  {
    question: 'What if I need to cancel?',
    answer:
      'Instant booking cancellation is ₹0. For scheduled bookings: ₹0 before acceptance and within five minutes of acceptance, ₹50 after five minutes but before arrival, and ₹100 after arrival.',
  },
  {
    question: 'How does trip safety work?',
    answer:
      'Trips use separate start and end OTPs, and you can share a read-only live trip link with someone you trust after they sign in. In this demo, SOS records an event only — no external message is sent.',
  },
] as const;
