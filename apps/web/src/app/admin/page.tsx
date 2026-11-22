import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminOverview from '@/components/admin/admin-overview';

export const metadata: Metadata = {
  title: 'Admin overview — Veyro',
  description: 'Review driver applications and operational KPIs.',
};

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminOverview />
    </Suspense>
  );
}
