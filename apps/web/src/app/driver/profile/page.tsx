import { Suspense } from 'react';
import type { Metadata } from 'next';
import DriverProfile from '@/components/driver/driver-profile';

export const metadata: Metadata = {
  title: 'Driver profile — Veyro',
  description: 'Manage your Veyro driver profile and verification details.',
};

export default function DriverProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <DriverProfile />
    </Suspense>
  );
}
