import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminApplicationReview from '@/components/admin/admin-application-review';

export const metadata: Metadata = {
  title: 'Application review — Veyro',
  description: 'Review a Veyro driver application and record audited decisions.',
};

export default async function AdminApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminApplicationReview applicationId={id} />
    </Suspense>
  );
}
