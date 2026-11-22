'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Clock3, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import {
  AppShell,
  DemoBadge,
  DynamicTripPill,
  ErrorState,
  FormAlert,
  LoadingState,
  VeyroButton,
} from '@veyro/ui';
import { getSharedTrip } from '@/lib/api/client';
import type { SharedTripView } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import RouteMap from './route-map-dynamic';

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export default function ShareView({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: sessionLoading, demoMode } = useSession();
  const [share, setShare] = React.useState<SharedTripView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace(`/auth?role=customer&returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    let active = true;
    setLoading(true);
    getSharedTrip(user, token)
      .then((next) => {
        if (active) {
          setShare(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'This share link is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, router, sessionLoading, token, user]);

  const header = (
    <header className="border-b border-studio-border bg-studio-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-studio-obsidian font-display text-sm font-extrabold text-white"
          aria-label="Veyro home"
        >
          V
        </Link>
        <div className="flex items-center gap-2">
          {demoMode ? <DemoBadge /> : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-studio-border bg-studio-surface px-3 py-1.5 text-xs font-semibold text-studio-ink">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            Read-only
          </span>
        </div>
      </div>
    </header>
  );

  return (
    <AppShell theme="studio" header={header}>
      <div className="min-h-screen bg-studio-bg px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
                Protected trip share
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
                Shared live trip
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-studio-muted">
                You are signed in and the share token was verified. This view expires at trip
                completion and reveals only the minimum trip information.
              </p>
            </div>
            {share ? (
              <DynamicTripPill label={share.state.replace('_', ' ').toLowerCase()} tone="live" />
            ) : null}
          </div>

          <div className="mt-8">
            {sessionLoading || loading ? (
              <LoadingState label="Verifying share link…" />
            ) : error ? (
              <ErrorState title="Share link unavailable" description={error} />
            ) : !user ? (
              <div className="rounded-card border border-studio-border bg-studio-surface p-8 text-center">
                <LockKeyhole aria-hidden="true" className="mx-auto h-8 w-8 text-studio-ink" />
                <h2 className="mt-4 font-display text-2xl font-extrabold text-studio-ink">
                  Sign in to view this trip
                </h2>
                <p className="mt-3 text-sm text-studio-muted">
                  Authentication plus a valid share token is required.
                </p>
                <VeyroButton asChild className="mt-6">
                  <Link href={`/auth?role=customer&returnTo=${encodeURIComponent(pathname)}`}>
                    Sign in or register
                  </Link>
                </VeyroButton>
              </div>
            ) : share ? (
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <div className="overflow-hidden rounded-card border border-studio-border bg-studio-surface">
                  <RouteMap
                    points={[
                      {
                        id: 'share-pickup',
                        label: share.pickupLabel,
                        address: share.pickupLabel,
                        position: share.pickupPosition,
                      },
                      {
                        id: 'share-destination',
                        label: share.destinationLabel,
                        address: share.destinationLabel,
                        position: share.destinationPosition,
                      },
                    ]}
                    route={null}
                    driverMarkers={
                      share.liveLocation && !share.liveLocation.stale
                        ? [
                            {
                              id: 'shared-driver',
                              position: share.liveLocation.position,
                              label: 'Driver location',
                            },
                          ]
                        : []
                    }
                    showDriverMarkers={Boolean(share.liveLocation && !share.liveLocation.stale)}
                  />
                </div>
                <div className="space-y-5">
                  <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                      Minimum trip information
                    </p>
                    <div className="mt-5 space-y-3 text-sm">
                      <p className="flex items-start gap-3">
                        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-studio-ink" />
                        <span>
                          <span className="block text-xs text-studio-muted">Pickup</span>
                          {share.pickupLabel}
                        </span>
                      </p>
                      <p className="flex items-start gap-3">
                        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-studio-ink" />
                        <span>
                          <span className="block text-xs text-studio-muted">Destination</span>
                          {share.destinationLabel}
                        </span>
                      </p>
                      {share.driverName ? (
                        <p className="rounded-panel bg-studio-bg p-4 text-xs text-studio-ink">
                          Driver: {share.driverName}
                          {share.driverVehicle ? ` · ${share.driverVehicle}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-studio-muted">Driver not assigned yet.</p>
                      )}
                    </div>
                  </section>
                  <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-6">
                    <Clock3 aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                    <p className="mt-3 text-sm font-bold text-studio-ink">
                      {share.driverEtaMinutes !== null
                        ? `Driver ETA ${share.driverEtaMinutes} min`
                        : 'ETA not available'}
                    </p>
                    <p className="mt-2 text-xs text-studio-muted">
                      {share.liveLocation?.stale
                        ? `Location frozen · last updated ${formatTime(share.liveLocation.updatedAt)}`
                        : share.liveLocation
                          ? `Last updated ${formatTime(share.liveLocation.updatedAt)}`
                          : 'Location not shared yet'}
                    </p>
                    <p className="mt-2 text-xs text-studio-muted">
                      Link expires {new Date(share.shareExpiresAt).toLocaleString()}
                    </p>
                  </section>
                  <FormAlert tone="info" title="Privacy">
                    <ShieldCheck aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                    No customer profile, driver profile, phone number, OTP or payment information is
                    included in this view.
                  </FormAlert>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
