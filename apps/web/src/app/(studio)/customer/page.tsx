'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Plus, RefreshCw, Users, X, Zap } from 'lucide-react';
import { MapView, type MapMarker } from '@/components/MapView';
import { PlaceInput } from '@/components/PlaceInput';
import { Alert, Button, Card, ChipToggle, Empty, ErrorText, Field, Input, KeyValue, Modal, Select, Spinner, Stars, cx } from '@/components/ui';
import { VehiclePass } from '@/components/VehicleForm';
import { api, errorMessage } from '@/lib/api';
import { dateTime, humanize, inr, toLocalInput } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { Booking, DriverCard, LiveLocation, Place, Policy, Vehicle } from '@/lib/types';
import { REBOOK_KEY, type RebookDraft } from '@/lib/rebook';

interface QuoteDriver extends DriverCard {
  favourite: boolean;
  pickupDistanceKm: number;
  etaMin: number | null;
  estimatedFareInr: number;
  location: LiveLocation | null;
}

interface Quote {
  type: 'INSTANT' | 'SCHEDULED';
  pickupAt: string;
  route: { distanceKm: number; durationMin: number; polyline: [number, number][]; source: 'OSRM' | 'ESTIMATE' };
  radiusKm: number;
  nextRadiusKm: number;
  drivers: QuoteDriver[];
  eligibleCount: number;
  emptyReason: string | null;
  fareRange: { minInr: number; maxInr: number } | null;
  broadcast: { startAt: string; endAt: string } | null;
  outstandingBalanceInr: number;
}

const EMPTY_COPY: Record<string, [string, string]> = {
  NO_APPROVED_DRIVERS: ['No approved drivers yet', 'There are no drivers available yet. Please try again later.'],
  NO_ONLINE_DRIVERS: ['No drivers online nearby', 'There are no drivers online near you right now. Try again shortly or book ahead.'],
  STALE_GPS: ['Driver locations are out of date', 'We are waiting for updated locations from nearby drivers. Try again in a moment.'],
  VEHICLE_INCOMPATIBLE: ['No drivers for this car', 'No available driver can drive this type of car. Try a different vehicle.'],
  ALL_BUSY: ['All drivers are busy', 'All nearby drivers are on trips. Try again shortly or book ahead.'],
  OUT_OF_SERVICE_AREA: ['Outside our service area', 'We do not have drivers covering this pickup location yet.'],
  OUTSIDE_RADIUS: ['No drivers nearby', 'There are drivers further away. Widen your search to see them.'],
};

type Sort = 'recommended' | 'closest' | 'fare' | 'rating';

