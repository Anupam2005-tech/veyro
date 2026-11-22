import type { Metadata } from 'next';
import CustomerOnboarding from '@/components/onboarding/customer-onboarding';

export const metadata: Metadata = {
  title: 'Customer onboarding — Veyro',
  description: 'Complete your Veyro customer profile and optional vehicle details.',
};

export default function CustomerOnboardingPage() {
  return <CustomerOnboarding />;
}
