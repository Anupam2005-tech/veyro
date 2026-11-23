import { Suspense } from 'react';
import type { Metadata } from 'next';
import DriverStatus from '@/components/driver/driver-status';

export const metadata: Metadata = {
  title: 'Driver application status — Veyro',
  description: 'Track your Veyro driver application review status.',
};

export default function DriverStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <DriverStatus />
    </Suspense>
  );
}