export default function BookingStudio() {
  const me = useRequireRole('CUSTOMER');
  const router = useRouter();
  const vehicles = useApi<Vehicle[]>(me ? '/customers/vehicles' : null);
  const policy = useApi<Policy>(me ? '/bookings/policy' : null);
  const [type, setType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [pickup, setPickup] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [stops, setStops] = useState<(Place | null)[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [pickupAt, setPickupAt] = useState(() => toLocalInput(new Date(Date.now() + 6 * 3_600_000)));
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recommended');
  const [filters, setFilters] = useState({ maxFare: '', maxDistance: '', minRating: '', minExperience: '', language: '' });
  const [selected, setSelected] = useState<QuoteDriver | null>(null);
  const [confirmScheduled, setConfirmScheduled] = useState(false);
  const [pinTarget, setPinTarget] = useState<'pickup' | 'destination'>('pickup');
  const create = useAction();
  const seq = useRef(0);

  // Prefill from "try instant now" / "choose another driver".
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REBOOK_KEY);
      if (!raw) return;
      sessionStorage.removeItem(REBOOK_KEY);
      const r = JSON.parse(raw) as RebookDraft;
      setPickup(r.pickup);
      setDestination(r.destination);
      setStops(r.stops);
      setVehicleId(r.vehicleId);
      if (r.type) setType(r.type);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!vehicleId && vehicles.data?.length) setVehicleId((vehicles.data.find((v) => v.isDefault) ?? vehicles.data[0]!).id);
  }, [vehicles.data, vehicleId]);

  const validStops = stops.filter((s): s is Place => s !== null);
  const vehicle = vehicles.data?.find((v) => v.id === vehicleId) ?? null;
  const scheduledIso = useMemo(() => {
    const d = new Date(pickupAt);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }, [pickupAt]);

  // Debounced quote (~400 ms) on relevant changes only — not on map pan/zoom.
  const quoteKey = JSON.stringify([type, pickup, destination, validStops, vehicleId, type === 'SCHEDULED' ? scheduledIso : null, radiusKm, nonce]);
  useEffect(() => {
    if (!me || !pickup || !destination || !vehicleId) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await api<Quote>('/bookings/quote', {
          body: { type, pickup, destination, stops: validStops, vehicleId, pickupAt: type === 'SCHEDULED' ? scheduledIso : undefined, radiusKm: radiusKm ?? undefined },
        });
        if (id === seq.current) {
          setQuote(q);
          setQuoteError(null);
        }
      } catch (e) {
        if (id === seq.current) {
          setQuote(null);
          setQuoteError(errorMessage(e));
        }
      } finally {
        if (id === seq.current) setQuoting(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, me]);

  // Instant driver positions change; refresh the list every 15 s while idle.
  useEffect(() => {
    if (type !== 'INSTANT' || !quote || selected) return;
    const t = setInterval(() => setNonce((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [type, quote, selected]);

  const drivers = useMemo(() => {
    if (!quote) return [];
    let list = quote.drivers.filter((d) => {
      if (filters.maxFare && d.estimatedFareInr > Number(filters.maxFare)) return false;
      if (filters.maxDistance && d.pickupDistanceKm > Number(filters.maxDistance)) return false;
      if (filters.minRating && (d.rating ?? 0) < Number(filters.minRating)) return false;
      if (filters.minExperience && d.experienceYears < Number(filters.minExperience)) return false;
      if (filters.language && !d.languages.includes(filters.language)) return false;
      return true;
    });
    list = [...list];
    if (sort === 'closest') list.sort((a, b) => a.pickupDistanceKm - b.pickupDistanceKm);
    if (sort === 'fare') list.sort((a, b) => a.estimatedFareInr - b.estimatedFareInr);
    if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [quote, filters, sort]);

  const languages = useMemo(() => [...new Set(quote?.drivers.flatMap((d) => d.languages) ?? [])].sort(), [quote]);

  const markers: MapMarker[] = [
    ...(pickup ? [{ id: 'A', lat: pickup.lat, lng: pickup.lng, kind: 'pickup' as const, label: `Pickup: ${pickup.label}` }] : []),
    ...validStops.map((s, i) => ({ id: `s${i}`, lat: s.lat, lng: s.lng, kind: 'stop' as const, label: `Stop ${i + 1}: ${s.label}` })),
    ...(destination ? [{ id: 'B', lat: destination.lat, lng: destination.lng, kind: 'destination' as const, label: `Destination: ${destination.label}` }] : []),
    ...(type === 'INSTANT'
      ? drivers.filter((d) => d.location).map((d) => ({ id: d.id, lat: d.location!.lat, lng: d.location!.lng, kind: d.location!.stale ? ('driver-stale' as const) : ('driver' as const), label: `${d.firstName} · ${d.pickupDistanceKm} km` }))
      : []),
  ];

  async function book(driverId?: string) {
    const b = await create.run(() =>
      api<Booking>('/bookings', {
        body: { type, pickup, destination, stops: validStops, vehicleId, driverId, pickupAt: type === 'SCHEDULED' ? scheduledIso : undefined, radiusKm: quote?.radiusKm },
      }),
    );
    if (b) router.push(`/customer/bookings/${b.id}`);
  }

  if (!me) return <Spinner />;
  const blocked = me.outstandingBalanceInr > 0 || me.status === 'SUSPENDED';
  const minLocal = toLocalInput(new Date(Date.now() + 4 * 3_600_000 + 60_000));
  const maxLocal = toLocalInput(new Date(Date.now() + 30 * 86_400_000));

  return (
    <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Book a driver</h1>
          <p className="text-sm text-studio-muted">Choose your route and a driver. You pay by the minute at the driver&apos;s hourly rate.</p>
        </div>

        <div role="tablist" aria-label="Booking type" className="grid grid-cols-2 gap-2 rounded-2xl bg-studio-tint p-1">
          {(['INSTANT', 'SCHEDULED'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              onClick={() => {
                setType(t);
                setSelected(null);
              }}
              className={cx('flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold', type === t ? 'bg-white shadow' : 'text-studio-muted')}
            >
              {t === 'INSTANT' ? <Zap className="h-4 w-4" aria-hidden /> : <CalendarClock className="h-4 w-4" aria-hidden />}
              {t === 'INSTANT' ? 'Instant' : 'Scheduled'}
            </button>
          ))}
        </div>

        <Card className="space-y-4">
          <PlaceInput label="Pickup" marker="A" value={pickup} onChange={setPickup} />
          {stops.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <PlaceInput label={`Stop ${i + 1}`} value={s} onChange={(p) => setStops((list) => list.map((x, j) => (j === i ? p : x)))} />
              </div>
              <Button variant="ghost" size="sm" aria-label={`Remove stop ${i + 1}`} onClick={() => setStops((list) => list.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <PlaceInput label="Destination" marker="B" value={destination} onChange={setDestination} />
          {stops.length < 3 ? (
            <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-studio-brand hover:underline" onClick={() => setStops((s) => [...s, null])}>
              <Plus className="h-4 w-4" aria-hidden /> Add a stop
            </button>
          ) : null}
          {type === 'SCHEDULED' ? (
            <Field label="Pickup time" hint={`Between 4 hours and ${policy.data?.scheduledMaxLeadDays ?? 30} days from now.`}>
              {(id) => <Input id={id} type="datetime-local" min={minLocal} max={maxLocal} value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} />}
            </Field>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Your vehicle</p>
            <Link href="/customer/profile#vehicles" className="text-sm underline">Manage</Link>
          </div>
          {vehicles.data?.length ? (
            <>
              <Select aria-label="Choose vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.data.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {humanize(v.category)} · {humanize(v.transmission)}</option>)}
              </Select>
              {vehicle ? <VehiclePass vehicle={vehicle} compact /> : null}
              <p className="text-xs text-studio-muted">Only drivers who can drive this type of car are shown.</p>
            </>
          ) : vehicles.loading ? (
            <Spinner />
          ) : (
            <Alert tone="warning" title="Add your vehicle first" action={<Link className="font-semibold underline" href="/customer/profile#vehicles">Add</Link>}>
              Add the car you want driven to see available drivers.
            </Alert>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <MapView
            className="h-[340px] lg:h-[420px]"
            markers={markers}
            polyline={quote?.route.polyline}
            fitKey={JSON.stringify([pickup, destination, validStops, quote?.route.distanceKm])}
            onPick={(lat, lng) => {
              const p = { label: `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, lat, lng };
              if (pinTarget === 'pickup') {
                setPickup(p);
                setPinTarget('destination');
              } else setDestination(p);
            }}
            ariaLabel="Booking map. Click to drop a pickup or destination pin."
          />
          <div className="absolute left-3 top-3 z-[500] flex gap-1 rounded-xl bg-white/95 p-1 text-xs shadow">
            <span className="px-2 py-1 text-studio-muted">Set on map</span>
            {(['pickup', 'destination'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={pinTarget === t} onClick={() => setPinTarget(t)} className={cx('rounded-lg px-2 py-1 font-semibold', pinTarget === t ? 'bg-studio-obsidian text-white' : '')}>
                {t === 'pickup' ? 'Pickup' : 'Destination'}
              </button>
            ))}
          </div>
        </div>

        {blocked ? (
          <Alert tone="warning" title={me.status === 'SUSPENDED' ? 'Account suspended' : `Outstanding balance of ${inr(me.outstandingBalanceInr)}`}
            action={me.status === 'SUSPENDED' ? undefined : <Link href="/customer/profile#payments" className="font-semibold underline">Pay now</Link>}>
            {me.status === 'SUSPENDED' ? me.suspensionReason : 'You can view drivers, but please pay your outstanding balance before booking.'}
          </Alert>
        ) : null}

        {!pickup || !destination ? (
          <Empty icon={Users} title="Where are you going?">Enter a pickup and destination to see the route, an estimated fare and available drivers.</Empty>
        ) : quoting && !quote ? (
          <Spinner label="Finding drivers near you…" />
        ) : quoteError ? (
          <Alert tone="danger" title="We could not get an estimate" action={<Button size="sm" variant="secondary" onClick={() => setNonce((n) => n + 1)}><RefreshCw className="h-4 w-4" /> Retry</Button>}>
            {quoteError}
          </Alert>
        ) : quote ? (
          <>
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-xs font-medium text-studio-muted">Route</p>
                <p className="text-lg font-semibold">{quote.route.distanceKm} km · {quote.route.durationMin} min</p>
              </div>
              <div>
                <p className="text-xs font-medium text-studio-muted">Pricing</p>
                <p className="font-semibold">By the minute</p>
              </div>
              {quote.fareRange ? (
                <div>
                  <p className="text-xs font-medium text-studio-muted">Estimate</p>
                  <p className="text-lg font-semibold">{quote.fareRange.minInr === quote.fareRange.maxInr ? inr(quote.fareRange.minInr) : `${inr(quote.fareRange.minInr)}–${inr(quote.fareRange.maxInr)}`}</p>
                </div>
              ) : null}
              <p className="w-full text-xs text-studio-muted">
                {quote.route.source === 'OSRM' ? 'Estimated using current road routes.' : 'Approximate estimate. Your final fare is based on the actual trip time.'}
                {quoting ? ' Updating…' : ''}
              </p>
            </Card>

            {type === 'SCHEDULED' ? (
              <Card className="space-y-3">
                <p className="font-semibold">{quote.eligibleCount} driver{quote.eligibleCount === 1 ? '' : 's'} available for this trip</p>
                {quote.broadcast ? (
                  <KeyValue items={[
                    ['Pickup', dateTime(quote.pickupAt)],
                    ['Driver search starts', dateTime(quote.broadcast.startAt)],
                    ['Driver search ends', dateTime(quote.broadcast.endAt)],
                    ['Estimated fare', quote.fareRange ? `up to ${inr(quote.fareRange.maxInr)}` : '—'],
                  ]} />
                ) : null}
                <p className="text-xs text-studio-muted">We will confirm your booking as soon as a driver accepts. If nobody has accepted by the time the search ends, you can choose a new time or cancel at no charge.</p>
                <ErrorText>{create.error}</ErrorText>
                <Button size="lg" className="w-full" disabled={!quote.eligibleCount || blocked} onClick={() => setConfirmScheduled(true)}>
                  Review booking
                </Button>
              </Card>
            ) : (
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{drivers.length} driver{drivers.length === 1 ? '' : 's'} within {quote.radiusKm} km</h2>
                  <Select aria-label="Sort drivers" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto min-h-[36px]">
                    <option value="recommended">Recommended</option>
                    <option value="closest">Closest</option>
                    <option value="fare">Lowest estimated fare</option>
                    <option value="rating">Highest rated</option>
                  </Select>
                </div>
                <details className="mb-3 rounded-xl bg-studio-tint p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Filters</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Max fare (₹)">{(id) => <Input id={id} type="number" value={filters.maxFare} onChange={(e) => setFilters({ ...filters, maxFare: e.target.value })} />}</Field>
                    <Field label="Max pickup distance (km)">{(id) => <Input id={id} type="number" value={filters.maxDistance} onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })} />}</Field>
                    <Field label="Min rating">{(id) => <Select id={id} value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}><option value="">Any</option><option value="4">4+</option><option value="4.5">4.5+</option></Select>}</Field>
                    <Field label="Min experience (yrs)">{(id) => <Input id={id} type="number" value={filters.minExperience} onChange={(e) => setFilters({ ...filters, minExperience: e.target.value })} />}</Field>
                    <Field label="Language">{(id) => <Select id={id} value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })}><option value="">Any</option>{languages.map((l) => <option key={l}>{l}</option>)}</Select>}</Field>
                  </div>
                </details>

                {quote.emptyReason ? (
                  <Empty icon={Users} title={EMPTY_COPY[quote.emptyReason]?.[0] ?? 'No drivers available'}>
                    <p>{EMPTY_COPY[quote.emptyReason]?.[1]}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setRadiusKm(quote.nextRadiusKm)}>Search within {quote.nextRadiusKm} km</Button>
                      <Button size="sm" variant="secondary" onClick={() => setNonce((n) => n + 1)}><RefreshCw className="h-4 w-4" /> Retry</Button>
                      <Button size="sm" variant="ghost" onClick={() => setType('SCHEDULED')}>Book ahead instead</Button>
                    </div>
                  </Empty>
                ) : drivers.length === 0 ? (
                  <Empty title="No drivers match your filters">Clear a filter to see more drivers.</Empty>
                ) : (
                  <ul className="space-y-2">
                    {drivers.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-studio-border p-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-studio-brand-soft text-base font-semibold text-studio-brand" aria-hidden>
                          {d.firstName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold">
                            {d.name} <Stars value={d.rating} /> {d.favourite ? <span className="rounded-full bg-studio-tint px-2 text-xs">★ Favourite</span> : null}
                          </p>
                          <p className="text-xs text-studio-muted">
                            {d.pickupDistanceKm} km away{d.etaMin ? ` · ~${d.etaMin} min to pickup` : ''} · {d.experienceYears} yrs · {d.languages.join(', ')}
                          </p>
                          {d.location?.stale ? <p className="text-xs font-semibold text-amber-800">Location not recently updated</p> : null}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold">{inr(d.estimatedFareInr)}</p>
                          <p className="text-xs text-studio-muted">{inr(d.hourlyRateInr)}/hr</p>
                        </div>
                        <Button size="sm" disabled={blocked} onClick={() => setSelected(d)}>Select</Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!quote.emptyReason && drivers.length ? (
                  <button type="button" className="mt-3 text-sm underline" onClick={() => setRadiusKm(quote.nextRadiusKm)}>
                    Show drivers within {quote.nextRadiusKm} km
                  </button>
                ) : null}
              </Card>
            )}
          </>
        ) : null}
      </div>

      <Modal open={Boolean(selected) || confirmScheduled} onClose={() => { setSelected(null); setConfirmScheduled(false); create.setError(null); }} title={selected ? `Request ${selected.firstName}` : 'Confirm booking'}>
        {quote ? (
          <div className="space-y-4">
            <KeyValue items={[
              ['Pricing', 'Hourly, billed by the minute'],
              ['Driver rate', selected ? `${inr(selected.hourlyRateInr)}/hr` : `up to ${inr(Math.max(...quote.drivers.map((d) => d.hourlyRateInr)))}/hr`],
              ['Estimated route time', `${quote.route.durationMin} min · ${quote.route.distanceKm} km`],
              ['Estimated fare', selected ? inr(selected.estimatedFareInr) : quote.fareRange ? `up to ${inr(quote.fareRange.maxInr)}` : '—'],
              ['Booking fee', inr(policy.data?.customerPlatformFeeInr ?? 0)],
            ]} />
            <div className="rounded-xl bg-studio-tint p-3 text-xs text-studio-muted">
              <p>Your final fare is the driver&apos;s hourly rate for the minutes between the start and end of the trip. There is no minimum fare. Fuel, tolls and parking are not included.</p>
              <p className="mt-1">
                Waiting is free for {policy.data?.waitFreeMin ?? 15} minutes, then a one-time ₹{policy.data?.waitFeeInr ?? 50} charge applies. A ₹{policy.data?.noShowFeeInr ?? 150} no-show fee applies after {policy.data?.waitMaxMin ?? 30} minutes.{' '}
                {type === 'INSTANT'
                  ? 'You can cancel free of charge.'
                  : `Cancellation is free until ${policy.data?.cancelFreeAfterAcceptMin ?? 5} minutes after a driver accepts. After that it costs ₹${policy.data?.cancelBeforeArrivalFeeInr ?? 50} before the driver arrives and ₹${policy.data?.cancelAfterArrivalFeeInr ?? 100} after.`}
              </p>
            </div>
            {selected ? <p className="text-sm">{selected.firstName} has {policy.data?.instantOfferMinutes ?? 5} minutes to accept. If they decline, you can choose another driver.</p> : null}
            <ErrorText>{create.error}</ErrorText>
            <Button size="lg" className="w-full" busy={create.busy} onClick={() => void book(selected?.id)}>
              {selected ? `Send request to ${selected.firstName}` : 'Confirm booking'}
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

