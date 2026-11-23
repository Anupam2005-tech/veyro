'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Inbox, Zap } from 'lucide-react';
import { GpsPanel } from '@/components/GpsPanel';
import { MapView } from '@/components/MapView';
import { Alert, Button, Card, Empty, ErrorText, KeyValue, LinkButton, PageHeader, Spinner, StatusBadge, cx } from '@/components/ui';
import { api, apiWithMessage, errorMessage } from '@/lib/api';
import { countdown, dateTime, humanize, inr, shortId } from '@/lib/format';
import { useAction, useApi, useNow } from '@/lib/hooks';
import { useDriverGps } from '@/lib/gps';
import { useRequireRole, useSession } from '@/lib/session';
import type { Booking, Trip } from '@/lib/types';

export default function DriverDashboard() {
  const me = useRequireRole('DRIVER');
  const { refresh } = useSession();
  const router = useRouter();
  const offers = useApi<Booking[]>(me?.driver?.approvalStatus === 'APPROVED' ? '/drivers/offers' : null, 3000);
  const trips = useApi<Trip[]>(me ? '/drivers/trips' : null, 5000);
  const now = useNow();
  const toggle = useAction();
  const [offerError, setOfferError] = useState<Record<string, string>>({});
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const start = useMemo(() => {
    const d = me?.driver;
    if (!d) return null;
    return d.presence ? { lat: d.presence.lat, lng: d.presence.lng } : { lat: d.serviceArea.lat, lng: d.serviceArea.lng };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.driver?.id]);
  const gps = useDriverGps(start, null);

  useEffect(() => {
    if (me && me.driver?.approvalStatus !== 'APPROVED') router.replace('/driver/status');
  }, [me, router]);

  if (!me || !me.driver) return <Spinner />;
  const d = me.driver;
  const active = trips.data?.find((t) => ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(t.status));
  const upcoming = trips.data?.filter((t) => t.status === 'NOT_STARTED') ?? [];

  async function setOnline(next: boolean) {
    await toggle.run(async () => {
      await api('/drivers/availability', { method: 'PATCH', body: { status: next ? 'ONLINE' : 'OFFLINE' } });
      await refresh();
    });
  }

  async function respond(b: Booking, accept: boolean) {
    setBusyOffer(b.id);
    setOfferError((e) => ({ ...e, [b.id]: '' }));
    try {
      const r = await apiWithMessage<Booking>(`/drivers/offers/${b.id}/${accept ? 'accept' : 'reject'}`, { method: 'POST' });
      if (accept && r.data.tripId) router.push(`/driver/trips/${r.data.tripId}`);
      else void offers.reload();
    } catch (e) {
      setOfferError((x) => ({ ...x, [b.id]: errorMessage(e) }));
      void offers.reload();
    } finally {
      setBusyOffer(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={'Dashboard'}
        subtitle={`${inr(d.hourlyRateInr)}/hr · ${d.categories.map(humanize).join(', ')} · ${d.transmissions.map(humanize).join(', ')}`}
        action={<StatusBadge status={d.isOnline ? 'ONLINE' : 'OFFLINE'} label={d.isOnline ? 'Online' : 'Offline'} />}
      />

      {d.isSuspended ? <Alert tone="danger" title="Account suspended">{d.suspensionReason}</Alert> : null}
      {active ? (
        <Alert tone="info" title={`Active trip · ${active.status.replace(/_/g, ' ').toLowerCase()}`} action={<LinkButton href={`/driver/trips/${active.id}`}>Open trip</LinkButton>}>
          {active.booking?.pickup.label} → {active.booking?.destination.label}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <div className="space-y-4">
          <Card dark className="space-y-4">
            <p className="text-sm font-medium text-studio-muted">Status</p>
            <p className="text-2xl font-semibold tabular-nums">{d.isOnline ? 'You are online' : 'You are offline'}</p>
            <Button size="lg" className="w-full" variant={d.isOnline ? 'secondary' : 'primary'} busy={toggle.busy} onClick={() => void setOnline(!d.isOnline)} aria-pressed={d.isOnline}>
              {d.isOnline ? 'Go offline' : 'Go online'}
            </Button>
            <p className="text-xs text-studio-muted">To go online, your account must be approved and your location must be on.</p>
            <ErrorText>{toggle.error ? <span className="text-red-700">{toggle.error}</span> : null}</ErrorText>
          </Card>
          <GpsPanel gps={gps} />
          <Card>
            <KeyValue items={[
              ['Service area', `${d.serviceArea.label.split(',')[0]} · ${d.serviceArea.radiusKm} km`],
              ['Missed pickups', `${d.verifiedNoShowCount} / 5`],
              ['Rating', d.rating ? `${d.rating} (${d.ratingCount})` : 'New'],
            ]} />
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Trip requests</h2>
          {!d.isOnline ? (
            <Empty icon={Inbox} title="You are offline">Go online to start receiving trip requests.</Empty>
          ) : offers.data && !offers.data.length ? (
            <Empty icon={Inbox} title="No requests right now">New trip requests will appear here. Keep this page open.</Empty>
          ) : null}
          {offers.data?.map((b) => (
            <Card key={b.id} className={cx('space-y-3', b.type === 'INSTANT' && 'border-studio-obsidian')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  {b.type === 'INSTANT' ? <Zap className="h-4 w-4" aria-hidden /> : <CalendarClock className="h-4 w-4" aria-hidden />}
                  {b.type === 'INSTANT' ? 'Instant trip' : `Scheduled · ${dateTime(b.pickupAt)}`}
                  <span className="tabular-nums text-xs text-studio-muted">#{shortId(b.id)}</span>
                </p>
                <span className="text-sm font-semibold tabular-nums" aria-live="polite">
                  {b.type === 'INSTANT' ? `Respond in ${countdown(b.offerExpiresAt, now)}` : `Open for ${countdown(b.broadcastEndAt, now)}`}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <KeyValue items={[
                  ['Pickup', b.pickup.label],
                  ['Destination', b.destination.label],
                  ['Route', `${b.quote.estimatedRouteKm} km · ${b.quote.estimatedRouteMinutes} min`],
                ]} />
                <KeyValue items={[
                  ['Customer vehicle', `${b.vehicle.make} ${b.vehicle.model}`],
                  ['Car type', `${humanize(b.vehicle.category)} · ${humanize(b.vehicle.transmission)} · ${humanize(b.vehicle.fuelType)}`],
                  ['Estimated earnings', `${inr(b.type === 'SCHEDULED' ? (d.hourlyRateInr * b.quote.estimatedRouteMinutes) / 60 : b.estimatedEarningsInr)} · hourly`],
                ]} />
              </div>
              {expanded === b.id ? (
                <MapView
                  className="h-48"
                  markers={[{ id: 'A', ...b.pickup, kind: 'pickup' }, { id: 'B', ...b.destination, kind: 'destination' }]}
                  polyline={b.routePolyline}
                  fitKey={b.id}
                />
              ) : (
                <button type="button" className="text-sm underline" onClick={() => setExpanded(b.id)}>Show route map</button>
              )}
              <ErrorText>{offerError[b.id]}</ErrorText>
              <div className="flex gap-2">
                <Button className="flex-1" size="lg" busy={busyOffer === b.id} onClick={() => void respond(b, true)}>Accept</Button>
                <Button variant="secondary" size="lg" disabled={busyOffer === b.id} onClick={() => void respond(b, false)}>Decline</Button>
              </div>
            </Card>
          ))}

          {upcoming.length ? (
            <>
              <h2 className="pt-2 text-lg font-semibold">Upcoming trips</h2>
              {upcoming.map((t) => (
                <Link key={t.id} href={`/driver/trips/${t.id}`} className="flex items-center justify-between rounded-2xl border border-studio-border bg-white p-4">
                  <span>
                    <span className="block font-semibold">{dateTime(t.booking?.pickupAt)}</span>
                    <span className="text-sm text-studio-muted">{t.booking?.pickup.label} → {t.booking?.destination.label}</span>
                  </span>
                  <StatusBadge status={t.status} />
                </Link>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
