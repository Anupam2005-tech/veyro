import { Suspense } from 'react';
import type { Metadata } from 'next';
import EmailLinkCallback from '@/components/auth/email-link-callback';

export const metadata: Metadata = {
  title: 'Completing sign-in — Veyro',
  description: 'Complete your passwordless Veyro sign-in.',
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-night-canvas" />}>
      <EmailLinkCallback />
    </Suspense>
  );
}
