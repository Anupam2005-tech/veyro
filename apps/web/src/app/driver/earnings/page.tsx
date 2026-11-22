import { Suspense } from 'react';
import type { Metadata } from 'next';
import DriverEarnings from '@/components/driver/driver-earnings';

export const metadata: Metadata = {
  title: 'Driver earnings — Veyro',
  description: 'Review completed trips, deductions and net driver earnings.',
};

export default function DriverEarningsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <DriverEarnings />
    </Suspense>
  );
}
