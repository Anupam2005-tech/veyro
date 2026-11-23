import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminApplications from '@/components/admin/admin-applications';

export const metadata: Metadata = {
  title: 'Applications — Veyro',
  description: 'Browse Veyro driver applications for review.',
};

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminApplications />
    </Suspense>
  );
}
