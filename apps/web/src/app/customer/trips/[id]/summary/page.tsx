import { Suspense } from 'react';
import type { Metadata } from 'next';
import TripSummary from '@/components/customer/trip-summary';

export const metadata: Metadata = {
  title: 'Trip receipt — Veyro',
  description: 'Review the final fare, rate the drive and report an issue.',
};

export default async function TripSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <TripSummary tripId={id} />
    </Suspense>
  );
}
