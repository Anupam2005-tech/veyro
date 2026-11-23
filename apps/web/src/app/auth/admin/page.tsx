import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = {
  title: 'Admin Console — Veyro Operations',
  description: 'Privileged operations console sign-in for Veyro administrators.',
};

export default function AdminAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F5]" />}>
      <AuthScreen role="admin" />
    </Suspense>
  );
}

