'use client';

import * as React from 'react';
import { usePolling } from '@/lib/hooks/use-polling';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Copy,
  Link2,
  Link2Off,
  MapPin,
  ShieldCheck,
  Star,
  Timer,
} from 'lucide-react';
import {
  DemoBadge,
  DynamicTripPill,
  ErrorState,
  FareBreakdown,
  FormAlert,
  LoadingState,
  OtpVaultCard,
  SafetyActionButton,
  VeyroButton,
} from '@veyro/ui';
import {
  createTripShare,
  confirmDriverArrival,
  getTrip,
  reportDriverNoShow,
  revokeTripShare,
  triggerSos,
} from '@/lib/api/client';
import type { TripRecord, TripState } from '@/lib/api/types';
import { ApiClientError } from '@/lib/api/transport';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { publicPolicy } from '@/lib/public-policy';
import { useCountdown } from '@/lib/use-countdown';
import { CustomerShell } from './customer-shell';
import { TripVerificationCode } from './trip-verification-code';
import { TripPaymentPrompt } from './trip-payment-prompt';
import { TripContactPanel } from '@/components/trip/trip-contact-panel';
import RouteMap from './route-map-dynamic';

const previews = [
  { label: 'awaiting', state: 'AWAITING_DRIVER' },
  { label: 'en route', state: 'EN_ROUTE' },
  { label: 'arrived', state: 'ARRIVED_WAITING' },
  { label: 'active', state: 'ACTIVE' },
  { label: 'completed', state: 'COMPLETED' },
  { label: 'stale gps', state: 'STALE_GPS' },
] as const;

