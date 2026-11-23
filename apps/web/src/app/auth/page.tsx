import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = {
  title: 'Authentication — Veyro',
  description: 'Private authentication portal for Veyro vehicle owners, chauffeurs, and operations.',
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F5]" />}>
      <AuthScreen />
    </Suspense>
  );
}
