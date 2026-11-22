'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  CalendarClock,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  LoaderCircle,
  Navigation,
  Plus,
  Search,
  Star,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  FareBreakdown,
  Field,
  FormAlert,
  HolographicVehiclePass,
  Input,
  Select,
  Stepper,
  VeyroButton,
} from '@veyro/ui';
import {
  createBooking,
  getCustomerDetails,
  payTrip,
  requestBookingQuote,
  searchDrivers,
} from '@/lib/api/client';
import type {
  BookingQuote,
  BookingQuoteRequest,
  BookingType,
  CustomerProfileDetails,
  DriverCandidate,
  DriverSearchFilters,
} from '@/lib/api/types';
import { formatDateTime, getBroadcastWindow, validateScheduledPickup } from '@/lib/booking/policy';
import { useSession } from '@/lib/auth/session-provider';
import { isDemoDataMode } from '@/lib/env';
import { getMapsProvider } from '@/lib/maps';
import type { Coordinate, MapsProvider, PlaceOption, RoutePreview } from '@/lib/maps';
import { publicPolicy } from '@/lib/public-policy';
import { CustomerShell } from './customer-shell';
import RouteMap from './route-map-dynamic';

const steps = ['Route', 'Driver', 'Confirm'] as const;
const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Urdu'] as const;
const defaultFilters: DriverSearchFilters = {
  maxHourlyRate: null,
  maxPickupDistanceKm: publicPolicy.initialSearchRadiusKm,
  minRating: 0,
  minExperienceYears: 0,
  languages: [],
  sort: 'RECOMMENDED',
  radiusKm: publicPolicy.initialSearchRadiusKm,
};

interface LocationFieldProps {
  id: string;
  label: string;
  value: PlaceOption | null;
  placeholder: string;
  provider: MapsProvider;
  onSelect: (place: PlaceOption) => void;
  trailing?: React.ReactNode;
}

function LocationField({
  id,
  label,
  value,
  placeholder,
  provider,
  onSelect,
  trailing,
}: LocationFieldProps) {
  const [query, setQuery] = React.useState(value?.label ?? '');
  const [options, setOptions] = React.useState<PlaceOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.label]);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions([]);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      provider
        .searchPlaces(query)
        .then((results) => {
          if (active) {
            setOptions(results);
          }
        })
        .catch(() => {
          if (active) {
            setOptions([]);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, provider, query]);

  return (
    <div className="relative">
      <Field id={id} label={label}>
        <div className="flex items-center gap-2">
          <Input
            id={id}
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && options.length > 0}
            aria-controls={`${id}-suggestions`}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {trailing}
        </div>
      </Field>
      {open && options.length > 0 ? (
        <ul
          id={`${id}-suggestions`}
          aria-label={`${label} suggestions`}
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-panel border border-studio-border bg-white shadow-lg"
        >
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left hover:bg-studio-tint"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setQuery(option.label);
                  setOpen(false);
                  setOptions([]);
                }}
              >
                <span className="block text-sm font-semibold text-studio-ink">{option.label}</span>
                <span className="block truncate text-xs text-studio-muted">{option.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-studio-muted">
          <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:animate-none" /> Searching places…
        </p>
      ) : null}
    </div>
  );
}