function stateLabel(state: TripState): string {
  const labels: Record<TripState, string> = {
    AWAITING_DRIVER: 'Awaiting driver',
    EN_ROUTE: 'Driver en route',
    ARRIVED_WAITING: 'Driver arrived',
    ACTIVE: 'Trip in progress',
    COMPLETED: 'Trip completed',
    CANCELLED: 'Trip cancelled',
  };
  return labels[state];
}

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export default function CustomerTripCockpit({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams();
  const { user, demoMode } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'customer';
  const preview = isDemoDataMode ? previews.find((item) => item.state === searchParams.get('state')) ?? null : null;
  const [trip, setTrip] = React.useState<TripRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [shareId, setShareId] = React.useState<string | null>(null);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [mapKey, setMapKey] = React.useState(0);
  const [noShowDescription, setNoShowDescription] = React.useState('');
  const [noShowError, setNoShowError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await getTrip(activeUser, tripId);
      setTrip(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this trip.');
    } finally {
      setLoading(false);
    }
  }, [activeUser, tripId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  usePolling(activeUser && !isDemoDataMode ? activeUser.uid + ':' + tripId : null,
    () => getTrip(activeUser!, tripId), next => { setTrip(next); setError(null); setConnectionWarning(false); },
    caught => {
      if (trip && caught instanceof ApiClientError && ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(caught.code)) {
        setConnectionWarning(true);
      } else {
        setError(caught instanceof Error ? caught.message : 'Trip update unavailable.');
      }
    });

  const shownTrip = React.useMemo(() => {
    if (!trip) return null;
    if (!preview) return trip;
    if (preview.state === 'STALE_GPS') {
      return {
        ...trip,
        state: 'EN_ROUTE' as const,
        liveLocation: trip.liveLocation
          ? {
              ...trip.liveLocation,
              stale: true,
              updatedAt: new Date(Date.now() - 75 * 1000).toISOString(),
            }
          : {
              position: trip.pickup.position,
              updatedAt: new Date(Date.now() - 75 * 1000).toISOString(),
              accuracyMeters: 42,
              stale: true,
            },
      };
    }
    if (preview.state === 'AWAITING_DRIVER') {
      return { ...trip, state: 'AWAITING_DRIVER' as const, createdAt: new Date(Date.now() - 60 * 1000).toISOString() };
    }
    return { ...trip, state: preview.state };
  }, [preview, trip]);

  const responseDeadline = React.useMemo(() => {
    if (!shownTrip || shownTrip.bookingType !== 'INSTANT') return null;
    return new Date(new Date(shownTrip.createdAt).getTime() + publicPolicy.instantResponseWindowMinutes * 60 * 1000).toISOString();
  }, [shownTrip]);
  const responseCountdown = useCountdown(responseDeadline);

  const waitingDeadline = React.useMemo(() => {
    if (!shownTrip?.waitingStartedAt) return null;
    return new Date(new Date(shownTrip.waitingStartedAt).getTime() + publicPolicy.freeWaitingMinutes * 60 * 1000).toISOString();
  }, [shownTrip?.waitingStartedAt]);
  const graceCountdown = useCountdown(waitingDeadline);
  const waitingMinutes = shownTrip?.waitingStartedAt
    ? Math.floor((Date.now() - new Date(shownTrip.waitingStartedAt).getTime()) / 60000)
    : 0;
  const accruedFee =
    (waitingMinutes > publicPolicy.freeWaitingMinutes ? publicPolicy.waitingFeeInr : 0);

  async function handleSos() {
    if (!activeUser || preview) return;
    setBusy(true);
    setNotice(null);
    try {
      await triggerSos(activeUser, tripId);
      await load();
      setNotice('Demo SOS event recorded. No external message was sent.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not record SOS.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDriverNoShow(event: React.FormEvent) {
    event.preventDefault();
    if (!user || busy || !noShowDescription.trim()) return;
    setBusy(true);
    setNoShowError(null);
    try {
      await reportDriverNoShow(user, tripId, noShowDescription.trim());
      setNoShowDescription('');
      await load();
    } catch (caught) {
      setNoShowError(caught instanceof Error ? caught.message : 'Could not submit the no-show report.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!activeUser || preview || !shownTrip) return;
    setBusy(true);
    setNotice(null);
    try {
      const share = await createTripShare(activeUser, tripId);
      const url = `${window.location.origin}/share/${share.token}`;
      setShareUrl(url);
      setShareId('shareId' in share ? String(share.shareId) : tripId);
      await load();
      setNotice('Share link created. It expires when the trip ends and can be revoked here.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not create share link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    if (!activeUser || preview) return;
    setBusy(true);
    try {
      await revokeTripShare(activeUser, isDemoDataMode ? tripId : shareId ?? trip?.share?.shareId ?? '');
      setShareUrl(null);
      setShareId(null);
      await load();
      setNotice('Share link revoked.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not revoke share link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Share link copied.');
    } catch {
      setNotice('Copy failed. Select the link and copy manually.');
    }
  }

  const latestSos = shownTrip?.sosEvents[0] ?? null;
  const otpPhase = shownTrip?.state === 'ARRIVED_WAITING' ? 'START' : shownTrip?.state === 'ACTIVE' ? 'END' : null;

  return (
    <CustomerShell subtitle={`Trip ${tripId}`}>
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/customer/bookings" className="text-xs font-semibold text-studio-muted hover:text-studio-ink">
              ← All bookings
            </Link>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Live trip cockpit
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-studio-muted">
              Follow the authorised trip only. Stale location is frozen and clearly labelled — it is
              never presented as live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demoMode || demoPreview ? <DemoBadge /> : null}
            {shownTrip ? (
              <DynamicTripPill
                label={stateLabel(shownTrip.state)}
                countdown={responseCountdown ?? graceCountdown ?? undefined}
                detail={shownTrip.liveLocation?.stale ? 'Last known position' : undefined}
                tone={shownTrip.liveLocation?.stale ? 'warning' : 'live'}
              />
            ) : null}
          </div>
        </div>

        {demoPreview ? (
          <div className="mt-6 flex flex-wrap gap-2 rounded-card border border-studio-border bg-studio-surface p-3">
            {previews.map((item) => {
              const params = new URLSearchParams();
              params.set('role', 'customer');
              if (item.state !== 'AWAITING_DRIVER') params.set('state', item.state);
              return (
                <Link
                  key={item.state}
                  href={`/customer/trips/${encodeURIComponent(tripId)}?${params.toString()}`}
                  className={`rounded-control border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    preview?.state === item.state
                      ? 'border-studio-ink bg-studio-ink text-white'
                      : 'border-studio-border text-studio-muted hover:text-studio-ink'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        {loading ? (
          <LoadingState label="Loading trip…" className="mt-8" />
        ) : error || !shownTrip ? (
          <ErrorState title="Trip unavailable" description={error ?? 'Trip not found.'} className="mt-8" />
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-4">
              {connectionWarning ? <FormAlert tone="warning" title="Trip updates paused">Reconnecting to refresh the trip.</FormAlert> : null}
              {!isDemoDataMode && user && shownTrip.isTripCustomer && otpPhase ? (
                <TripVerificationCode key={`${tripId}:${otpPhase}`} user={user} tripId={tripId} phase={otpPhase} />
              ) : null}
              {!isDemoDataMode && user && shownTrip.isTripCustomer && ['EN_ROUTE', 'ARRIVED_WAITING', 'ACTIVE'].includes(shownTrip.state) ? (
                <TripContactPanel key={tripId} user={user} tripId={tripId} counterpart="driver" />
              ) : null}
              <div key={mapKey} className="overflow-hidden rounded-card border border-studio-border bg-studio-surface">
                <RouteMap
                  points={[shownTrip.pickup, ...shownTrip.stops, shownTrip.destination]}
                  route={shownTrip.route}
                  driverMarkers={
                    shownTrip.liveLocation
                      ? [
                          {
                            id: 'trip-driver',
                            vehicle: true,
                            position: shownTrip.liveLocation.position,
                            label: shownTrip.liveLocation.stale ? 'Last known driver location' : 'Driver location',
                            stale: shownTrip.liveLocation.stale,
                          },
                        ]
                      : []
                  }
                  showDriverMarkers={Boolean(shownTrip.liveLocation)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-studio-border px-3 py-2.5 text-xs text-studio-muted">
                  <p className="flex items-center gap-2 font-semibold text-studio-ink">
                    <MapPin aria-hidden="true" className="h-4 w-4" />
                    {shownTrip.liveLocation
                      ? `Last updated at ${formatTime(shownTrip.liveLocation.updatedAt)}`
                      : 'Driver location not shared yet'}
                  </p>
                  <VeyroButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="min-h-[38px] px-3.5"
                    onClick={() => setMapKey((current) => current + 1)}
                  >
                    Re-centre
                  </VeyroButton>
                </div>
              </div>

              {shownTrip.liveLocation?.stale ? (
                <FormAlert tone="warning" title="Live tracking interrupted">
                  No valid GPS update for 30 seconds. The marker is frozen at its last known
                  position. Check network or location permission with the driver.
                </FormAlert>
              ) : null}

              {notice ? (
                <FormAlert
                  tone={notice.includes('Could not') || notice.includes('failed') ? 'error' : 'success'}
                  title="Trip update"
                >
                  {notice}
                </FormAlert>
              ) : null}

              {shownTrip.state === 'AWAITING_DRIVER' ? (
                <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                        {shownTrip.bookingType === 'INSTANT' ? 'Instant response window' : 'Scheduled broadcast'}
                      </p>
                      <h2 className="mt-2 flex items-center font-display text-2xl font-extrabold text-studio-ink">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-studio-lime" aria-hidden="true" />
                        {shownTrip.bookingType === 'INSTANT'
                          ? 'Waiting for driver acceptance'
                          : 'Eligible drivers are being notified'}
                      </h2>
                    </div>
                    {responseCountdown ? (
                      <span className="inline-flex items-center gap-2 font-mono text-2xl font-extrabold text-studio-ink">
                        <Timer aria-hidden="true" className="h-5 w-5" />
                        {responseCountdown}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-studio-muted">
                    {shownTrip.bookingType === 'INSTANT'
                      ? 'A driver is only assigned after they accept. We never show a driver as assigned before that happens.'
                      : `Broadcast runs from 12 hours before pickup (or booking creation, whichever is later) until 2 hours before pickup.`}
                  </p>
                </section>
              ) : null}

              {!isDemoDataMode && shownTrip.state === 'EN_ROUTE' ? <section className="rounded-card border border-studio-border bg-white p-4">
                <h2 className="font-display text-xl font-bold">Has your driver arrived?</h2>
                {shownTrip.driverEtaMinutes !== null ? (
                  <p className="mt-2 text-sm text-studio-ink">Estimated pickup arrival in {shownTrip.driverEtaMinutes < 1 ? 'under a minute' : `${shownTrip.driverEtaMinutes} min`}</p>
                ) : null}
                <p className="mt-2 text-xs text-studio-muted">Confirm only when the assigned driver is at your pickup point. This starts the waiting clock.</p>
                <VeyroButton type="button" variant="secondary" className="mt-3" loading={busy} onClick={async () => {
                  if (!activeUser || busy) return; setBusy(true);
                  try { setTrip(await confirmDriverArrival(activeUser, tripId)); setNotice('Driver arrival confirmed.'); }
                  catch (e) { setNotice(e instanceof Error ? e.message : 'Could not confirm arrival.'); }
                  finally { setBusy(false); }
                }}>Confirm driver arrival</VeyroButton>
                {shownTrip.driverNoShowReportStatus ? (
                  <p role="status" className="mt-3 text-sm text-studio-muted">
                    {shownTrip.driverNoShowReportStatus === 'DISMISSED' ? 'Your no-show report was dismissed.' : 'Your no-show report was sent to Admin.'}
                  </p>
                ) : shownTrip.driverNoShowEligible ? (
                  <form className="mt-4 space-y-2 border-t border-studio-border pt-4" onSubmit={event => void handleDriverNoShow(event)}>
                    <label htmlFor="no-show-description" className="block text-sm font-semibold">Driver hasn’t arrived?</label>
                    <textarea id="no-show-description" className="w-full rounded-control border border-studio-border bg-white p-2 text-sm text-studio-ink"
                      placeholder="Describe what happened at the pickup point" value={noShowDescription}
                      maxLength={2000} required onChange={event => setNoShowDescription(event.target.value)} />
                    {noShowError ? <FormAlert tone="error" title="Report unavailable">{noShowError}</FormAlert> : null}
                    <VeyroButton type="submit" variant="secondary" loading={busy} disabled={!noShowDescription.trim()}>Report driver no-show</VeyroButton>
                  </form>
                ) : null}
              </section> : null}
              {shownTrip.state === 'ARRIVED_WAITING' ? (
                <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                        Arrival confirmed
                      </p>
                      <h2 className="mt-2 flex items-center font-display text-2xl font-extrabold text-studio-ink">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-studio-lime" aria-hidden="true" />
                        {formatTime(shownTrip.arrivalAt)}
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-control border border-studio-border bg-studio-tint px-3 py-2 font-mono text-lg font-bold text-studio-ink">
                      <Clock3 aria-hidden="true" className="h-4 w-4" />
                      {graceCountdown ?? '00:00'}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-studio-muted">
                    {publicPolicy.freeWaitingMinutes} minutes free waiting. Accrued wait fee:{' '}
                    <strong className="text-studio-ink">{inr(accruedFee)}</strong>. After{' '}
                    {publicPolicy.maximumWaitingMinutes} minutes, the driver may request a customer
                    no-show; the fee is applied only after validation.
                  </p>
                </section>
              ) : null}

              {shownTrip.state === 'ACTIVE' ? (
                <section className="rounded-card border border-studio-ink/20 bg-gradient-to-br from-studio-obsidian to-[#1a1c20] p-4 text-white sm:p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                    Trip in progress
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-extrabold">
                    {shownTrip.pickup.label} → {shownTrip.destination.label}
                  </h2>
                  <p className="mt-3 text-xs text-white/60">
                    {shownTrip.route.distanceKm} km · {shownTrip.route.durationMinutes} min · HOURLY
                  </p>
                </section>
              ) : null}

              {shownTrip.state === 'CANCELLED' && shownTrip.driverNoShowReportStatus === 'RESOLVED' ? (
                <FormAlert tone="info" title="Driver no-show confirmed">The trip ended without a charge for the missed pickup.</FormAlert>
              ) : null}
              {shownTrip.state === 'COMPLETED' && shownTrip.finalFare ? (
                <>
                  <FareBreakdown
                    lines={shownTrip.finalFare.lines.map((line) => ({
                      label: line.label,
                      amount: inr(line.amountInr),
                    }))}
                    total={inr(shownTrip.finalFare.totalInr)}
                    note={`Estimate ${inr(shownTrip.finalFare.estimateInr)} · payment ${shownTrip.finalFare.paymentStatus.toLowerCase()}`}
                    exclusions={shownTrip.finalFare.exclusions}
                  />
                  {!isDemoDataMode && user && shownTrip.isTripCustomer &&
                    shownTrip.finalFare.totalInr >= 1 &&
                    ['PENDING', 'FAILED'].includes(shownTrip.finalFare.paymentStatus) ? (
                    <TripPaymentPrompt key={tripId} user={user} tripId={tripId} totalInr={shownTrip.finalFare.totalInr} />
                  ) : null}
                  <VeyroButton asChild size="lg" className="min-h-[48px] w-full text-base">
                    <Link href={`/customer/trips/${tripId}/summary`}>
                      Open receipt, rating and report
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </VeyroButton>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                  Your driver
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                  {shownTrip.driver?.name ?? 'Assigning…'}
                </h2>
                {shownTrip.driver ? (
                  <div className="mt-4 space-y-2 text-sm text-studio-muted">
                    <p className="flex items-center gap-1.5 font-medium text-studio-ink">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{shownTrip.driver.rating}</span>
                      <span className="text-studio-muted font-normal">({shownTrip.driver.reviews} reviews)</span>
                    </p>
                    <p>{shownTrip.driver.experienceYears} years · {shownTrip.driver.languages.join(', ')}</p>
                    <p>
                      {shownTrip.driver.vehicle.make} {shownTrip.driver.vehicle.model} ·{' '}
                      {shownTrip.driver.vehicle.category}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-studio-muted">
                    Driver details appear only after acceptance.
                  </p>
                )}
              </section>

              {isDemoDataMode && (shownTrip.state === 'ARRIVED_WAITING' || shownTrip.state === 'ACTIVE' || shownTrip.state === 'COMPLETED') ? (
                <OtpVaultCard
                  title="Start OTP"
                  mode="display"
                  code={shownTrip.startOtp}
                  helper="Share this only after the driver reaches your pickup point."
                />
              ) : null}
              {isDemoDataMode && (shownTrip.state === 'ACTIVE' || shownTrip.state === 'COMPLETED') ? (
                <OtpVaultCard
                  title="End OTP"
                  mode="display"
                  code={shownTrip.endOtp}
                  helper="Separate single-use code. Never share it before the trip is about to end."
                />
              ) : null}

              {['EN_ROUTE', 'ARRIVED_WAITING', 'ACTIVE'].includes(shownTrip.state) ? (
                <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-studio-ink">Share live trip</h3>
                      <p className="mt-1 text-xs text-studio-muted">
                        Read-only, authentication required, expires at trip completion.
                      </p>
                    </div>
                    <Link2 aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                  </div>
                  {shareUrl || shownTrip.share ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 rounded-panel border border-studio-border bg-studio-bg p-2">
                        <input
                          readOnly
                          aria-label="Trip share link"
                          value={shareUrl ?? 'Share link was created for this trip.'}
                          className="min-w-0 flex-1 bg-transparent px-2 font-mono text-[11px] text-studio-ink"
                        />
                        {shareUrl ? (
                          <VeyroButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="min-h-[38px] px-3.5"
                            onClick={() => void handleCopy()}
                          >
                            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                            Copy
                          </VeyroButton>
                        ) : null}
                      </div>
                      <VeyroButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-[40px] w-full"
                        loading={busy}
                        disabled={Boolean(preview)}
                        onClick={() => void handleRevoke()}
                      >
                        <Link2Off aria-hidden="true" className="h-3.5 w-3.5" />
                        Revoke link
                      </VeyroButton>
                    </div>
                  ) : (
                    <VeyroButton
                      type="button"
                      className="mt-4 min-h-[44px] w-full"
                      loading={busy}
                      disabled={Boolean(preview)}
                      onClick={() => void handleShare()}
                    >
                      Create secure share link
                    </VeyroButton>
                  )}
                  <p className="mt-3 text-[11px] text-studio-muted">
                    The viewer must register or sign in first. No payment, full profile or contact
                    details are exposed.
                  </p>
                </section>
              ) : null}

              <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-studio-ink">Emergency SOS</h3>
                    <p className="mt-1 text-xs text-studio-muted">
                      Records immediately with your current location and contact delivery states.
                    </p>
                  </div>
                  <ShieldCheck aria-hidden="true" className="h-5 w-5 text-studio-ink" />
                </div>
                <SafetyActionButton
                  className="mt-4 min-h-[44px]"
                  demoMode
                  disabled={busy || Boolean(preview)}
                  onClick={() => void handleSos()}
                />
                {latestSos ? (
                  <ul className="mt-4 space-y-2">
                    {latestSos.contacts.map((contact) => (
                      <li
                        key={`${contact.name}-${contact.channel}`}
                        className="flex items-center justify-between gap-3 rounded-panel border border-studio-border px-3 py-2 text-xs"
                      >
                        <span className="text-studio-ink">{contact.name}</span>
                        <span className="text-studio-muted">
                          {contact.status === 'DELIVERED' ? 'Delivered' : contact.status === 'FAILED' ? 'Failed' : 'Unconfirmed — no external message sent'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {shownTrip.state === 'AWAITING_DRIVER' && shownTrip.bookingType === 'SCHEDULED' ? (
                <FormAlert tone="info" title="Scheduled booking">
                  <CalendarClock aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                  Broadcast starts 12 hours before pickup or at booking creation, whichever is
                  later, and ends 2 hours before pickup.
                </FormAlert>
              ) : null}

              {shownTrip.state === 'AWAITING_DRIVER' && shownTrip.bookingType === 'INSTANT' ? (
                <FormAlert tone="info" title="Five-minute window">
                  The selected driver has five minutes to accept. After that, the offer expires and
                  no assignment is claimed.
                </FormAlert>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
