import { Suspense } from 'react';
import type { Metadata } from 'next';
import DriverTripCockpit from '@/components/driver/driver-trip-cockpit';

export const metadata: Metadata = {
  title: 'Driver trip cockpit — Veyro',
  description: 'Navigation, arrival confirmation and OTP verification for an active trip.',
};

export default async function DriverTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <DriverTripCockpit tripId={id} />
    </Suspense>
  );
}
