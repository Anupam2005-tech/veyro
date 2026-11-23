import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminReports from '@/components/admin/admin-reports';

export const metadata: Metadata = {
  title: 'Admin reports — Veyro',
  description: 'Review and resolve Veyro safety reports.',
};

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminReports />
    </Suspense>
  );
}
