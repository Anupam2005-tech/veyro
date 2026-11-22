import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = {
  title: 'Sign in — Veyro',
  description: 'Passwordless sign-in for Veyro customers and drivers.',
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-night-canvas" />}>
      <AuthScreen />
    </Suspense>
  );
}
