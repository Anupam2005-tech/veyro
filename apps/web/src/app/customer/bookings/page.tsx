import { Suspense } from 'react';
import BookingHub from '@/components/customer/booking-hub';

export const metadata = {
  title: 'Your bookings | Veyro',
  description: 'Review upcoming, active and past Veyro bookings.',
};

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <BookingHub />
    </Suspense>
  );
}
