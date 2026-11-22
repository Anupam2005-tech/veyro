import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShareView from '@/components/customer/share-view';

export const metadata: Metadata = {
  title: 'Shared trip — Veyro',
  description: 'View a read-only shared Veyro trip after signing in.',
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <ShareView token={token} />
    </Suspense>
  );
}
