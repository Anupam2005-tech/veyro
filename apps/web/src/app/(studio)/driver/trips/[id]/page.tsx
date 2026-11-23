'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Delete, ExternalLink, Phone } from 'lucide-react';
import { CancelDialog } from '@/components/CancelDialog';
import { GpsPanel } from '@/components/GpsPanel';
import { MapView } from '@/components/MapView';
import { LocationStatus, SosPanel } from '@/components/TripWidgets';
import { Alert, Button, Card, ErrorText, KeyValue, LinkButton, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { apiWithMessage } from '@/lib/api';
import { countdown, dateTime, humanize, inr, shortId, time } from '@/lib/format';
import { useAction, useApi, useNow } from '@/lib/hooks';
import { useDriverGps, type GpsTarget } from '@/lib/gps';
import { useRequireRole } from '@/lib/session';
import type { Trip } from '@/lib/types';

const ACTIVE = ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

function mapsLink(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
}

/** Six-digit OTP entry with a large on-screen keypad (usable one-handed, ≥44px targets). */
function OtpPad({ label, busy, error, onSubmit }: { label: string; busy: boolean; error: string | null; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  const press = (d: string) => setCode((c) => (c.length < 6 ? c + d : c));
  return (
    <Card dark className="space-y-4">
      <p className="text-sm font-medium text-studio-muted">{label}</p>
      <label className="sr-only" htmlFor="otp-input">{label}</label>
      <input
        id="otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full rounded-xl bg-studio-tint px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] text-studio-ink outline-none focus:ring-2 focus:ring-studio-brand"
        placeholder="······"
      />
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="min-h-[52px] rounded-xl bg-studio-tint text-xl font-semibold hover:bg-studio-border">{d}</button>
        ))}
        <button type="button" onClick={() => setCode('')} className="min-h-[52px] rounded-xl bg-studio-tint text-sm">Clear</button>
        <button type="button" onClick={() => press('0')} className="min-h-[52px] rounded-xl bg-studio-tint text-xl font-semibold hover:bg-studio-border">0</button>
        <button type="button" aria-label="Delete last digit" onClick={() => setCode((c) => c.slice(0, -1))} className="flex min-h-[52px] items-center justify-center rounded-xl bg-studio-tint"><Delete className="h-5 w-5" /></button>
      </div>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <Button size="lg" className="w-full" busy={busy} disabled={code.length !== 6} onClick={() => { onSubmit(code); setCode(''); }}>
        Verify code
      </Button>
    </Card>
  );
}

