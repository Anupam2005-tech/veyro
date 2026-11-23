import { AppShell } from '@veyro/ui';
import { BookingModes } from '@/components/landing/BookingModes';
import { Faq } from '@/components/landing/Faq';
import { FareSafety } from '@/components/landing/FareSafety';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { TripVerification } from '@/components/landing/TripVerification';
import { VehicleExplainer } from '@/components/landing/VehicleExplainer';
import { VeyroFloatingNavbar } from '@/components/landing/VeyroFloatingNavbar';

export default function HomePage() {
  return (
    <AppShell
      theme="studio"
      header={<VeyroFloatingNavbar />}
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
