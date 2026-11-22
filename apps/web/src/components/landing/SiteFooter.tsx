import * as React from 'react';
import { WordmarkFooter } from '@/components/ui/wordmark-footer';

export function SiteFooter() {
  return (
    <div className="border-t border-night-border">
      <WordmarkFooter
        name="VEYRO"
        legalName="Veyro Mobility Technologies Pvt. Ltd."
        year={2026}
        description="Your keys. Our pro. Zero traffic stress. Connecting vehicle owners with independent professional chauffeurs."
        status="All systems normal · Release 1"
        email="support@veyro.in"
        columns={[
          {
            title: 'Service',
            links: [
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Instant booking', href: '#booking-modes' },
              { label: 'Scheduled rides', href: '#booking-modes' },
              { label: 'Vehicle pass', href: '#vehicle' },
            ],
          },
          {
            title: 'Safety & Trust',
            links: [
              { label: 'OTP verification', href: '#safety' },
              { label: 'Live trip cockpit', href: '/auth?role=customer' },
              { label: 'Chauffeur standards', href: '/auth?role=driver' },
              { label: 'Fare breakdown', href: '#fares' },
            ],
          },
          {
            title: 'Legal & Info',
            links: [
              { label: 'Terms of service', href: '/legal/terms' },
              { label: 'Privacy policy', href: '/legal/privacy' },
              { label: 'Safety disclosures', href: '/legal/safety' },
              { label: 'FAQ', href: '#faq' },
            ],
          },
        ]}
        credit={{
          label: 'Customer-owned vehicle chauffeur service',
          href: '#',
        }}
      />
    </div>
  );
}
