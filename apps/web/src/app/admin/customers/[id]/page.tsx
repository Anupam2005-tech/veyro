import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminCustomerDetail from '@/components/admin/admin-customer-detail';

export const metadata: Metadata = {
  title: 'Customer status detail — Veyro',
  description: 'Inspect a Veyro customer suspension and record an audited restore.',
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AdminCustomerDetail customerId={id} />
    </Suspense>
  );
}
