import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = {
  title: 'Chauffeur Portal — Veyro',
  description: 'Sign in to the Veyro Chauffeur Portal to manage trips, vehicle dispatches, and instant payouts.',
};

export default function DriverAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F5]" />}>
      <AuthScreen role="driver" />
    </Suspense>
  );
}

