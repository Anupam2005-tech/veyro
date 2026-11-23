import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminCustomers from '@/components/admin/admin-customers';

export const metadata: Metadata = {
  title: 'Customer status — Veyro',
  description: 'Review Veyro customer account status and cancellation incidents.',
};

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminCustomers />
    </Suspense>
  );
}
