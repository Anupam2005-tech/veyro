'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CancelDialog } from '@/components/CancelDialog';
import { MapView } from '@/components/MapView';
import { Alert, Button, Card, ErrorText, Field, Input, KeyValue, LinkButton, PageHeader, Spinner, StatusBadge, Stars } from '@/components/ui';
import { VehiclePass } from '@/components/VehicleForm';
import { api, apiWithMessage } from '@/lib/api';
import { countdown, dateTime, humanize, inr, shortId, toLocalInput } from '@/lib/format';
import { useAction, useApi, useNow } from '@/lib/hooks';
import { saveRebook } from '@/lib/rebook';
import { useRequireRole } from '@/lib/session';
import type { Booking } from '@/lib/types';

export default function BookingDetail() {
  const me = useRequireRole('CUSTOMER');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: b, error, reload } = useApi<Booking>(me ? `/bookings/${id}` : null, 3000);
  const now = useNow();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [newTime, setNewTime] = useState(() => toLocalInput(new Date(Date.now() + 6 * 3_600_000)));
  const action = useAction();

  if (!me) return <Spinner />;
  if (error && !b) return <Alert tone="danger">{error}</Alert>;
  if (!b) return <Spinner />;

  const rebook = (type: 'INSTANT' | 'SCHEDULED') => {
    saveRebook({ pickup: b.pickup, destination: b.destination, stops: b.stops, vehicleId: b.vehicle.id, type });
    router.push('/customer');
  };
  const open = ['SEARCHING', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'ASSIGNED', 'NEEDS_REBOOK'].includes(b.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={b.type === 'INSTANT' ? 'Instant booking' : 'Scheduled booking'}
        subtitle={<span className="tabular-nums">#{shortId(b.id)} · {dateTime(b.createdAt)}</span>}
        action={<StatusBadge status={b.status} />}
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-4">
          {b.status === 'SEARCHING' ? (
            <Card dark>
              <p className="text-sm font-medium text-studio-muted">Waiting for {b.driver?.firstName ?? 'driver'}</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-studio-ink" aria-live="polite">{countdown(b.offerExpiresAt, now)}</p>
              <p className="mt-2 text-sm text-studio-muted">Your driver has five minutes to accept. If they decline, you can choose another driver.</p>
            </Card>
          ) : null}

          {b.status === 'SCHEDULED_QUEUED' || b.status === 'SCHEDULED_BROADCASTING' ? (
            <Card>
              <h2 className="text-base font-semibold">Driver search</h2>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="flex justify-between"><span>Booked</span><span className="tabular-nums">{dateTime(b.createdAt)}</span></li>
                <li className="flex justify-between"><span>{b.status === 'SCHEDULED_BROADCASTING' ? 'Searching since' : 'Search starts'}</span><span className="tabular-nums">{dateTime(b.broadcastStartAt)}</span></li>
                <li className="flex justify-between"><span>Search ends</span><span className="tabular-nums">{dateTime(b.broadcastEndAt)} ({countdown(b.broadcastEndAt, now)})</span></li>
                <li className="flex justify-between"><span>Pickup</span><span className="tabular-nums">{dateTime(b.pickupAt)}</span></li>
              </ol>
              <p className="mt-3 text-xs text-studio-muted">We will confirm your booking as soon as a driver accepts.</p>
            </Card>
          ) : null}

          {b.status === 'ASSIGNED' && b.tripId ? (
            <Alert tone="success" title={`${b.driver?.name ?? 'Your driver'} accepted`} action={<LinkButton href={`/customer/trips/${b.tripId}`}>Open trip</LinkButton>}>
              {b.type === 'SCHEDULED' ? `Pickup ${dateTime(b.pickupAt)}.` : 'Your driver is on the way.'}
            </Alert>
          ) : null}

          {b.status === 'EXPIRED' ? (
            <Alert tone="warning" title={b.offerOutcome === 'REJECTED' ? `${b.driver?.firstName ?? 'The driver'} declined` : 'The driver did not respond in time'}
              action={<Button onClick={() => rebook('INSTANT')}>Choose another driver</Button>}>
              You have not been charged. Pick another driver from the list or schedule ahead.
            </Alert>
          ) : null}

          {b.status === 'NEEDS_REBOOK' ? (
            <Card className="space-y-4">
              <Alert tone="warning" title="No driver accepted your scheduled request">You have not been charged. Choose a new time or book an instant driver instead.</Alert>
              <div className="grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
                <Field label="Choose another pickup time" hint="At least 4 hours from now and up to 30 days ahead.">
                  {(fid) => <Input id={fid} type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} />}
                </Field>
                <Button
                  busy={action.busy}
                  onClick={async () => {
                    const r = await action.run(() => apiWithMessage<Booking>(`/bookings/${b.id}/reschedule`, { body: { pickupAt: new Date(newTime).toISOString() } }));
                    if (r) {
                      setNotice(r.message);
                      void reload();
                    }
                  }}
                >
                  Reschedule
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="dark" onClick={() => rebook('INSTANT')}>Book an instant driver</Button>
                <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
              </div>
              <ErrorText>{action.error}</ErrorText>
            </Card>
          ) : null}

          {b.cancellation ? (
            <Card>
              <h2 className="text-base font-semibold">{b.status === 'DRIVER_NO_SHOW' ? 'Driver did not arrive' : 'Cancelled'}</h2>
              <KeyValue items={[
                ['By', humanize(b.cancellation.by)],
                ['Reason', humanize(b.cancellation.reason)],
                ['When', dateTime(b.cancellation.at)],
                ['Fee', inr(b.cancellation.feeInr)],
              ]} />
              {b.status === 'DRIVER_NO_SHOW' || b.status === 'CANCELLED_BY_DRIVER' ? (
                <Button className="mt-4" onClick={() => rebook('INSTANT')}>Book another driver</Button>
              ) : null}
            </Card>
          ) : null}

          {b.trip && ['COMPLETED', 'CUSTOMER_NO_SHOW'].includes(b.status) ? (
            <LinkButton href={`/customer/trips/${b.trip.id}/summary`}>View receipt</LinkButton>
          ) : null}

          <MapView
            className="h-72"
            markers={[
              { id: 'A', ...b.pickup, kind: 'pickup', label: b.pickup.label },
              ...b.stops.map((s, i) => ({ id: `s${i}`, ...s, kind: 'stop' as const, label: s.label })),
              { id: 'B', ...b.destination, kind: 'destination', label: b.destination.label },
            ]}
            polyline={b.routePolyline}
            fitKey={b.id}
          />
        </div>

        <div className="space-y-4">
          {b.driver ? (
            <Card>
              <p className="text-xs font-medium text-studio-muted">{b.status === 'ASSIGNED' ? 'Your driver' : 'Selected driver'}</p>
              <p className="mt-1 flex items-center gap-2 text-base font-semibold">{b.driver.name} <Stars value={b.driver.rating} /></p>
              <p className="text-sm text-studio-muted">{b.driver.experienceYears} yrs · {b.driver.languages.join(', ')}</p>
            </Card>
          ) : null}
          <Card>
            <KeyValue items={[
              ['Pickup', b.pickup.label],
              ...b.stops.map((s, i): [string, string] => [`Stop ${i + 1}`, s.label]),
              ['Destination', b.destination.label],
              ['Pickup time', b.type === 'INSTANT' ? 'Now' : dateTime(b.pickupAt)],
              ['Hourly rate', `${inr(b.quote.hourlyRateInr)}/hr`],
              ['Estimated fare', `${inr(b.quote.displayEstimatedFareInr)} · ${b.quote.estimatedRouteMinutes} min`],
            ]} />
          </Card>
          <VehiclePass vehicle={b.vehicle} />
          {open && b.status !== 'NEEDS_REBOOK' ? (
            <Button variant="secondary" className="w-full" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
          ) : null}
          <Link href="/customer/bookings" className="block text-center text-sm underline">All my rides</Link>
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={b.id}
        role="CUSTOMER"
        feePreviewInr={b.cancellationFeePreviewInr}
        onDone={(m) => {
          setCancelOpen(false);
          setNotice(m);
          void reload();
          void api('/me');
        }}
      />
    </div>
  );
}
