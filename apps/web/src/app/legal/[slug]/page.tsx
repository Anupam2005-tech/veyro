import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell, PublicHeader, VeyroButton, VeyroWordmark } from '@veyro/ui';

const legalPages = {
  terms: {
    title: 'Terms',
    intro: 'A plain-language summary of how the Release 1 demo works.',
    sections: [
      {
        heading: 'Service model',
        body: 'Veyro connects a vehicle owner with an independent professional driver. The customer supplies the vehicle and keys; the driver supplies the driving service. Veyro is not a taxi fleet or a car-rental service.',
      },
      {
        heading: 'Pricing',
        body: 'Only HOURLY driver-service pricing is active in Release 1. Fuel, tolls and parking are excluded and paid by the vehicle owner. No minimum fare, ₹0 customer platform fee and 0% driver commission apply to the approved Release 1 policy set.',
      },
      {
        heading: 'Demo scope',
        body: 'This is a college capstone demo. Fares, records and safety events are illustrative. No live payments or real identity documents are used.',
      },
    ],
  },
  privacy: {
    title: 'Privacy',
    intro: 'What the demo is designed to collect and protect.',
    sections: [
      {
        heading: 'Account data',
        body: 'Sign-in uses passwordless email link, phone OTP or Google. One identity can hold Customer and Driver roles. Provider linking is handled so one person does not get duplicate profiles.',
      },
      {
        heading: 'Verification documents',
        body: 'Driver documents are private. Uploads are scoped to the current user and privileged review is handled through authorised server access. Public or permanent document URLs are not exposed.',
      },
      {
        heading: 'Trip sharing',
        body: 'A shared trip link requires sign-in and a valid token. The read-only view shows minimum trip information and the link expires at trip completion or when revoked.',
      },
    ],
  },
  safety: {
    title: 'Safety',
    intro: 'Verification and safety behaviour in Release 1.',
    sections: [
      {
        heading: 'Trip verification',
        body: 'Separate start and end OTPs verify the correct driver and trip handoff. Codes expire, have attempt limits and are single-use.',
      },
      {
        heading: 'Emergency SOS',
        body: 'SOS in Release 1 is a demo: it records an event and simulates an alert. No external SMS, call or emergency dispatch is configured, and the UI never claims delivery without confirmation.',
      },
      {
        heading: 'Live location',
        body: 'Live location is shown only for the active trip. After 30 seconds without a valid update, the marker freezes and displays the last update time instead of simulating movement.',
      },
    ],
  },
} as const;

type LegalSlug = keyof typeof legalPages;

export function generateStaticParams() {
  return Object.keys(legalPages).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const page = legalPages[params.slug as LegalSlug];
  return page ? { title: `${page.title} — Veyro` } : {};
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = legalPages[params.slug as LegalSlug];

  if (!page) {
    return (
      <AppShell
        theme="night"
        header={
          <PublicHeader
            announcement="Veyro Release 1 · Demo data where labelled"
            links={[{ label: 'Home', href: '/' }]}
            actions={
              <VeyroButton asChild size="sm" variant="secondary">
                <Link href="/">Back home</Link>
              </VeyroButton>
            }
          />
        }
      >
        <section className="mx-auto max-w-content px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-card border border-night-border bg-night-surface p-8">
            <h1 className="font-display text-3xl font-bold text-night-text">
              Page not found
            </h1>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      theme="night"
      header={
        <PublicHeader
          announcement="Veyro Release 1 · Demo data where labelled"
          links={[
            { label: 'How it works', href: '/#how-it-works' },
            { label: 'Fares', href: '/#fares' },
            { label: 'Safety', href: '/#safety' },
          ]}
          actions={
            <VeyroButton asChild size="sm" variant="secondary">
              <Link href="/">Back home</Link>
            </VeyroButton>
          }
        />
      }
    >
      <article className="mx-auto grid max-w-content gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <VeyroWordmark />
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
            Release 1 demo
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-night-text">
            {page.title}
          </h1>
          <p className="mt-4 text-night-muted">{page.intro}</p>
          <p className="mt-12 text-xs text-night-muted">
            This summary describes the approved Release 1 demo behaviour and is
            not legal advice.
          </p>
        </div>
        <div className="rounded-card border border-night-border bg-night-surface p-6 sm:p-8">
          <div className="space-y-8">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                className="border-t border-night-border pt-6 first:border-t-0 first:pt-0"
              >
                <h2 className="font-display text-xl font-bold text-night-text">
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-night-muted">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </AppShell>
  );
}
