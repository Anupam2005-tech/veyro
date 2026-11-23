import { Suspense } from 'react';
import BookingStudio from '@/components/customer/booking-studio';

export const metadata = {
  title: 'Customer booking studio | Veyro',
  description: 'Plan a road route, compare eligible drivers and freeze a server-side quote.',
};

export default function CustomerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <BookingStudio />
    </Suspense>
  );
}
