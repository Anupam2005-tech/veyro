'use client';

import * as React from 'react';
import { TripContactPanel } from '@/components/trip/trip-contact-panel';
import { useDriverTracking } from '@/lib/hooks/use-driver-tracking';
import { usePolling } from '@/lib/hooks/use-polling';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileWarning,
  LocateFixed,
  MapPin,
  Radio,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import {
  DemoBadge,
  DynamicTripPill,
  ErrorState,
  FareBreakdown,
  Field,
  FormAlert,
  LoadingState,
  OtpVaultCard,
  SafetyActionButton,
  Select,
  Textarea,
  VeyroButton,
} from '@veyro/ui';
import { advanceTripStage, createTripReport, getTrip, triggerSos } from '@/lib/api/client';
import type { ReportSubmission, TripRecord, TripState } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { publicPolicy } from '@/lib/public-policy';
import { useCountdown } from '@/lib/use-countdown';
import RouteMap from '../customer/route-map-dynamic';
import { DriverShell } from './driver-shell';

const reportCategories: Array<{ value: ReportSubmission['category']; label: string }> = [
  { value: 'SAFETY_CONCERN', label: 'Safety concern' },
  { value: 'FARE_OR_PAYMENT', label: 'Payment issue' },
  { value: 'SERVICE_ISSUE', label: 'Vehicle condition' },
  { value: 'CUSTOMER_CONDUCT', label: 'Customer behaviour' },
  { value: 'OTHER', label: 'Something else' },
];

const previews = [
  { label: 'en route', state: 'EN_ROUTE' },
  { label: 'arrived', state: 'ARRIVED_WAITING' },
  { label: 'active', state: 'ACTIVE' },
  { label: 'completed', state: 'COMPLETED' },
  { label: 'stale gps', state: 'STALE_GPS' },
  { label: 'no-show point', state: 'NO_SHOW' },
] as const;

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function stateLabel(state: TripState): string {
  const labels: Record<TripState, string> = {
    AWAITING_DRIVER: 'Awaiting driver',
    EN_ROUTE: 'Driver en route',
    ARRIVED_WAITING: 'Arrived · waiting',
    ACTIVE: 'Trip active',
    COMPLETED: 'Trip completed',
    CANCELLED: 'Trip cancelled',
  };
  return labels[state];
}

