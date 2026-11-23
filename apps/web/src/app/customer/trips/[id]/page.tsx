import { Suspense } from 'react';
import type { Metadata } from 'next';
import CustomerTripCockpit from '@/components/customer/customer-trip-cockpit';

export const metadata: Metadata = {
  title: 'Customer trip cockpit — Veyro',
  description: 'Follow your Veyro trip, safety controls and protected sharing.',
};

export default async function CustomerTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <CustomerTripCockpit tripId={id} />
    </Suspense>
  );
}