export default function DriverTripPage() {
  const me = useRequireRole('DRIVER');
  const { id } = useParams<{ id: string }>();
  const trip = useApi<Trip>(me ? `/trips/${id}` : null, 4000);
  const now = useNow();
  const action = useAction();
  const otp = useAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const t = trip.data;
  const b = t?.booking;
  const start = useMemo(() => {
    const p = me?.driver?.presence;
    return p ? { lat: p.lat, lng: p.lng } : me?.driver ? { lat: me.driver.serviceArea.lat, lng: me.driver.serviceArea.lng } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.driver?.id]);
  const target: GpsTarget | null = useMemo(() => {
    if (!t || !b) return null;
    if (t.status === 'DRIVER_EN_ROUTE') return { key: `${t.id}:pickup`, path: [b.pickup] };
    if (t.status === 'IN_PROGRESS') {
      const path = b.routePolyline.length ? b.routePolyline.map(([lat, lng]) => ({ lat, lng })) : [...b.stops, b.destination];
      return { key: `${t.id}:route`, path };
    }
    return null;
  }, [t, b]);
  // Stay still at the pickup while waiting; only report during active stages.
  const gps = useDriverGps(start, target);

  if (!me || (!t && !trip.error)) return <Spinner />;
  if (!t || !b) return <Alert tone="danger" title="Trip unavailable">{trip.error}</Alert>;

  async function post(path: string, body?: unknown) {
    const r = await action.run(() => apiWithMessage<Trip>(`/trips/${t!.id}/${path}`, { method: 'POST', body }));
    if (r) {
      trip.setData(r.data);
      setNotice(r.message);
    }
  }

  async function verify(kind: 'start' | 'end', code: string) {
    const r = await otp.run(() => apiWithMessage<Trip>(`/trips/${t!.id}/${kind}-otp/verify`, { method: 'POST', body: { code } }));
    if (r) {
      trip.setData(r.data);
      setNotice(r.message);
    }
  }

  const loc = t.location;
  const markers = [
    { id: 'A', ...b.pickup, kind: 'pickup' as const, label: 'Pickup' },
    ...b.stops.map((s, i) => ({ id: `S${i}`, ...s, kind: 'stop' as const, label: s.label })),
    { id: 'B', ...b.destination, kind: 'destination' as const, label: 'Destination' },
    ...(loc ? [{ id: 'me', lat: loc.lat, lng: loc.lng, kind: (loc.stale ? 'driver-stale' : 'driver') as 'driver' | 'driver-stale', label: 'You' }] : []),
  ];
  const navTarget = t.status === 'IN_PROGRESS' ? b.destination : b.pickup;
  const w = t.waiting;
  const isActive = ACTIVE.includes(t.status);
  const canCancel = ['NOT_STARTED', 'DRIVER_EN_ROUTE', 'ARRIVED'].includes(t.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.status === 'COMPLETED' ? 'Trip complete' : t.status === 'IN_PROGRESS' ? 'On trip' : t.status === 'ARRIVED' ? 'At pickup' : t.status === 'NOT_STARTED' ? 'Scheduled trip' : 'Heading to pickup'}
        subtitle={<span>#{shortId(t.id)} · {b.type === 'SCHEDULED' ? `Scheduled for ${dateTime(b.pickupAt)}` : 'Instant'}</span>}
        action={<StatusBadge status={t.status} />}
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-4">
          <MapView className="h-[420px]" markers={markers} polyline={b.routePolyline} circle={t.status === 'DRIVER_EN_ROUTE' ? { lat: b.pickup.lat, lng: b.pickup.lng, radiusKm: 0.1 } : undefined} fitKey={`${t.id}:${t.status}`} ariaLabel="Trip map" />
          {isActive ? <LocationStatus location={loc} label="Your location" /> : null}
          <Card>
            <KeyValue items={[
              ['Pickup', b.pickup.label],
              ...(b.stops.length ? ([['Stops', b.stops.map((s) => s.label).join(' · ')]] as [string, string][]) : []),
              ['Destination', b.destination.label],
              ['Vehicle', `${b.vehicle.make} ${b.vehicle.model} · ${b.vehicle.plate} · ${humanize(b.vehicle.transmission)}`],
              ['Rate', `${inr(b.quote.hourlyRateInr)}/hr · billed by actual minutes`],
            ]} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t.customer?.firstName ?? 'Customer'}</p>
              {t.customer?.phone && isActive ? (
                <a href={`tel:${t.customer.phone}`} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-studio-border px-3 text-sm font-semibold">
                  <Phone className="h-4 w-4" aria-hidden /> Call
                </a>
              ) : null}
            </div>
            {isActive || t.status === 'NOT_STARTED' ? (
              <a href={mapsLink(navTarget)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
                <ExternalLink className="h-4 w-4" aria-hidden /> Navigate to {t.status === 'IN_PROGRESS' ? 'destination' : 'pickup'} in Google Maps
              </a>
            ) : null}
          </Card>

          {t.status === 'NOT_STARTED' ? (
            <Card className="space-y-3">
              <p>Pickup in <span className="font-semibold tabular-nums">{countdown(b.pickupAt, now)}</span>. You can start the trip to the pickup up to 3 hours before.</p>
              <Button size="lg" className="w-full" busy={action.busy} onClick={() => void post('depart')}>Start heading to pickup</Button>
            </Card>
          ) : null}

          {t.status === 'DRIVER_EN_ROUTE' ? (
            <Card className="space-y-3">
              {b.promisedArrivalAt ? <p className="text-sm">Expected at pickup by <span className="font-semibold tabular-nums">{time(b.promisedArrivalAt)}</span> ({countdown(b.promisedArrivalAt, now)} left).</p> : null}
              <Button size="lg" className="w-full" busy={action.busy} onClick={() => void post('arrive')}>I have arrived</Button>
              <p className="text-xs text-studio-muted">You need to be within 100 m of the pickup. If your location is not accurate, the customer can confirm your arrival in their app.</p>
            </Card>
          ) : null}

          {t.status === 'ARRIVED' && w ? (
            <>
              <Card className="space-y-2">
                <p className="text-sm font-medium text-studio-muted">Waiting time</p>
                <p className="text-3xl font-semibold tabular-nums">{Math.floor((now - new Date(t.arrivedAt!).getTime()) / 60_000)} min</p>
                <p className="text-sm text-studio-muted">
                  Arrived at {time(t.arrivedAt)} ({t.arrivalMethod === 'CUSTOMER_CONFIRMED' ? 'confirmed by customer' : 'GPS'}).
                  {now < new Date(w.freeUntil).getTime() ? ` Free until ${time(w.freeUntil)}.` : ` A single ${inr(50)} waiting fee now applies.`}
                </p>
                {now >= new Date(w.noShowAvailableAt).getTime() ? (
                  <Button variant="danger" className="w-full" busy={action.busy} onClick={() => void post('customer-no-show')}>Record customer no-show ({inr(150)})</Button>
                ) : (
                  <p className="text-xs text-studio-muted">Customer no-show can be recorded at {time(w.noShowAvailableAt)}.</p>
                )}
              </Card>
              <OtpPad label="Enter the customer's start code" busy={otp.busy} error={otp.error} onSubmit={(c) => void verify('start', c)} />
            </>
          ) : null}

          {t.status === 'IN_PROGRESS' ? (
            <>
              <Card>
                <KeyValue items={[
                  ['Started', time(t.startedAt)],
                  ['Elapsed', `${Math.max(0, Math.floor((now - new Date(t.startedAt!).getTime()) / 60_000))} min`],
                  ['Fare so far', inr(Math.round((b.quote.hourlyRateInr * Math.max(0, now - new Date(t.startedAt!).getTime())) / 3_600_000))],
                ]} />
              </Card>
              <OtpPad label="Enter the customer's end code" busy={otp.busy} error={otp.error} onSubmit={(c) => void verify('end', c)} />
            </>
          ) : null}

          {t.fare ? (
            <Card className="space-y-2">
              <p className="font-semibold">Fare</p>
              <KeyValue items={[
                ['Trip time', `${t.fare.billableMinutes} min`],
                ['Base fare', inr(t.fare.baseFareInr)],
                ['Waiting fee', inr(t.fare.waitingFeeInr)],
                ['No-show fee', inr(t.fare.noShowFeeInr)],
                ['Veyro fee', inr(0)],
                ['You earn', <strong key="t">{inr(t.fare.totalInr)}</strong>],
              ]} />
              <LinkButton href="/driver/earnings" variant="secondary">View earnings</LinkButton>
            </Card>
          ) : null}

          {['CANCELLED', 'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW'].includes(t.status) ? (
            <Alert tone="info" title="This trip has ended">{b.cancellation ? `Cancelled by ${b.cancellation.by.toLowerCase()}.` : null} <Link className="underline" href="/driver">Back to dashboard</Link></Alert>
          ) : null}

          <ErrorText>{action.error}</ErrorText>

          {isActive || t.status === 'NOT_STARTED' ? <GpsPanel gps={gps} /> : null}
          {isActive ? <SosPanel tripId={t.id} contacts={[]} /> : null}

          {canCancel ? (
            <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(true)}>Cancel trip</Button>
          ) : null}
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={b.id}
        role="DRIVER"
        onDone={(m) => {
          setCancelOpen(false);
          setNotice(m);
          void trip.reload();
        }}
      />
    </div>
  );
}
