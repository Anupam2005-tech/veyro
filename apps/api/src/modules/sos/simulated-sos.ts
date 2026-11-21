interface TripCustomer {
  tripId: string;
  customerId: string;
}

export function prepareSimulatedSos(verifiedUid: string | null, trip: TripCustomer) {
  if (!verifiedUid || verifiedUid !== trip.customerId) {
    throw new Error('Only the verified trip customer can request simulated SOS');
  }
  return {
    tripId: trip.tripId,
    customerId: trip.customerId,
    createdAt: new Date(),
    deliveryAttempts: [] as const,
    externalAlertSent: false as const,
    message: 'Demo SOS. No external alert or emergency-service notification was sent.',
  };
}
