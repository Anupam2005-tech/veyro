'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ConfirmDialog,
  DriverOfferCard,
  DynamicTripPill,
  EmptyState,
  ErrorState,
  FareBreakdown,
  HolographicVehiclePass,
  LoadingState,
  MapBottomSheet,
  NoticeBadge,
  OtpVaultCard,
  PublicHeader,
  SafetyActionButton,
  StatusBadge,
  VeyroButton,
  VeyroWordmark,
  type VeyroStatus,
} from '@veyro/ui';

const statuses: VeyroStatus[] = [
  'pending',
  'approved',
  'rejected',
  'active',
  'needs_changes',
  'deactivated',
  'completed',
];

const demoVehicle = {
  make: 'Honda',
  model: 'City',
  category: 'sedan',
  transmission: 'AUTOMATIC' as const,
  fuelType: 'petrol',
  registrationNumber: 'KA 01 AB 1234',
};

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-theme-border bg-theme-glass p-5 sm:p-6">
      <h3 className="mb-5 font-display text-lg font-bold text-theme-text">{title}</h3>
      {children}
    </section>
  );
}

function ComponentGrid({ theme }: { theme: 'night' | 'studio' }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [actionNotice, setActionNotice] = React.useState('');

  return (
    <div
      data-theme={theme}
      className="space-y-6 rounded-card border border-theme-border bg-theme-canvas p-4 text-theme-text sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">
          {theme === 'night' ? 'Veyro Night' : 'Veyro Studio Light'}
        </h2>
        <span className="font-mono text-xs uppercase tracking-widest text-theme-muted">
          route-bound theme
        </span>
      </div>

      <Panel title="Typography">
        <div className="grid gap-4 sm:grid-cols-3">
          <p className="font-display text-3xl font-extrabold">Display / Syne</p>
          <p className="font-body text-base">Body / Inter — clear and calm.</p>
          <p className="font-mono text-sm">MONO / 482913</p>
        </div>
      </Panel>

      <Panel title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <VeyroButton>Primary</VeyroButton>
          <VeyroButton variant="obsidian">Obsidian</VeyroButton>
          <VeyroButton variant="secondary">Secondary</VeyroButton>
          <VeyroButton variant="destructive">Destructive</VeyroButton>
          <VeyroButton variant="ghost">Ghost</VeyroButton>
          <VeyroButton loading>Loading</VeyroButton>
          <VeyroButton size="sm" asChild>
            <Link href="/">As link</Link>
          </VeyroButton>
        </div>
      </Panel>

      <Panel title="Badges & notices">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <NoticeBadge>Demo notice</NoticeBadge>
          <NoticeBadge tone="danger">Unsafe state</NoticeBadge>
        </div>
        <div className="mt-5">
          <DynamicTripPill
            label="Driver en route"
            countdown="04:32"
            detail="Live · updated 8s ago"
            tone="live"
          />
        </div>
      </Panel>

      <Panel title="Vehicle pass">
        <div className="max-w-md">
          <HolographicVehiclePass vehicle={demoVehicle} />
        </div>
      </Panel>

      <Panel title="OTP vault">
        <div className="grid gap-4 lg:grid-cols-2">
          <OtpVaultCard
            title="Start OTP"
            mode="display"
            code="482913"
            helper="Shown after driver arrival."
          />
          <OtpVaultCard
            title="End OTP"
            mode="input"
            value={otp}
            onChange={setOtp}
            helper="Six digits, single use."
          />
        </div>
      </Panel>

      <Panel title="Driver offer">
        <DriverOfferCard
          vehicle={demoVehicle}
          pickup="Indiranagar, Bengaluru"
          destination="Koramangala, Bengaluru"
          estimatedMinutes={18}
          estimatedKm={7.4}
          estimatedEarnings="₹84.00"
          responseDeadline="04:59 remaining"
          onAccept={() => setActionNotice('Offer accepted (demo).')}
          onDecline={() => setActionNotice('Offer declined (demo).')}
        />
      </Panel>

      <Panel title="Fare breakdown">
        <FareBreakdown
          lines={[
            { label: 'Driver service · 2 hours', amount: '₹420.00', emphasis: true },
            { label: 'Waiting', amount: '₹0.00' },
          ]}
          total="₹420.00"
          exclusions={['Fuel', 'Tolls', 'Parking']}
          note="Illustrative estimate only."
        />
      </Panel>

      <Panel title="States">
        <div className="grid gap-4 lg:grid-cols-3">
          <EmptyState title="No bookings yet" description="Your trips will appear here." />
          <ErrorState
            title="Couldn’t load"
            description="Check your connection and retry."
            actionLabel="Retry"
            onAction={() => setActionNotice('Retry requested (demo).')}
          />
          <LoadingState label="Loading trip…" />
        </div>
      </Panel>

      <Panel title="Dialogs, sheets & safety">
        <div className="flex flex-wrap items-center gap-3">
          <VeyroButton onClick={() => setConfirmOpen(true)}>Open confirm dialog</VeyroButton>
          <MapBottomSheet title="Pickup details">
            <p className="text-sm text-theme-muted">
              Pickup: 12th Main, Indiranagar. Accessible location fields are
              always available alongside the map.
            </p>
          </MapBottomSheet>
          <SafetyActionButton
            demoMode
            onClick={() => setActionNotice('Demo SOS event recorded locally.')}
            label="Demo SOS"
          />
        </div>
        {actionNotice ? (
          <p role="status" className="mt-4 text-xs text-theme-muted">
            {actionNotice}
          </p>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm cancellation?"
        description="This is a demo confirmation. No booking or charge is changed."
        confirmLabel="Confirm (demo)"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          setActionNotice('Cancellation confirmed (demo).');
        }}
      />
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div data-theme="night" className="min-h-screen bg-theme-canvas text-theme-text">
      <PublicHeader
        links={[
          { label: 'Landing page', href: '/' },
          { label: 'Night', href: '#night' },
          { label: 'Studio Light', href: '#studio' },
        ]}
        actions={
          <VeyroButton asChild size="sm" variant="secondary">
            <Link href="/">Back to site</Link>
          </VeyroButton>
        }
      />
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
        <VeyroWordmark />
        <h1 className="mt-6 font-display text-4xl font-bold">Design system</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-theme-muted">
          Shared primitives for Veyro Release 1. Both themes are driven by the
          route/application context — there is no in-app theme toggle.
        </p>
        <div id="night" className="mt-12 scroll-mt-24">
          <ComponentGrid theme="night" />
        </div>
        <div id="studio" className="mt-8 scroll-mt-24">
          <ComponentGrid theme="studio" />
        </div>
      </div>
    </div>
  );
}