function DriverCard({
  driver,
  selected,
  onSelect,
}: {
  driver: DriverCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-panel border p-4 text-left transition-colors ${
        selected
          ? 'border-studio-ink bg-studio-obsidian text-white'
          : 'border-studio-border bg-white text-studio-ink hover:border-studio-ink'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold">{driver.name}</p>
          <p className={`mt-1 text-xs ${selected ? 'text-white/70' : 'text-studio-muted'}`}>
            {driver.experienceYears} yrs · {driver.languages.join(', ')}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
          {driver.rating}
        </span>
      </div>
      <div className={`mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs ${selected ? 'border-white/15' : 'border-studio-border'}`}>
        <span className="inline-flex items-center gap-1">
          <Wallet aria-hidden="true" className="h-3.5 w-3.5" /> ₹{driver.hourlyRate}/h
        </span>
        <span className="inline-flex items-center gap-1">
          <Navigation aria-hidden="true" className="h-3.5 w-3.5" /> {driver.pickupDistanceKm} km
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" /> {driver.responseEtaMinutes} min
        </span>
      </div>
      <div className={`mt-3 flex items-center gap-2 text-[11px] ${selected ? 'text-white/70' : 'text-studio-muted'}`}>
        {driver.verified ? (
          <span className="inline-flex items-center gap-1">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" /> Verified
          </span>
        ) : null}
        <span>
          {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.category}
        </span>
        {selected ? <Check aria-hidden="true" className="ml-auto h-4 w-4" /> : null}
      </div>
    </button>
  );
}

export default function BookingStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const provider = React.useMemo(() => getMapsProvider(), []);
  const [customer, setCustomer] = React.useState<CustomerProfileDetails | null>(null);
  const [customerLoading, setCustomerLoading] = React.useState(true);
  const [vehicleId, setVehicleId] = React.useState('');
  const [pickup, setPickup] = React.useState<PlaceOption | null>(null);
  const [destination, setDestination] = React.useState<PlaceOption | null>(null);
  const [stops, setStops] = React.useState<PlaceOption[]>([]);
  const [bookingType, setBookingType] = React.useState<BookingType>('INSTANT');
  const [pickupAt, setPickupAt] = React.useState('');
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<DriverSearchFilters>(defaultFilters);
  const [drivers, setDrivers] = React.useState<DriverCandidate[]>([]);
  const [selectedDriverId, setSelectedDriverId] = React.useState('');
  const [searched, setSearched] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [route, setRoute] = React.useState<RoutePreview | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);
  const [routeRetry, setRouteRetry] = React.useState(0);
  const [quote, setQuote] = React.useState<BookingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = React.useState(false);
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [settling, setSettling] = React.useState(false);
  const [settleNotice, setSettleNotice] = React.useState<string | null>(null);

  const balancePreview = searchParams.get('balance') === '1';
  const unpaidBalance = balancePreview ? 187 : customer?.unpaidBalance ?? 0;
  const balanceBlocksBooking = unpaidBalance > 0 && !customer?.disputedAmountUnderReview;
  const settleTripId =
    searchParams.get('unpaidTrip') ?? (balancePreview && isDemoDataMode ? 'VEY-DEMO-1987' : '');

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setCustomerLoading(false);
      return () => {
        active = false;
      };
    }

    setCustomerLoading(true);
    getCustomerDetails(user)
      .then((details) => {
        if (!active) {
          return;
        }
        setCustomer(details);
        setVehicleId(details.vehicles[0]?.id ?? '');
      })
      .catch((caught: unknown) => {
        if (active) {
          setFormError(caught instanceof Error ? caught.message : 'Could not load your profile.');
        }
      })
      .finally(() => {
        if (active) {
          setCustomerLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  React.useEffect(() => {
    if (provider.id !== 'demo' || pickup || destination) {
      return;
    }
    provider
      .searchPlaces('')
      .then((places) => {
        setPickup(places[0] ?? null);
        setDestination(places[1] ?? null);
      })
      .catch(() => undefined);
  }, [destination, pickup, provider]);

  const points = React.useMemo(
    () => [pickup, destination, ...stops].filter((point): point is PlaceOption => Boolean(point)),
    [destination, pickup, stops]
  );

  const pointsKey = points
    .map((point) => `${point.position.lat.toFixed(5)}:${point.position.lng.toFixed(5)}`)
    .join('|');

  React.useEffect(() => {
    if (points.length < 2) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    let active = true;
    setRouteLoading(true);
    const timer = window.setTimeout(() => {
      provider
        .getRoute(points.map((point) => point.position))
        .then((preview) => {
          if (!active) {
            return;
          }
          setRoute(preview);
          setRouteError(null);
          setQuote(null);
        })
        .catch((caught: unknown) => {
          if (!active) {
            return;
          }
          setRoute(null);
          setRouteError(
            caught instanceof Error ? caught.message : 'Route calculation failed. Retry before booking.'
          );
        })
        .finally(() => {
          if (active) {
            setRouteLoading(false);
          }
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [points, pointsKey, provider, routeRetry]);

  const vehicle = customer?.vehicles.find((item) => item.id === vehicleId) ?? customer?.vehicles[0] ?? null;
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? null;

  const driverMarkers = React.useMemo(
    () =>
      drivers.map((driver, index) => ({
        id: driver.id,
        label: driver.name,
        position: {
          lat: (pickup?.position.lat ?? 12.9719) + ((index % 3) - 1) * 0.006,
          lng: (pickup?.position.lng ?? 77.6412) + (Math.floor(index / 3) - 0.5) * 0.008,
        },
      })),
    [drivers, pickup]
  );

  const broadcastWindow = pickupAt ? getBroadcastWindow(pickupAt) : null;
  const currentStep = quote ? 2 : searched ? 1 : 0;

  function setPointPosition(index: number, position: Coordinate) {
    const apply = (address: string) => {
      const label = address.split(',')[0] || 'Pinned location';
      if (index === 0) {
        setPickup((current) => (current ? { ...current, position, address, label } : current));
        return;
      }
      if (index === 1) {
        setDestination((current) => (current ? { ...current, position, address, label } : current));
        return;
      }
      const stopIndex = index - 2;
      setStops((current) =>
        current.map((stop, stopPosition) =>
          stopPosition === stopIndex ? { ...stop, position, address, label } : stop
        )
      );
    };

    apply('Pinned location');
    provider
      .reverseGeocode(position)
      .then(apply)
      .catch(() => undefined);
  }

  function updateFilter<K extends keyof DriverSearchFilters>(key: K, value: DriverSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setDrivers([]);
    setSelectedDriverId('');
    setSearched(false);
    setQuote(null);
  }

  function toggleLanguage(language: string) {
    const next = filters.languages.includes(language)
      ? filters.languages.filter((item) => item !== language)
      : [...filters.languages, language];
    updateFilter('languages', next);
  }

  async function handleSearchDrivers() {
    if (!user || !vehicle) {
      setSearchError('Add a vehicle to your profile before searching for drivers.');
      return;
    }

    if (bookingType === 'SCHEDULED') {
      const error = validateScheduledPickup(pickupAt);
      setScheduleError(error);
      if (error) {
        return;
      }
    }

    setSearchLoading(true);
    setSearchError(null);
    try {
      const results = await searchDrivers(user, vehicle, filters);
      setDrivers(results);
      setSelectedDriverId(results[0]?.id ?? '');
      setSearched(true);
      setQuote(null);
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : 'Driver search failed.');
    } finally {
      setSearchLoading(false);
    }
  }

  function buildQuoteRequest(): BookingQuoteRequest | null {
    if (!vehicle || !selectedDriver || !route || points.length < 2) {
      return null;
    }
    const [first, second, ...extraStops] = points;
    return {
      pickup: first,
      destination: second,
      stops: extraStops,
      bookingType,
      pickupAt: bookingType === 'SCHEDULED' ? new Date(pickupAt).toISOString() : null,
      vehicle,
      driver: selectedDriver,
      route,
      filters,
    };
  }

  async function handleQuote() {
    if (!user) {
      return;
    }
    if (routeError || !route) {
      setQuoteError('A valid road route is required before a quote can be requested.');
      return;
    }
    if (balanceBlocksBooking) {
      setQuoteError('Settle your previous fare before creating another booking.');
      return;
    }
    const request = buildQuoteRequest();
    if (!request) {
      setQuoteError('Choose a vehicle and an eligible driver first.');
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      setQuote(await requestBookingQuote(user, request));
    } catch (caught) {
      setQuoteError(caught instanceof Error ? caught.message : 'Could not request a quote.');
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleConfirm() {
    if (!user || !quote) {
      return;
    }
    const request = buildQuoteRequest();
    if (!request) {
      setFormError('Your quote is missing booking details. Request a new quote.');
      return;
    }

    setConfirming(true);
    setFormError(null);
    try {
      const booking = await createBooking(user, request, quote);
      router.push(`/customer/bookings?created=${encodeURIComponent(booking.id)}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Could not create your booking.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleSettle() {
    if (!user || !settleTripId) {
      return;
    }
    setSettling(true);
    setSettleNotice(null);
    try {
      const updated = await payTrip(user, settleTripId);
      const captured = updated.finalFare?.paymentStatus === 'CAPTURED';
      if (captured) {
        setCustomer((current) => (current ? { ...current, unpaidBalance: 0 } : current));
        setSettleNotice(`Payment captured for ${settleTripId}. You can continue booking.`);
        setSettleOpen(false);
      } else {
        setSettleNotice(
          'Checkout was started but payment is not captured yet. New bookings stay blocked until verification completes.'
        );
      }
    } catch (caught) {
      setSettleNotice(caught instanceof Error ? caught.message : 'Could not start settlement.');
    } finally {
      setSettling(false);
    }
  }

  function renderPanel() {
    return (
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Customer booking studio
              </p>
              <h1 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                Plan your ride
              </h1>
            </div>
            <Stepper steps={steps} current={currentStep} className="hidden sm:flex" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-studio-muted">
            Your vehicle, your route. Veyro verifies the driver before they ever touch the wheel.
          </p>
          {isDemoDataMode ? (
            <div className="mt-4">
              <FormAlert tone="info" title="Demo booking data">
                Routes, drivers, quotes and bookings are clearly labelled previews in this browser.
              </FormAlert>
            </div>
          ) : null}
        </div>

        <section className="space-y-4 rounded-panel border border-studio-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-studio-ink">1. Route</h2>
            {provider.id === 'demo' ? <DemoBadge label="Demo map" /> : null}
          </div>
          <LocationField
            id="booking-pickup"
            label="Pickup A"
            value={pickup}
            placeholder="Search pickup location"
            provider={provider}
            onSelect={setPickup}
          />
          <LocationField
            id="booking-destination"
            label="Destination B"
            value={destination}
            placeholder="Search destination"
            provider={provider}
            onSelect={setDestination}
          />
          {stops.map((stop, index) => (
            <LocationField
              key={stop.id}
              id={`booking-stop-${index}`}
              label={`Stop ${index + 1}`}
              value={stop}
              placeholder="Search intermediate stop"
              provider={provider}
              onSelect={(place) =>
                setStops((current) => current.map((item, itemIndex) => (itemIndex === index ? place : item)))
              }
              trailing={
                <VeyroButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove stop ${index + 1}`}
                  onClick={() => setStops((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </VeyroButton>
              }
            />
          ))}
          {stops.length < 3 ? (
            <VeyroButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const origin = destination ?? pickup;
                setStops((current) => [
                  ...current,
                  {
                    id: `stop-${Date.now()}`,
                    label: 'New stop',
                    address: 'Search to set this stop',
                    position: origin?.position ?? { lat: 12.9719, lng: 77.5946 },
                  },
                ]);
              }}
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Add stop
            </VeyroButton>
          ) : (
            <p className="text-xs text-studio-muted">Maximum of three intermediate stops reached.</p>
          )}

          <div className="rounded-panel bg-studio-tint p-3 text-xs text-studio-muted">
            {routeLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                Calculating road route…
              </span>
            ) : route ? (
              <div className="space-y-1">
                <p className="font-semibold text-studio-ink">
                  {route.distanceKm} km · {route.durationMinutes} min
                </p>
                <p>{route.summary}. Confirmation stays blocked if this route fails.</p>
              </div>
            ) : (
              <p>Add a valid pickup and destination to calculate a road route.</p>
            )}
          </div>
          {routeError ? (
            <FormAlert tone="error" title="Route unavailable">
              <div className="space-y-2">
                <p>{routeError}</p>
                <VeyroButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setRouteRetry((current) => current + 1)}
                >
                  Retry route
                </VeyroButton>
              </div>
            </FormAlert>
          ) : null}
        </section>

        <section className="space-y-4 rounded-panel border border-studio-border bg-white p-4">
          <h2 className="font-display text-base font-extrabold text-studio-ink">2. Booking type</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['INSTANT', 'SCHEDULED'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setBookingType(type);
                  setQuote(null);
                  setScheduleError(null);
                }}
                aria-pressed={bookingType === type}
                className={`rounded-panel border p-3 text-left text-sm font-semibold ${
                  bookingType === type
                    ? 'border-studio-ink bg-studio-obsidian text-white'
                    : 'border-studio-border text-studio-ink'
                }`}
              >
                {type === 'INSTANT' ? 'Instant' : 'Scheduled'}
                <span className={`mt-1 block text-[11px] font-normal ${bookingType === type ? 'text-white/70' : 'text-studio-muted'}`}>
                  {type === 'INSTANT' ? 'Five-minute response window' : '4 hours to 30 days ahead'}
                </span>
              </button>
            ))}
          </div>
          {bookingType === 'SCHEDULED' ? (
            <div className="space-y-3">
              <Field
                id="booking-pickup-at"
                label="Scheduled pickup"
                required
                error={scheduleError ?? undefined}
                hint="Minimum four hours, maximum thirty days from now."
              >
                <Input
                  id="booking-pickup-at"
                  type="datetime-local"
                  value={pickupAt}
                  invalid={Boolean(scheduleError)}
                  onChange={(event) => {
                    setPickupAt(event.currentTarget.value);
                    setScheduleError(null);
                  }}
                />
              </Field>
              {broadcastWindow ? (
                <div className="flex items-start gap-2 rounded-panel bg-studio-tint p-3 text-xs text-studio-muted">
                  <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Broadcast from <strong className="text-studio-ink">{formatDateTime(broadcastWindow.startAt)}</strong>{' '}
                    to <strong className="text-studio-ink">{formatDateTime(broadcastWindow.endAt)}</strong>. No
                    unassigned live driver markers are shown for scheduled rides.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-studio-muted">
              The selected driver gets {publicPolicy.instantResponseWindowMinutes} minutes to respond.
              No driver is assigned before they accept.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-panel border border-studio-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-studio-ink">3. Vehicle pass</h2>
            {vehicle ? <CarFront aria-hidden="true" className="h-4 w-4 text-studio-ink" /> : null}
          </div>
          {customerLoading ? (
            <div className="h-32 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
          ) : vehicle ? (
            <>
              <Select
                aria-label="Choose vehicle"
                value={vehicleId}
                onChange={(event) => {
                  setVehicleId(event.currentTarget.value);
                  setQuote(null);
                }}
              >
                {customer?.vehicles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.make} {item.model} · {item.category}
                  </option>
                ))}
              </Select>
              <HolographicVehiclePass vehicle={vehicle} compact />
              <p className="text-xs text-studio-muted">
                Matching uses category and transmission. Fuel type is informational only.
              </p>
            </>
          ) : (
            <FormAlert tone="warning" title="No vehicle on file">
              Add a vehicle in your profile so eligible drivers can prepare for your ride.
            </FormAlert>
          )}
        </section>

        <section className="space-y-4 rounded-panel border border-studio-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-studio-ink">4. Eligible drivers</h2>
            {bookingType === 'SCHEDULED' ? (
              <span className="rounded-full bg-studio-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-studio-muted">
                Count only
              </span>
            ) : null}
          </div>
          <details className="rounded-panel border border-studio-border p-3">
            <summary className="cursor-pointer text-sm font-semibold text-studio-ink">
              Filters and sorting
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field id="driver-sort" label="Sort by">
                <Select
                  id="driver-sort"
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilter('sort', event.currentTarget.value as DriverSearchFilters['sort'])
                  }
                >
                  <option value="RECOMMENDED">Recommended</option>
                  <option value="CLOSEST">Closest</option>
                  <option value="LOWEST_FARE">Lowest estimated fare</option>
                  <option value="HIGHEST_RATED">Highest rated</option>
                </Select>
              </Field>
              <Field id="driver-rate" label="Max ₹/hour">
                <Input
                  id="driver-rate"
                  type="number"
                  min="0"
                  value={filters.maxHourlyRate ?? ''}
                  placeholder="Any"
                  onChange={(event) =>
                    updateFilter(
                      'maxHourlyRate',
                      event.currentTarget.value ? Number(event.currentTarget.value) : null
                    )
                  }
                />
              </Field>
              <Field id="driver-distance" label="Max pickup distance (km)">
                <Input
                  id="driver-distance"
                  type="number"
                  min="1"
                  max="50"
                  value={filters.maxPickupDistanceKm}
                  onChange={(event) =>
                    updateFilter('maxPickupDistanceKm', Number(event.currentTarget.value))
                  }
                />
              </Field>
              <Field id="driver-rating" label="Minimum rating">
                <Input
                  id="driver-rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filters.minRating}
                  onChange={(event) => updateFilter('minRating', Number(event.currentTarget.value))}
                />
              </Field>
              <Field id="driver-experience" label="Minimum experience (yrs)">
                <Input
                  id="driver-experience"
                  type="number"
                  min="0"
                  max="40"
                  value={filters.minExperienceYears}
                  onChange={(event) =>
                    updateFilter('minExperienceYears', Number(event.currentTarget.value))
                  }
                />
              </Field>
              <Field id="driver-radius" label="Search radius (km)">
                <Select
                  id="driver-radius"
                  value={filters.radiusKm}
                  onChange={(event) => updateFilter('radiusKm', Number(event.currentTarget.value))}
                >
                  <option value={15}>15 km</option>
                  <option value={25}>25 km</option>
                  <option value={40}>40 km</option>
                </Select>
              </Field>
            </div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-theme-text">Languages</legend>
              <div className="flex flex-wrap gap-2">
                {languages.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    aria-pressed={filters.languages.includes(language)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      filters.languages.includes(language)
                        ? 'border-studio-ink bg-studio-ink text-white'
                        : 'border-studio-border text-studio-muted'
                    }`}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </fieldset>
          </details>

          <VeyroButton
            type="button"
            className="w-full"
            loading={searchLoading}
            onClick={() => void handleSearchDrivers()}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            {bookingType === 'INSTANT' ? 'Find eligible drivers' : 'Check eligible drivers'}
          </VeyroButton>

          {searchError ? <FormAlert tone="error" title="Search failed">{searchError}</FormAlert> : null}

          {searched ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-studio-muted">
                <span>{drivers.length} eligible driver{drivers.length === 1 ? '' : 's'}</span>
                <span>{filters.radiusKm} km radius</span>
              </div>
              {drivers.length === 0 ? (
                <FormAlert tone="warning" title="No drivers in this radius">
                  Expand the search radius or relax your filters. You can request a wider search
                  before confirming.
                </FormAlert>
              ) : bookingType === 'SCHEDULED' ? (
                <div className="rounded-panel bg-studio-tint p-4 text-sm text-studio-ink">
                  <p className="font-semibold">
                    {drivers.length} approved drivers match this scheduled pickup.
                  </p>
                  <p className="mt-1 text-xs text-studio-muted">
                    They will be notified in the broadcast window. No individual driver is selected
                    before acceptance.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drivers.map((driver) => (
                    <DriverCard
                      key={driver.id}
                      driver={driver}
                      selected={driver.id === selectedDriverId}
                      onSelect={() => {
                        setSelectedDriverId(driver.id);
                        setQuote(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-panel border border-studio-border bg-white p-4">
          <h2 className="font-display text-base font-extrabold text-studio-ink">5. Quote & confirm</h2>
          {balanceBlocksBooking ? (
            <div className="sticky top-2 z-10 space-y-3 rounded-card border border-[color:var(--theme-warning)] bg-white/95 p-4 shadow-glass backdrop-blur">
              <FormAlert tone="warning" title="Settle previous fare">
                A confirmed unpaid balance of ₹{unpaidBalance} blocks new bookings. Razorpay is shown
                in test mode only. A timely disputed amount remains under review.
              </FormAlert>
              <VeyroButton
                type="button"
                size="sm"
                loading={settling}
                disabled={!settleTripId}
                onClick={() => setSettleOpen(true)}
              >
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                Settle Previous Fare
              </VeyroButton>
              {!settleTripId ? (
                <p className="text-xs text-studio-muted">
                  Ask support for the unpaid trip ID, or open the booking with the unpaid trip link.
                </p>
              ) : null}
              {settleNotice ? (
                <FormAlert tone="info" title="Settlement update">
                  {settleNotice}
                </FormAlert>
              ) : null}
            </div>
          ) : unpaidBalance > 0 ? (
            <FormAlert tone="info" title="Amount under review">
              ₹{unpaidBalance} is disputed and under review under the approved policy.
            </FormAlert>
          ) : null}

          {quote ? (
            <FareBreakdown
              lines={[
                { label: 'Pricing mode', amount: quote.pricingMode },
                { label: 'Hourly driver rate', amount: `₹${quote.hourlyRate}` },
                { label: 'Estimated route time', amount: `${quote.estimatedDurationMinutes} min` },
                { label: 'Estimated road distance', amount: `${quote.estimatedDistanceKm} km` },
                { label: 'Policy version', amount: quote.policyVersion },
              ]}
              total={`₹${quote.estimatedBaseFare}`}
              note={`${quote.waitingPolicy} ${quote.cancellationPolicy}`}
              exclusions={quote.exclusions}
            />
          ) : (
            <p className="rounded-panel bg-studio-tint p-4 text-xs text-studio-muted">
              {bookingType === 'INSTANT'
                ? 'Select an eligible driver to request a server-side quote. Freeze the quote snapshot before confirming.'
                : 'Check eligible drivers, then request a server-side quote. The snapshot is frozen for the scheduled booking.'}
            </p>
          )}

          {quoteError ? <FormAlert tone="error" title="Quote unavailable">{quoteError}</FormAlert> : null}
          {formError ? <FormAlert tone="error" title="Booking issue">{formError}</FormAlert> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <VeyroButton
              type="button"
              variant="secondary"
              loading={quoteLoading}
              disabled={!route || routeError !== null || balanceBlocksBooking}
              onClick={() => void handleQuote()}
            >
              Request quote
            </VeyroButton>
            <VeyroButton
              type="button"
              loading={confirming}
              disabled={!quote || balanceBlocksBooking || Boolean(routeError)}
              onClick={() => void handleConfirm()}
            >
              Confirm booking
            </VeyroButton>
          </div>
          <p className="text-[11px] leading-relaxed text-studio-muted">
            Fare calculation stays on the server. PER_KM pricing is stored but disabled in Release 1.
            Fuel, tolls and parking are paid separately by the vehicle owner.
          </p>
        </section>
      </div>
    );
  }

  return (
    <CustomerShell subtitle="Map-first booking studio">
      <div className="relative min-h-[calc(100vh-4rem)] bg-studio-bg">
        <div className="grid gap-0 lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside
            className={`fixed inset-x-0 bottom-16 z-20 max-h-[72vh] overflow-y-auto rounded-t-card border border-studio-border bg-studio-bg shadow-2xl transition-transform lg:static lg:z-auto lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:border-r lg:shadow-none ${
              sheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)]'
            }`}
          >
            <button
              type="button"
              className="sticky top-0 z-10 flex h-[4.5rem] w-full items-center justify-between border-b border-studio-border bg-studio-surface px-5 py-4 lg:hidden"
              onClick={() => setSheetExpanded((current) => !current)}
              aria-expanded={sheetExpanded}
            >
              <span className="text-left">
                <span className="block text-sm font-extrabold text-studio-ink">Plan your ride</span>
                <span className="block text-xs text-studio-muted">
                  {route ? `${route.distanceKm} km · ${route.durationMinutes} min` : 'Choose pickup and destination'}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-5 w-5 text-studio-ink transition-transform ${sheetExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={sheetExpanded ? 'block' : 'hidden lg:block'}>{renderPanel()}</div>
          </aside>

          <div className="min-h-[calc(100vh-4rem)] p-0 lg:p-5">
            <RouteMap
              points={points}
              route={route}
              loading={routeLoading}
              error={routeError}
              driverMarkers={driverMarkers}
              showDriverMarkers={bookingType === 'INSTANT' && searched}
              onPinMove={setPointPosition}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        title="Settle the previous fare?"
        description="This starts Razorpay test checkout for the unpaid trip. The backend may reject payment if the fare or account state changed."
        confirmLabel={settling ? 'Starting checkout…' : 'Start test checkout'}
        onConfirm={() => void handleSettle()}
      >
        <p className="text-sm text-studio-muted">
          Trip {settleTripId}. Fuel, tolls and parking stay outside the driver-service fare.
        </p>
      </ConfirmDialog>
    </CustomerShell>
  );
}
