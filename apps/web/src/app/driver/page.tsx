import { Suspense } from 'react';
import type { Metadata } from 'next';
import DriverDashboard from '@/components/driver/driver-dashboard';

export const metadata: Metadata = {
  title: 'Driver dashboard — Veyro',
  description: 'Manage availability and respond to eligible Veyro driving offers.',
};

export default function DriverDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <DriverDashboard />
    </Suspense>
  );
}
