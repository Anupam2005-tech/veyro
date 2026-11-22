import Link from 'next/link';
import { AppShell, PublicHeader, VeyroButton } from '@veyro/ui';
import { BookingModes } from '@/components/landing/BookingModes';
import { Faq } from '@/components/landing/Faq';
import { FareSafety } from '@/components/landing/FareSafety';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { InstallAppButton } from '@/components/landing/InstallAppButton';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { TripVerification } from '@/components/landing/TripVerification';
import { VehicleExplainer } from '@/components/landing/VehicleExplainer';

export default function HomePage() {
  return (
    <AppShell
      theme="night"
      header={
        <PublicHeader
          links={[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Booking', href: '#booking-modes' },
            { label: 'Fares', href: '#fares' },
            { label: 'Safety', href: '#safety' },
            { label: 'FAQ', href: '#faq' },
          ]}
          actions={
            <>
              <InstallAppButton />
              <VeyroButton asChild size="sm" variant="secondary">
                <Link href="/auth">Sign In</Link>
              </VeyroButton>
            </>
          }
        />
      }
      footer={<SiteFooter />}
    >
      <Hero />
      <HowItWorks />
      <BookingModes />
      <VehicleExplainer />
      <FareSafety />
      <TripVerification />
      <Faq />
    </AppShell>
  );
}
