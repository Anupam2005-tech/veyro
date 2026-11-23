'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { CancelDialog } from '@/components/CancelDialog';
import { MapView, type MapMarker } from '@/components/MapView';
import { LocationStatus, OtpVaultCard, SharePanel, SosPanel } from '@/components/TripWidgets';
import { Alert, Button, Card, ErrorText, KeyValue, PageHeader, Spinner, StatusBadge, Stars } from '@/components/ui';
import { VehiclePass } from '@/components/VehicleForm';
import { apiWithMessage } from '@/lib/api';
import { countdown, dateTime, inr, shortId, time } from '@/lib/format';
import { useAction, useApi, useNow } from '@/lib/hooks';
import { saveRebook } from '@/lib/rebook';
import { useRequireRole } from '@/lib/session';
import type { Booking, Policy, Trip } from '@/lib/types';

export default function CustomerTrip() {
  const me = useRequireRole('CUSTOMER');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, error, reload } = useApi<Trip>(me ? `/trips/${id}` : null, 3000);
  const booking = useApi<Booking>(trip ? `/bookings/${trip.bookingId}` : null, 10000);
  const policy = useApi<Policy>(me ? '/bookings/policy' : null);
  const now = useNow();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();

  useEffect(() => {
    if (trip && (trip.status === 'COMPLETED' || trip.status === 'CUSTOMER_NO_SHOW')) router.replace(`/customer/trips/${trip.id}/summary`);
  }, [trip, router]);

  if (!me) return <Spinner />;
  if (error && !trip) return <Alert tone="danger">{error}</Alert>;
  if (!trip || !trip.booking) return <Spinner />;
  const b = trip.booking;

  const markers: MapMarker[] = [
    { id: 'A', ...b.pickup, kind: 'pickup', label: b.pickup.label },
    { id: 'B', ...b.destination, kind: 'destination', label: b.destination.label },
    ...(trip.location ? [{ id: 'drv', lat: trip.location.lat, lng: trip.location.lng, kind: trip.location.stale ? ('driver-stale' as const) : ('driver' as const), label: trip.driver?.firstName }] : []),
  ];
  const noShowAt = b.driverNoShowAt ? new Date(b.driverNoShowAt).getTime() : null;
  const pastNoShow = noShowAt !== null && now >= noShowAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title={trip.status === 'IN_PROGRESS' ? 'On your trip' : trip.status === 'ARRIVED' ? 'Your driver is here' : trip.status === 'NOT_STARTED' ? 'Upcoming ride' : 'Driver on the way'}
        subtitle={<span className="tabular-nums">Trip #{shortId(trip.id)}</span>}
        action={<StatusBadge status={trip.status} />}
      />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {trip.status === 'CANCELLED' || trip.status === 'DRIVER_NO_SHOW' ? (
        <Alert tone="warning" title={trip.status === 'DRIVER_NO_SHOW' ? 'Driver did not arrive' : 'This booking was cancelled'}
          action={<Button onClick={() => { saveRebook({ pickup: b.pickup, destination: b.destination, stops: b.stops, vehicleId: b.vehicle.id, type: 'INSTANT' }); router.push('/customer'); }}>Book again</Button>}>
          {booking.data?.cancellation?.feeInr ? `Fee: ${inr(booking.data.cancellation.feeInr)}.` : 'No charge applies.'} <Link className="underline" href={`/customer/bookings/${b.id}`}>Details</Link>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-4">
          <MapView className="h-[360px]" markers={markers} polyline={b.routePolyline} fitKey={trip.id} ariaLabel="Live trip map" />
          {['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(trip.status) ? <LocationStatus location={trip.location} /> : null}

          {trip.status === 'NOT_STARTED' ? (
            <Card>
              <p className="font-semibold">{trip.driver?.name} will drive your {b.vehicle.make} {b.vehicle.model} on {dateTime(b.pickupAt)}.</p>
              <p className="mt-1 text-sm text-studio-muted">You will see their location once they are on the way to the pickup.</p>
            </Card>
          ) : null}

          {trip.status === 'DRIVER_EN_ROUTE' ? (
            <Card className="space-y-3">
              <KeyValue items={[
                ['Expected arrival', b.type === 'INSTANT' ? time(b.promisedArrivalAt) : dateTime(b.pickupAt)],
                ['Arrival deadline', b.driverNoShowAt ? `${time(b.driverNoShowAt)}${pastNoShow ? ' (passed)' : ` · ${countdown(b.driverNoShowAt, now)}`}` : '—'],
              ]} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="dark"
                  busy={action.busy}
                  onClick={() => void action.run(async () => { const r = await apiWithMessage<Trip>(`/trips/${trip.id}/confirm-arrival`, { method: 'POST' }); setNotice(r.message); void reload(); })}
                >
                  My driver is here
                </Button>
                {pastNoShow ? (
                  <Button
                    variant="danger"
                    busy={action.busy}
                    onClick={() => void action.run(async () => { const r = await apiWithMessage(`/bookings/${b.id}/driver-no-show`, { method: 'POST' }); setNotice(r.message); void reload(); })}
                  >
                    Report driver no-show (free)
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-studio-muted">If your driver is with you but the app has not updated, tap “My driver is here”.</p>
            </Card>
          ) : null}

          {trip.status === 'ARRIVED' && trip.waiting ? (
            <Card className="space-y-2">
              <p className="text-base font-semibold">Waiting time</p>
              <KeyValue items={[
                ['Driver arrived', `${time(trip.arrivedAt)} (${trip.arrivalMethod === 'GPS' ? 'confirmed by location' : 'confirmed by you'})`],
                ['Free until', `${time(trip.waiting.freeUntil)}${now < new Date(trip.waiting.freeUntil).getTime() ? ` · ${countdown(trip.waiting.freeUntil, now)} left` : ''}`],
                ['Waiting charge if you start now', inr(now > new Date(trip.waiting.freeUntil).getTime() ? policy.data?.waitFeeInr ?? 50 : 0)],
                ['No-show fee applies from', time(trip.waiting.noShowAvailableAt)],
              ]} />
              <p className="text-xs text-studio-muted">One ₹{policy.data?.waitFeeInr ?? 50} charge after {policy.data?.waitFreeMin ?? 15} free minutes, charged once. At {policy.data?.waitMaxMin ?? 30} minutes the driver may record a ₹{policy.data?.noShowFeeInr ?? 150} no-show, which replaces it.</p>
            </Card>
          ) : null}
          <ErrorText>{action.error}</ErrorText>
        </div>

        <div className="space-y-4">
          {trip.status === 'ARRIVED' ? (
            <OtpVaultCard tripId={trip.id} kind="start" title="Start code" help="When you are ready to leave, reveal the code and say it to your driver." />
          ) : null}
          {trip.status === 'IN_PROGRESS' ? (
            <OtpVaultCard tripId={trip.id} kind="end" title="End code" help="At your destination, reveal this separate code so the driver can end the trip." />
          ) : null}

          {trip.driver ? (
            <Card>
              <p className="text-xs font-medium text-studio-muted">Your driver</p>
              <p className="mt-1 flex items-center gap-2 text-base font-semibold">{trip.driver.name} <Stars value={trip.driver.rating} /></p>
              <p className="text-sm text-studio-muted">{trip.driver.experienceYears} yrs · {trip.driver.languages.join(', ')}</p>
              {trip.driverPhone && ['DRIVER_EN_ROUTE', 'ARRIVED', 'NOT_STARTED'].includes(trip.status) ? (
                <a href={`tel:${trip.driverPhone}`} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-studio-input-border px-3 py-2 text-sm font-semibold">
                  <Phone className="h-4 w-4" aria-hidden /> Call driver
                </a>
              ) : null}
            </Card>
          ) : null}

          {trip.status === 'IN_PROGRESS' ? (
            <>
              <Card>
                <KeyValue items={[
                  ['Started', time(trip.startedAt)],
                  ['Elapsed', trip.startedAt ? `${Math.floor((now - new Date(trip.startedAt).getTime()) / 60000)} min` : '—'],
                  ['Rate', `${inr(b.quote.hourlyRateInr)}/hr`],
                  ['Fare so far (approx.)', trip.startedAt ? inr((b.quote.hourlyRateInr * (now - new Date(trip.startedAt).getTime())) / 3_600_000) : '—'],
                ]} />
              </Card>
            </>
          ) : null}

          {['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(trip.status) ? (
            <>
              <SosPanel tripId={trip.id} contacts={me.emergencyContacts} />
              <SharePanel tripId={trip.id} />
            </>
          ) : null}

          <VehiclePass vehicle={b.vehicle} compact />

          {['NOT_STARTED', 'DRIVER_EN_ROUTE', 'ARRIVED'].includes(trip.status) ? (
            <Button variant="secondary" className="w-full" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
          ) : null}
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={b.id}
        role="CUSTOMER"
        feePreviewInr={booking.data?.cancellationFeePreviewInr}
        onDone={(m) => {
          setCancelOpen(false);
          setNotice(m);
          void reload();
          void booking.reload();
        }}
      />
    </div>
  );
}
