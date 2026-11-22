'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  DemoBadge,
  DriverOfferCard,
  DynamicTripPill,
  ErrorState,
  FormAlert,
  LoadingState,
  VeyroButton,
} from '@veyro/ui';
import {
  getDriverOffers,
  getDriverProfile,
  respondToDriverOffer,
  setDriverOnline,
} from '@/lib/api/client';
import type { DriverOffer, DriverProfileDetails } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { useCountdown } from '@/lib/use-countdown';
import RouteMap from '../customer/route-map-dynamic';
import { DriverShell } from './driver-shell';

const previews = ['offline', 'stale', 'denied', 'active-trip'] as const;

function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function deadlineLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function OfferTimer({ target }: { target: string }) {
  const remaining = useCountdown(target);
  return <>{remaining ?? 'Closed'}</>;
}

export default function DriverDashboard() {
  const searchParams = useSearchParams();
  const { user, demoMode } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'driver';
  const preview = previews.find((item) => item === searchParams.get('state')) ?? null;
  const [profile, setProfile] = React.useState<DriverProfileDetails | null>(null);
  const [offers, setOffers] = React.useState<DriverOffer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyOffer, setBusyOffer] = React.useState<string | null>(null);
  const [busyOnline, setBusyOnline] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([getDriverProfile(activeUser), getDriverOffers(activeUser)])
      .then(([nextProfile, nextOffers]) => {
        if (!active) return;
        setProfile(nextProfile);
        setOffers(nextOffers);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeUser]);

  const shownProfile = React.useMemo(() => {
    if (!profile) return null;
    if (preview === 'stale') return { ...profile, online: false, gpsFresh: false };
    if (preview === 'denied') return { ...profile, online: false, locationPermission: 'DENIED' as const };
    if (preview === 'active-trip') return { ...profile, online: false, activeTripId: 'VEY-DEMO-2041' };
    if (preview === 'offline') return { ...profile, online: false };
    return profile;
  }, [preview, profile]);

  const instantOffers = offers.filter((offer) => offer.type === 'INSTANT');
  const scheduledOffers = offers.filter((offer) => offer.type === 'SCHEDULED');
  const topOffer = instantOffers.find((offer) => offer.status === 'AVAILABLE') ?? null;
  const countdown = useCountdown(topOffer?.expiresAt);
  const eligible =
    shownProfile?.applicationStatus === 'APPROVED' &&
    shownProfile.gpsFresh &&
    shownProfile.locationPermission === 'GRANTED' &&
    !shownProfile.activeTripId;

  async function handleOnline(next: boolean) {
    if (!activeUser) return;
    setBusyOnline(true);
    setNotice(null);
    try {
      const updated = await setDriverOnline(activeUser, next);
      setProfile(updated);
      setNotice(next ? 'You are online and eligible for offers.' : 'You are offline.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not update availability.');
    } finally {
      setBusyOnline(false);
    }
  }

  async function handleOffer(offerId: string, action: 'ACCEPT' | 'DECLINE') {
    if (!activeUser) return;
    setBusyOffer(offerId);
    setNotice(null);
    try {
      const updated = await respondToDriverOffer(activeUser, offerId, action);
      setOffers(updated);
      setNotice(
        action === 'ACCEPT'
          ? 'Offer accepted. Open the trip cockpit to continue.'
          : 'Offer declined.'
      );
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not update the offer.');
    } finally {
      setBusyOffer(null);
    }
  }

  function previewHref(state: string | null) {
    const params = new URLSearchParams();
    if (demoPreview) params.set('role', 'driver');
    if (state) params.set('state', state);
    const query = params.toString();
    return `/driver${query ? `?${query}` : ''}`;
  }

  return (
    <DriverShell subtitle="Availability and ride offers">
      <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Driver workspace
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-studio-ink">
              Your next drive starts here
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-studio-muted">
              Go online only when your location is fresh. Offers show the customer-owned vehicle,
              the road route and the exact driver-service earnings before you accept.
            </p>
          </div>
          {demoMode ? (
            <div className="rounded-card border border-studio-border bg-studio-surface p-4">
              <div className="flex items-center gap-2">
                <DemoBadge />
                <span className="text-xs font-semibold text-studio-ink">State preview</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((item) => {
                  const params = new URLSearchParams();
                  if (demoPreview) params.set('role', 'driver');
                  params.set('state', item);
                  return (
                    <Link
                      key={item}
                      href={`/driver?${params.toString()}`}
                      className={`rounded-control border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                        preview === item
                          ? 'border-studio-ink bg-studio-ink text-white'
                          : 'border-studio-border text-studio-muted hover:border-studio-ink/60 hover:text-studio-ink'
                      }`}
                    >
                      {item.replace('-', ' ')}
                    </Link>
                  );
                })}
                {preview ? (
                  <Link href={previewHref(null)} className="text-xs text-studio-muted underline hover:text-studio-ink">
                    Clear
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                  Availability
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      shownProfile?.online
                        ? 'bg-emerald-500'
                        : 'bg-studio-muted/40'
                    }`}
                  />
                  <h2 className="font-display text-2xl font-extrabold text-studio-ink">
                    {shownProfile?.online ? 'Online and visible' : 'Offline'}
                  </h2>
                </div>
              </div>
              <VeyroButton
                type="button"
                size="lg"
                aria-pressed={shownProfile?.online ?? false}
                loading={busyOnline}
                disabled={!eligible && !shownProfile?.online}
                onClick={() => void handleOnline(!shownProfile?.online)}
                className={`transition-colors ${
                  shownProfile?.online
                    ? 'bg-studio-obsidian text-white hover:bg-studio-obsidian/90'
                    : 'bg-studio-lime text-studio-ink hover:bg-studio-lime/90'
                }`}
              >
                <Radio
                  aria-hidden="true"
                  className={`h-4 w-4 ${shownProfile?.online ? 'text-studio-lime' : ''}`}
                />
                {shownProfile?.online ? 'Go offline' : 'Go online'}
              </VeyroButton>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-panel border border-studio-border bg-studio-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-studio-muted">
                  Application
                </p>
                <p className="mt-2 text-sm font-bold text-studio-ink">
                  {shownProfile?.applicationStatus?.replace('_', ' ') ?? 'Not submitted'}
                </p>
              </div>
              <div className="rounded-panel border border-studio-border bg-studio-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-studio-muted">
                  Location
                </p>
                <p className="mt-2 text-sm font-bold text-studio-ink">
                  {shownProfile?.locationPermission === 'GRANTED' ? 'Permission granted' : 'Permission needed'}
                </p>
              </div>
              <div className="rounded-panel border border-studio-border bg-studio-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-studio-muted">
                  GPS freshness
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {shownProfile?.gpsFresh ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="dot-pulse absolute inline-flex h-full w-full rounded-full bg-studio-lime opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  )}
                  <p className="text-sm font-bold text-studio-ink">
                    {shownProfile?.gpsFresh ? 'Fresh · under 30s' : 'Stale'}
                  </p>
                </div>
              </div>
            </div>

            {shownProfile?.applicationStatus !== 'APPROVED' ? (
              <FormAlert tone="warning" title="Approval required" className="mt-5">
                Only approved, active drivers may go online. Track your application in the status
                screen.
              </FormAlert>
            ) : null}
            {shownProfile && !shownProfile.gpsFresh ? (
              <FormAlert tone="warning" title="GPS is stale" className="mt-5">
                Step outside, refresh location permission, then try again. Stale GPS never appears
                as live.
              </FormAlert>
            ) : null}
            {shownProfile?.activeTripId ? (
              <FormAlert tone="info" title="Active trip in progress" className="mt-5">
                You cannot go offline or accept another offer until the current trip ends.{' '}
                <Link className="underline" href={`/driver/trips/${shownProfile.activeTripId}`}>
                  Open trip
                </Link>
              </FormAlert>
            ) : null}
            {notice ? (
              <FormAlert
                tone={notice.includes('Could not') || notice.includes('must') ? 'error' : 'success'}
                title="Availability update"
                className="mt-5"
              >
                {notice}
              </FormAlert>
            ) : null}
          </div>

          <div className="rounded-card border border-studio-border bg-studio-obsidian p-5 text-white sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                  Today
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold">Shift readiness</h2>
              </div>
              <ShieldCheck aria-hidden="true" className="h-7 w-7 text-studio-lime" />
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                {eligible ? (
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-studio-lime" />
                ) : (
                  <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-300" />
                )}
                <span>
                  {eligible
                    ? 'Eligible for instant and scheduled offers'
                    : 'Resolve the checklist to receive offers'}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <LocateFixed aria-hidden="true" className="h-5 w-5 shrink-0 text-white/60" />
                <span>Browser PWA tracks location only in the foreground while the trip screen is open.</span>
              </li>
              <li className="flex items-start gap-3">
                <Wallet aria-hidden="true" className="h-5 w-5 shrink-0 text-white/60" />
                <span>
                  Current rate {rupees(shownProfile?.hourlyRateInr ?? 349)}/hour · changes apply to
                  future bookings only.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Instant requests
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                Respond within five minutes
              </h2>
            </div>
            {topOffer ? (
              <DynamicTripPill
                label="Response window"
                countdown={countdown ?? '00:00'}
                detail={`closes ${deadlineLabel(topOffer.expiresAt)}`}
                tone="warning"
              />
            ) : null}
          </div>

          {loading ? (
            <LoadingState label="Loading ride offers…" className="mt-5" />
          ) : error ? (
            <ErrorState title="Offers unavailable" description={error} className="mt-5" />
          ) : instantOffers.length === 0 ? (
            <div className="mt-5 rounded-card border border-dashed border-studio-border bg-studio-surface p-10 text-center">
              <CheckCircle2 aria-hidden="true" className="mx-auto h-8 w-8 text-studio-ink" />
              <p className="mt-4 font-display text-xl font-bold text-studio-ink">No live requests</p>
              <p className="mt-2 text-sm text-studio-muted">
                Stay online with fresh GPS to receive the next eligible offer.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <RouteMap
                points={[topOffer?.pickup ?? instantOffers[0].pickup, topOffer?.destination ?? instantOffers[0].destination]}
                route={topOffer?.route ?? instantOffers[0].route}
              />
              <div className="space-y-4">
                {instantOffers.map((offer) => (
                  <DriverOfferCard
                    key={offer.id}
                    vehicle={offer.vehicle}
                    pickup={offer.pickup.label}
                    destination={offer.destination.label}
                    estimatedMinutes={offer.route.durationMinutes}
                    estimatedKm={offer.route.distanceKm}
                    estimatedEarnings={rupees(offer.estimatedEarningsInr)}
                    responseDeadline={<OfferTimer target={offer.expiresAt} />}
                    onAccept={() => void handleOffer(offer.id, 'ACCEPT')}
                    onDecline={() => void handleOffer(offer.id, 'DECLINE')}
                  />
                ))}
                {notice ? <FormAlert tone="info" title="Offer update">{notice}</FormAlert> : null}
                {offers.some((offer) => offer.status === 'ACCEPTED') ? (
                  <VeyroButton asChild size="lg">
                    <Link href="/driver/trips/VEY-DEMO-2041">
                      <Navigation aria-hidden="true" className="h-4 w-4" />
                      Open active trip
                    </Link>
                  </VeyroButton>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Scheduled offers
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                Planned pickups, exact broadcast window
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-control border border-studio-border bg-studio-surface px-3 py-1.5 text-xs text-studio-muted">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              First valid acceptance wins
            </span>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {scheduledOffers.length === 0 ? (
              <div className="rounded-card border border-dashed border-studio-border bg-studio-surface p-8 text-sm text-studio-muted md:col-span-2">
                No scheduled offers in this demo window.
              </div>
            ) : (
              scheduledOffers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-card border border-studio-border bg-studio-surface p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-control bg-studio-ink px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
                      Scheduled
                    </span>
                    <span className="text-xs font-semibold text-studio-muted">
                      {offer.status === 'ALREADY_ACCEPTED' ? 'Already accepted' : offer.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-studio-ink">
                    {offer.pickup.label} → {offer.destination.label}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-studio-muted">
                    <p className="flex items-center gap-2">
                      <Clock3 aria-hidden="true" className="h-4 w-4" />
                      Pickup {offer.pickupAt ? new Date(offer.pickupAt).toLocaleString() : '—'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Route aria-hidden="true" className="h-4 w-4" />
                      {offer.route.distanceKm} km · {offer.route.durationMinutes} min · HOURLY
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                      {offer.vehicle.category} · {offer.vehicle.transmission.toLowerCase()} ·{' '}
                      {offer.vehicle.make} {offer.vehicle.model}
                    </p>
                  </div>
                  <p className="mt-4 font-display text-2xl font-extrabold text-studio-ink">
                    {rupees(offer.estimatedEarningsInr)}
                    <span className="ml-2 font-body text-xs font-normal text-studio-muted">
                      estimated earnings
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-studio-muted">
                    Broadcast window {offer.broadcastStartAt ? deadlineLabel(offer.broadcastStartAt) : '—'}–
                    {offer.broadcastEndAt ? deadlineLabel(offer.broadcastEndAt) : '—'} · expires{' '}
                    {deadlineLabel(offer.expiresAt)}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <VeyroButton
                      size="sm"
                      disabled={offer.status !== 'AVAILABLE' || busyOffer === offer.id}
                      loading={busyOffer === offer.id}
                      onClick={() => void handleOffer(offer.id, 'ACCEPT')}
                    >
                      Accept scheduled offer
                    </VeyroButton>
                    <VeyroButton
                      size="sm"
                      variant="secondary"
                      disabled={offer.status !== 'AVAILABLE' || busyOffer === offer.id}
                      onClick={() => void handleOffer(offer.id, 'DECLINE')}
                    >
                      Decline
                    </VeyroButton>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </DriverShell>
  );
}
