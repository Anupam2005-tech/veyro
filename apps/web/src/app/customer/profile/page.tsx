import { Suspense } from 'react';
import CustomerProfile from '@/components/customer/customer-profile';

export const metadata = {
  title: 'Customer profile | Veyro',
  description: 'Manage your Veyro customer profile, vehicles and emergency contacts.',
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <CustomerProfile />
    </Suspense>
  );
}
