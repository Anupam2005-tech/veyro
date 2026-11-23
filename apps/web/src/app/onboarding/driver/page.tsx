import type { Metadata } from 'next';
import DriverOnboarding from '@/components/onboarding/driver-onboarding';

export const metadata: Metadata = {
  title: 'Driver onboarding — Veyro',
  description: 'Apply to become a verified Veyro professional driver.',
};

export default function DriverOnboardingPage() {
  return <DriverOnboarding />;
}