export default function DriverTripCockpit({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams();
  const { user, demoMode } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'driver';
  const preview = isDemoDataMode ? previews.find((item) => item.state === searchParams.get('state')) ?? null : null;
  const [trip, setTrip] = React.useState<TripRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [startOtp, setStartOtp] = React.useState('');
  const [endOtp, setEndOtp] = React.useState('');
  const [mapKey, setMapKey] = React.useState(0);
  const [reportCategory, setReportCategory] = React.useState<ReportSubmission['category']>('SAFETY_CONCERN');
  const [reportDescription, setReportDescription] = React.useState('');

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
    () => getTrip(activeUser!, tripId), next => { setTrip(next); setError(null); },
    caught => setError(caught instanceof Error ? caught.message : 'Trip update unavailable.'));

  useDriverTracking(activeUser, tripId, Boolean(trip && ['EN_ROUTE', 'ARRIVED_WAITING', 'ACTIVE'].includes(trip.state)), setNotice);

  const shownTrip = React.useMemo(() => {
    if (!trip) return null;
    if (!preview) return trip;
    if (preview.state === 'STALE_GPS') {
      return {
        ...trip,
        state: 'EN_ROUTE' as const,
        liveLocation: trip.liveLocation
          ? { ...trip.liveLocation, stale: true, updatedAt: new Date(Date.now() - 95 * 1000).toISOString() }
          : null,
      };
    }
    if (preview.state === 'NO_SHOW') {
      return {
        ...trip,
        state: 'ARRIVED_WAITING' as const,
        waitingStartedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      };
    }
    return { ...trip, state: preview.state };
  }, [preview, trip]);

  const waitingDeadline = React.useMemo(() => {
    if (!shownTrip?.waitingStartedAt) return null;
    return new Date(new Date(shownTrip.waitingStartedAt).getTime() + publicPolicy.maximumWaitingMinutes * 60 * 1000).toISOString();
  }, [shownTrip?.waitingStartedAt]);
  const waitingCountdown = useCountdown(waitingDeadline);
  const elapsedWaitingMinutes = shownTrip?.waitingStartedAt
    ? Math.floor((Date.now() - new Date(shownTrip.waitingStartedAt).getTime()) / 60000)
    : 0;
  const accruedWaitingFee =
    (elapsedWaitingMinutes > publicPolicy.freeWaitingMinutes ? publicPolicy.waitingFeeInr : 0);
  const canRequestNoShow = Boolean(shownTrip?.waitingStartedAt) && elapsedWaitingMinutes >= publicPolicy.maximumWaitingMinutes;

  async function act(action: 'ARRIVED' | 'START' | 'END' | 'NO_SHOW_REQUEST', otp?: string) {
    if (!activeUser || preview) return;
    setBusy(true);
    setNotice(null);
    try {
      setTrip(await advanceTripStage(activeUser, tripId, action, otp ? { otp } : {}));
      if (action === 'START') setStartOtp('');
      if (action === 'END') setEndOtp('');
      setNotice(
        action === 'ARRIVED'
          ? 'Arrival recorded. Waiting clock is now visible to the customer.'
          : action === 'START'
            ? 'Trip started. A separate end verification code is required for completion.'
            : action === 'END'
              ? 'Trip completed and final fare generated.'
              : 'Customer no-show recorded after server validation. The no-show charge replaces waiting fees.'
      );
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not complete this action.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSos() {
    if (!activeUser || preview) return;
    setBusy(true);
    try {
      await triggerSos(activeUser, tripId);
      await load();
      setNotice('Demo SOS event recorded. No external message was sent.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not record the SOS event.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReport(event: React.FormEvent) {
    event.preventDefault();
    if (!activeUser || preview || reportDescription.trim().length < 10) {
      setNotice('Please describe the issue in at least 10 characters.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const report = await createTripReport(activeUser, {
        tripId,
        reporterRole: 'DRIVER',
        category: reportCategory,
        description: reportDescription.trim(),
      });
      setReportDescription('');
      await load();
      setNotice(`Report ${report.id} submitted. Only you will be notified of the outcome.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not submit your report.');
    } finally {
      setBusy(false);
    }
  }

  const destinationHref = shownTrip
    ? `https://www.google.com/maps/dir/?api=1&destination=${shownTrip.destination.position.lat},${shownTrip.destination.position.lng}`
    : 'https://www.google.com/maps';

  return (
    <DriverShell subtitle={`Trip ${tripId}`}>
      <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/driver" className="text-xs font-semibold text-studio-muted hover:text-studio-ink">
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Driver trip cockpit
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-studio-muted">
              Follow the road route, record arrival, and use separate six-digit codes to start and
              end the trip. Foreground tracking ends if this screen is closed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demoMode || demoPreview ? <DemoBadge /> : null}
            {shownTrip ? (
              <DynamicTripPill
                label={stateLabel(shownTrip.state)}
                countdown={waitingCountdown ?? undefined}
                detail={shownTrip.liveLocation?.stale ? 'Location frozen' : undefined}
                tone={shownTrip.liveLocation?.stale ? 'warning' : 'live'}
              />
            ) : null}
          </div>
        </div>

        {demoPreview ? (
          <div className="mt-6 flex flex-wrap gap-2 rounded-card border border-studio-border bg-studio-surface p-4">
            {previews.map((item) => {
              const params = new URLSearchParams();
              params.set('role', 'driver');
              if (item.state !== 'EN_ROUTE') params.set('state', item.state);
              return (
                <Link
                  key={item.state}
                  href={`/driver/trips/${encodeURIComponent(tripId)}?${params.toString()}`}
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
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div className="space-y-5">
              <div key={mapKey} className="overflow-hidden rounded-card border border-studio-border bg-studio-surface">
                <RouteMap
                  points={[shownTrip.pickup, ...shownTrip.stops, shownTrip.destination]}
                  route={shownTrip.route}
                  driverMarkers={
                    shownTrip.liveLocation
                      ? [
                          {
                            id: 'driver-live',
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-studio-border px-4 py-3">
                  <div className="text-xs text-studio-muted">
                    <p className="flex items-center gap-2 font-semibold text-studio-ink">
                      <LocateFixed aria-hidden="true" className="h-4 w-4" />
                      {shownTrip.liveLocation?.stale
                        ? `Last updated at ${formatTime(shownTrip.liveLocation.updatedAt)}`
                        : `Last updated at ${formatTime(shownTrip.liveLocation?.updatedAt ?? null)}`}
                    </p>
                    <p className="mt-1">
                      {shownTrip.liveLocation?.stale
                        ? 'GPS is stale. The marker is frozen and not live.'
                        : `Accuracy ±${shownTrip.liveLocation?.accuracyMeters ?? 0} m · foreground location only`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <VeyroButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setMapKey((current) => current + 1)}
                    >
                      <LocateFixed aria-hidden="true" className="h-3.5 w-3.5" />
                      Re-centre
                    </VeyroButton>
                    <VeyroButton asChild size="sm" variant="secondary">
                      <a href={destinationHref} target="_blank" rel="noreferrer">
                        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        Open in Google Maps
                      </a>
                    </VeyroButton>
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-studio-border bg-studio-obsidian p-5 text-white">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                  Navigation
                </p>
                <p className="mt-3 flex items-start gap-3 font-display text-xl font-bold">
                  <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-studio-lime" />
                  {shownTrip.demo ? `Continue on ${shownTrip.route.summary.replace('Demo ', '')}` : 'Use Google Maps for turn-by-turn directions'}
                </p>
                <p className="mt-2 text-xs text-white/60">
                  {shownTrip.driverEtaMinutes !== null
                    ? `ETA ${shownTrip.driverEtaMinutes} min`
                    : 'Route guidance available from the provider when enabled'}
                </p>
              </div>

              {shownTrip.liveLocation?.stale ? (
                <FormAlert tone="warning" title="Tracking interrupted">
                  Location permission or network may be unavailable. Do not treat the frozen marker
                  as a live position.
                </FormAlert>
              ) : null}

              {notice ? (
                <FormAlert
                  tone={notice.includes('Could not') || notice.includes('incorrect') ? 'error' : 'success'}
                  title="Trip update"
                >
                  {notice}
                </FormAlert>
              ) : null}
            </div>

            <div className="space-y-5">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                  Trip details
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                  {shownTrip.driver?.name ?? 'Assigned driver'}
                </h2>
                <div className="mt-5 space-y-3 text-sm">
                  <p className="flex items-start gap-3">
                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-studio-ink" />
                    <span>
                      <span className="block text-xs text-studio-muted">Pickup</span>
                      {shownTrip.pickup.label}
                    </span>
                  </p>
                  <p className="flex items-start gap-3">
                    <ArrowRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-studio-ink" />
                    <span>
                      <span className="block text-xs text-studio-muted">Destination</span>
                      {shownTrip.destination.label}
                    </span>
                  </p>
                  <p className="flex items-center gap-3 text-xs text-studio-muted">
                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                    {shownTrip.route.distanceKm} km · {shownTrip.route.durationMinutes} min · HOURLY
                  </p>
                </div>
                <div className="mt-5 rounded-panel border border-studio-border bg-studio-bg p-4">
                  <p className="text-xs font-semibold text-studio-ink">Customer-owned vehicle</p>
                  <p className="mt-1 text-sm text-studio-muted">
                    {shownTrip.vehicle.make} {shownTrip.vehicle.model} ·{' '}
                    {shownTrip.vehicle.category} · {shownTrip.vehicle.transmission.toLowerCase()}
                  </p>
                  {shownTrip.vehicle.registrationNumber ? (
                    <p className="mt-1 font-mono text-xs text-studio-ink">
                      {shownTrip.vehicle.registrationNumber}
                    </p>
                  ) : null}
                </div>
              </section>
              {!isDemoDataMode && user && ['EN_ROUTE', 'ARRIVED_WAITING', 'ACTIVE'].includes(shownTrip.state) ? (
                <TripContactPanel key={tripId} user={user} tripId={tripId} counterpart="customer" />
              ) : null}

              {shownTrip.state === 'EN_ROUTE' || shownTrip.state === 'AWAITING_DRIVER' ? (
                <section className="rounded-card border border-studio-border bg-studio-surface p-5">
                  <h3 className="font-display text-lg font-bold text-studio-ink">Confirm arrival</h3>
                  <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                    Tap only at the pickup point. Backend geofence and accuracy checks run before
                    the waiting clock starts.
                  </p>
                  <VeyroButton
                    type="button"
                    className="mt-4 w-full"
                    size="lg"
                    loading={busy}
                    disabled={Boolean(preview)}
                    onClick={() => void act('ARRIVED')}
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    I have arrived
                  </VeyroButton>
                </section>
              ) : null}

              {shownTrip.state === 'ARRIVED_WAITING' ? (
                <section className="rounded-card border border-studio-border bg-studio-surface p-5">
                  <h3 className="font-display text-lg font-bold text-studio-ink">Waiting clock</h3>
                  <div className="mt-4 flex items-center justify-between rounded-panel border border-studio-border bg-studio-bg p-4">
                    <span className="text-sm text-studio-muted">Free grace remaining</span>
                    <span className="inline-flex items-center gap-2 font-mono text-xl font-bold text-studio-ink">
                      <Timer aria-hidden="true" className="h-4 w-4" />
                      {waitingCountdown ?? '00:00'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-studio-muted">
                    {publicPolicy.freeWaitingMinutes} minutes free, then ₹{publicPolicy.waitingFeeInr} per
                    interval. Accrued in this demo: {inr(accruedWaitingFee)}.
                  </p>
                  <VeyroButton
                    type="button"
                    variant="secondary"
                    className="mt-4 w-full"
                    disabled={!canRequestNoShow || Boolean(preview) || busy}
                    onClick={() => void act('NO_SHOW_REQUEST')}
                  >
                    Request customer no-show
                  </VeyroButton>
                  {!canRequestNoShow ? (
                    <p className="mt-2 text-[11px] text-studio-muted">
                      Available at {publicPolicy.maximumWaitingMinutes} minutes. No fee is applied
                      until the request is validated.
                    </p>
                  ) : null}
                  <div className="mt-5">
                    <OtpVaultCard
                      title="Start OTP"
                      mode="input"
                      value={startOtp}
                      onChange={setStartOtp}
                      onSubmit={() => void act('START', startOtp)}
                      helper="Customer shares this after you arrive. Separate from the end code."
                    />
                  </div>
                </section>
              ) : null}

              {shownTrip.state === 'ACTIVE' ? (
                <section className="rounded-card border border-studio-border bg-studio-surface p-5">
                  <h3 className="font-display text-lg font-bold text-studio-ink">End the trip</h3>
                  <p className="mt-2 text-xs text-studio-muted">
                    Ask the customer for the separate end code. Single use; never logged or placed in
                    a URL.
                  </p>
                  <div className="mt-5">
                    <OtpVaultCard
                      title="End OTP"
                      mode="input"
                      value={endOtp}
                      onChange={setEndOtp}
                      onSubmit={() => void act('END', endOtp)}
                      helper="Six digits, different from the start code."
                    />
                  </div>
                </section>
              ) : null}

              {shownTrip.state === 'COMPLETED' && shownTrip.finalFare ? (
                <FareBreakdown
                  lines={shownTrip.finalFare.lines.map((line) => ({
                    label: line.label,
                    amount: inr(line.amountInr),
                  }))}
                  total={inr(shownTrip.finalFare.totalInr)}
                  note={`Estimate ${inr(shownTrip.finalFare.estimateInr)} · payment ${shownTrip.finalFare.paymentStatus.toLowerCase()}`}
                  exclusions={shownTrip.finalFare.exclusions}
                />
              ) : null}

              {shownTrip.state === 'COMPLETED' ? (
                <form
                  onSubmit={(event) => void handleReport(event)}
                  className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-studio-ink">Report a problem</h3>
                    <FileWarning aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                    Predefined category and written description only. The reported party cannot see
                    your identity.
                  </p>
                  <div className="mt-4 space-y-4">
                    <Field id="driver-report-category" label="Category" required>
                      <Select
                        id="driver-report-category"
                        value={reportCategory}
                        onChange={(event) =>
                          setReportCategory(event.currentTarget.value as ReportSubmission['category'])
                        }
                      >
                        {reportCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field id="driver-report-description" label="Description" required>
                      <Textarea
                        id="driver-report-description"
                        value={reportDescription}
                        onChange={(event) => setReportDescription(event.currentTarget.value)}
                        placeholder="Describe what happened. Do not include payment card details."
                      />
                    </Field>
                  </div>
                  <VeyroButton
                    type="submit"
                    variant="secondary"
                    className="mt-5 w-full"
                    loading={busy}
                    disabled={Boolean(preview)}
                  >
                    Submit report
                  </VeyroButton>
                </form>
              ) : null}

              <section className="rounded-card border border-studio-border bg-studio-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-studio-ink">Safety</h3>
                    <p className="mt-1 text-xs text-studio-muted">
                      One-tap SOS records the event immediately. Delivery is never claimed without a
                      channel confirmation.
                    </p>
                  </div>
                  <ShieldCheck aria-hidden="true" className="h-5 w-5 text-studio-ink" />
                </div>
                <SafetyActionButton
                  className="mt-4"
                  demoMode
                  disabled={busy || Boolean(preview)}
                  label="Record SOS"
                  onClick={() => void handleSos()}
                />
                {shownTrip.sosEvents.length ? (
                  <p className="mt-3 text-xs font-semibold text-studio-ink">
                    {shownTrip.sosEvents.length} demo SOS event{shownTrip.sosEvents.length > 1 ? 's' : ''} recorded
                  </p>
                ) : null}
              </section>

              <FormAlert tone="info" title="Foreground tracking">
                Browser PWAs cannot promise background GPS. Keep this screen open for live updates.
              </FormAlert>
            </div>
          </div>
        )}
      </div>
    </DriverShell>
  );
}
