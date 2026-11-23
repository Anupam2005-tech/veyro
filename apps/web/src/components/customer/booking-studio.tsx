'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  CalendarClock,
  CarFront,
  Check,
  Clock,
  Clock3,
  CreditCard,
  Filter,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  FareBreakdown,
  Field,
  FormAlert,
  Input,
  Select,
  VeyroButton,
} from '@veyro/ui';
import {
  createBooking,
  getCustomerDetails,
  payInvoice,
  requestBookingQuote,
  requestRoadPreview,
  searchDrivers,
} from '@/lib/api/client';
import { checkCheckout, paymentStatusMessage, type CheckoutStatus } from '@/lib/api/razorpay-checkout';
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
import { usePolling } from '@/lib/hooks/use-polling';
import { getMapsProvider } from '@/lib/maps';
import type { Coordinate, MapsProvider, PlaceOption, PlaceSuggestion, RoutePreview } from '@/lib/maps';
import { publicPolicy } from '@/lib/public-policy';
import { CustomerShell } from './customer-shell';
import RouteMap from './route-map-dynamic';

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
  biasLocation?: Coordinate | null;
  onSelect: (place: PlaceOption) => void;
  trailing?: React.ReactNode;
  onValidityChange?: (valid: boolean) => void;
}

function LocationField({
  id,
  label,
  value,
  placeholder,
  provider,
  biasLocation,
  onSelect,
  trailing,
  onValidityChange,
}: LocationFieldProps) {
  const [query, setQuery] = React.useState(value?.label ?? '');
  const [options, setOptions] = React.useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const validity = React.useRef(onValidityChange); validity.current = onValidityChange;

  React.useEffect(() => {
    setQuery(value?.label ?? '');
    if (value) validity.current?.(true);
  }, [value]);

  React.useEffect(() => {
    if (!open) {
      setOptions([]);
      return;
    }

    let active = true;
    setLoading(true);
    setLookupError(null);
    const timer = window.setTimeout(() => {
      provider
        .searchPlaces(query, biasLocation)
        .then((results) => {
          if (active) {
            setOptions(results);
          }
        })
        .catch((caught: unknown) => {
          if (active) {
            setLookupError(caught instanceof Error ? caught.message : 'Place search failed.');
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
  }, [open, provider, query, biasLocation]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-[#090B10]">
          {label}
        </label>
      </div>
      <div className="relative flex items-center gap-1.5">
        <div className="pointer-events-none absolute left-3 flex items-center text-[#5A6070]">
          <MapPin className="h-3.5 w-3.5" />
        </div>
        <input
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
            validity.current?.(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={event => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'ArrowDown') { event.preventDefault(); document.getElementById(`${id}-suggestions`)?.querySelector('button')?.focus(); }
          }}
          className="w-full rounded-xl border border-[#DCD8CC] bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#090B10] placeholder:text-[#9A9EA8] transition-colors focus:border-[#090B10] focus:outline-none focus:ring-1 focus:ring-[#090B10]"
        />
        {trailing}
      </div>

      {open && options.length > 0 ? (
        <ul
          id={`${id}-suggestions`}
          aria-label={`${label} suggestions`}
          role="listbox"
          onKeyDown={event => {
            if (event.key === 'Escape') { setOpen(false); document.getElementById(id)?.focus(); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); const choices = [...event.currentTarget.querySelectorAll('button')];
              const index = choices.indexOf(document.activeElement as HTMLButtonElement);
              choices[(index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length]?.focus();
            }
          }}
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#EAE7DC] bg-white shadow-xl"
        >
          {options.map((option) => (
            <li key={option.id} role="presentation">
              <button
                type="button" role="option" aria-selected={value?.id === option.id}
                className="w-full px-3.5 py-2.5 text-left hover:bg-[#FAF9F5] border-b border-[#F4F1EA] last:border-b-0 transition-colors"
                onMouseDown={(event) => event.preventDefault()}
                onClick={async () => {
                  setLoading(true); setLookupError(null);
                  try {
                    const resolved = option.position ? { ...option, position: option.position } : await provider.resolvePlace?.(option);
                    if (!resolved) throw new Error('Select a place with usable coordinates.');
                    onSelect(resolved); validity.current?.(true); setQuery(resolved.label); setOpen(false); setOptions([]);
                  } catch (e) { setLookupError(e instanceof Error ? e.message : 'Place selection failed.'); }
                  finally { setLoading(false); }
                }}
              >
                <span className="block text-xs sm:text-sm font-semibold text-[#090B10]">{option.label}</span>
                <span className="block truncate text-[11px] text-[#6A7080]">{option.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {lookupError ? <p role="alert" className="mt-1 text-xs text-red-700">{lookupError}</p> : null}
      {loading ? (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6A7080]">
          <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:animate-none" />
          Searching places…
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
      className={`w-full rounded-xl border p-3.5 text-left transition-all ${
        selected
          ? 'border-[#090B10] bg-[#090B10] text-white shadow-md'
          : 'border-[#EAE7DC] bg-white text-[#090B10] hover:border-[#090B10] hover:bg-[#FAF9F5]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold truncate">{driver.name}</p>
          <p className={`mt-0.5 text-[11px] ${selected ? 'text-white/70' : 'text-[#6A7080]'}`}>
            {driver.experienceYears} yrs experience · {driver.languages.slice(0, 2).join(', ')}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${selected ? 'bg-white/15 text-[#B8F23A]' : 'bg-[#FAF9F5] text-[#090B10] border border-[#E5E1D5]'}`}>
          <Star aria-hidden="true" className="h-3 w-3 fill-current" />
          {driver.rating}
        </span>
      </div>

      <div className={`mt-2.5 grid grid-cols-3 gap-2 border-t pt-2.5 text-[11px] ${selected ? 'border-white/15' : 'border-[#EAE7DC]'}`}>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Wallet aria-hidden="true" className="h-3 w-3 opacity-70" /> ₹{driver.hourlyRate}/h
        </span>
        <span className="inline-flex items-center gap-1">
          <Navigation aria-hidden="true" className="h-3 w-3 opacity-70" /> {driver.pickupDistanceKm} km
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 aria-hidden="true" className="h-3 w-3 opacity-70" /> {driver.responseEtaMinutes}m ETA
        </span>
      </div>

      <div className={`mt-2 flex items-center justify-between text-[10px] ${selected ? 'text-white/70' : 'text-[#6A7080]'}`}>
        <span className="inline-flex items-center gap-1 font-medium">
          <BadgeCheck aria-hidden="true" className={`h-3 w-3 ${selected ? 'text-[#B8F23A]' : 'text-[#16A34A]'}`} /> Verified Driver
        </span>
        {selected ? (
          <span className="inline-flex items-center gap-1 font-bold text-[#B8F23A]">
            Selected <Check aria-hidden="true" className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function BookingStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const provider = React.useMemo(() => getMapsProvider(), []);
  const [customer, setCustomer] = React.useState<CustomerProfileDetails | null>(null);
  const [customerLoading, setCustomerLoading] = React.useState(true);
  const [vehicleId, setVehicleId] = React.useState('');
  const [userLocation, setUserLocation] = React.useState<Coordinate | null>(null);
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
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [settling, setSettling] = React.useState(false);
  const [settleNotice, setSettleNotice] = React.useState<{ message: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const [settleResult, setSettleResult] = React.useState<{ invoiceId: string; status: CheckoutStatus } | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const [pendingPlaces, setPendingPlaces] = React.useState<Record<string, boolean>>({});
  const vehicle = customer?.vehicles.find((item) => item.id === vehicleId) ?? customer?.vehicles[0] ?? null;
  const activeVehicleId = vehicle?.id;
  const hasUnresolvedPlaces = pendingPlaces['booking-pickup'] || pendingPlaces['booking-destination'] || stops.some(stop => pendingPlaces['booking-stop-' + stop.id]);
  const placeValidity = (id: string, valid: boolean) => setPendingPlaces(current => current[id] === !valid ? current : { ...current, [id]: !valid });

  const balancePreview = isDemoDataMode && searchParams.get('balance') === '1';
  const unpaidBalance = balancePreview ? 187 : customer?.unpaidBalance ?? 0;
  const balanceBlocksBooking = unpaidBalance > 0 && !customer?.disputedAmountUnderReview;
  const settleTripId =
    (isDemoDataMode ? searchParams.get('unpaidTrip') : customer?.unpaidInvoiceId) ?? (balancePreview ? 'VEY-DEMO-1987' : '');
  const settleStatus = settleResult?.invoiceId === settleTripId ? settleResult.status : null;

  usePolling(user && !isDemoDataMode && !settling && settleStatus === 'PENDING' ? `${user.uid}:${settleTripId}` : null,
    () => getCustomerDetails(user!),
    next => {
      setCustomer(next);
      if (next.unpaidInvoiceId !== settleTripId) {
        setSettleResult(null);
        setSettleNotice({ tone: 'info', message: 'Your outstanding balance has been updated.' });
      }
    }, () => {}, 10_000);

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

  const [gpsLoading, setGpsLoading] = React.useState(false);

  const handleUseGps = React.useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        try {
          const address = await provider.reverseGeocode(coords);
          setPickup({
            id: `gps-${Date.now()}`,
            label: address.split(',')[0] || 'Current GPS Location',
            address,
            position: coords,
          });
        } catch {
          setPickup({
            id: `gps-${Date.now()}`,
            label: 'Current GPS Location',
            address: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            position: coords,
          });
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setFormError('Location access failed. Choose a pickup address instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [provider]);

  React.useEffect(() => {
    if (pickup) {
      return;
    }
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          try {
            const address = await provider.reverseGeocode(coords);
            setPickup({
              id: 'gps-current-location',
              label: address.split(',')[0] || 'Current Location',
              address,
              position: coords,
            });
          } catch {
            setPickup({
              id: 'gps-current-location',
              label: 'Current Location',
              address: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
              position: coords,
            });
          }
        },
        () => {
          if (!isDemoDataMode) { setFormError('Choose a pickup address or enable location access.'); return; }
          setPickup({
            id: 'default-pickup',
            label: 'MG Road, Bangalore',
            address: 'MG Road, Bengaluru, Karnataka, India',
            position: { lat: 12.9719, lng: 77.5946 },
          });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else if (isDemoDataMode) {
      setPickup({
        id: 'default-pickup',
        label: 'MG Road, Bangalore',
        address: 'MG Road, Bengaluru, Karnataka, India',
        position: { lat: 12.9719, lng: 77.5946 },
      });
    }
  }, [pickup, provider]);

  const points = React.useMemo(
    () => [pickup, ...stops, destination].filter((point): point is PlaceOption => Boolean(point)),
    [destination, pickup, stops]
  );

  const pointsKey = points
    .map((point) => `${point.position.lat.toFixed(5)}:${point.position.lng.toFixed(5)}`)
    .join('|');

  React.useEffect(() => {
    if (points.length < 2 || hasUnresolvedPlaces || (!isDemoDataMode && (!user || !activeVehicleId))) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    let active = true;
    setRouteLoading(true);
    const timer = window.setTimeout(() => {
      (isDemoDataMode ? provider.getRoute(points.map(point => point.position)) : requestRoadPreview(user!, activeVehicleId!, points.map(point => point.position)))
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
  }, [points, pointsKey, provider, routeRetry, activeVehicleId, user, hasUnresolvedPlaces]);


  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? null;

  const driverMarkers = React.useMemo(
    () => {
      if (isDemoDataMode) {
        return drivers.map((driver, index) => ({
          id: driver.id,
          label: driver.name,
          position: {
            lat: (pickup?.position.lat ?? 12.9719) + ((index % 3) - 1) * 0.006,
            lng: (pickup?.position.lng ?? 77.6412) + (Math.floor(index / 3) - 0.5) * 0.008,
          },
        }));
      }
      return drivers
        .filter((driver) => driver.position != null)
        .map((driver) => ({
          id: driver.id,
          label: `${driver.name} (₹${driver.hourlyRate}/hr)`,
          position: driver.position!,
        }));
    },
    [drivers, pickup]
  );

  const fingerprint = JSON.stringify({ pickup, destination, stops, vehicleId, bookingType, pickupAt, filters, selectedDriverId });
  const requestContext = React.useRef(fingerprint); requestContext.current = fingerprint;
  const quoteContext = React.useRef('');
  React.useEffect(() => { setQuote(null); }, [fingerprint]);

  const broadcastWindow = pickupAt ? getBroadcastWindow(pickupAt) : null;

  const setPointPosition = React.useCallback((index: number, position: Coordinate) => {
    const apply = (address: string) => {
      const label = address.split(',')[0] || 'Pinned location';
      if (index === 0) {
        setPickup((current) => (current ? { ...current, position, address, label } : current));
        return;
      }
      if (index === points.length - 1) {
        setDestination((current) => (current ? { ...current, position, address, label } : current));
        return;
      }
      const stopIndex = index - 1;
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
  }, [points.length, provider]);

  function updateFilter<K extends keyof DriverSearchFilters>(key: K, value: DriverSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'radiusKm' ? { maxPickupDistanceKm: Number(value) } : {}) }));
    setDrivers([]);
    setSelectedDriverId('');
    setSearched(false);
    setQuote(null);
  }

  async function handleSearchDrivers() {
    if (!user || !vehicle || !pickup || !destination) {
      setSearchError('Add an owned vehicle and choose pickup and destination.');
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
      const context = requestContext.current;
      const results = await searchDrivers(user, vehicle, filters, { points: [pickup, ...stops, destination].map(p => p.position), pickupAt: bookingType === 'SCHEDULED' ? Date.parse(pickupAt) : null });
      if (context !== requestContext.current) return;
      setDrivers(results);
      setSelectedDriverId(results[0]?.id ?? '');
      setSearched(true);
      setQuote(null);
      if (results.length === 0) {
        setSearchError(
          `No drivers found within ${filters.radiusKm} km of your pickup. Try expanding the search radius, selecting a different vehicle category, or checking back shortly.`
        );
      }
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : 'Driver search failed.');
    } finally {
      setSearchLoading(false);
    }
  }

  function buildQuoteRequest(): BookingQuoteRequest | null {
    if (hasUnresolvedPlaces || !vehicle || !route || points.length < 2 || (!selectedDriver && bookingType === 'INSTANT')) {
      return null;
    }
    return {
      pickup: pickup!,
      destination: destination!,
      stops,
      bookingType,
      pickupAt: bookingType === 'SCHEDULED' ? new Date(pickupAt).toISOString() : null,
      vehicle,
      driver: selectedDriver ?? { id: '', name: 'Driver assigned after acceptance', hourlyRate: filters.maxHourlyRate ?? 0, rating: 0, reviews: 0, experienceYears: 0, languages: [], pickupDistanceKm: 0, responseEtaMinutes: 0, verified: false, vehicle },
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
      setQuoteError('Choose a driver first.');
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      if (bookingType === 'SCHEDULED') {
        const invalid = validateScheduledPickup(pickupAt);
        if (invalid) throw new Error(invalid);
        if (filters.maxHourlyRate == null || filters.maxHourlyRate < 0) throw new Error('Set a maximum hourly rate for the scheduled broadcast.');
      }
      const context = requestContext.current;
      const result = await requestBookingQuote(user, request);
      if (context === requestContext.current) { setQuote(result); quoteContext.current = context; }
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
    if (!request || quoteContext.current !== requestContext.current || Date.now() >= Date.parse(quote.expiresAt)) {
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

  async function handleSettle(checkOnly = false) {
    if (!user || !settleTripId || settling) return;
    // Release the confirmation dialog's focus trap before Razorpay opens its modal.
    setSettleOpen(false);
    setSettling(true);
    setSettleNotice(null);
    try {
      const status = checkOnly ? await checkCheckout(user, settleTripId) : await payInvoice(user, settleTripId);
      setSettleResult({ invoiceId: settleTripId, status });
      setSettleNotice({ tone: status === 'CAPTURED' ? 'success' : 'info', message: paymentStatusMessage(status) });
      if (status === 'CAPTURED' || status === 'DISPUTED') {
        try { setCustomer(await getCustomerDetails(user)); }
        catch { setSettleNotice({ tone: 'info', message: paymentStatusMessage(status) + ' Reload to refresh your balance.' }); }
      }
    } catch (caught) {
      setSettleNotice({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not check the payment.' });
    } finally {
      setSettling(false);
    }
  }

  return (
    <CustomerShell>
      {/* 70-30 Screen Split Layout: 70% Map (Left), 30% Booking Console (Right) */}
      <div className="relative h-[calc(100vh-4rem)] w-full flex flex-col lg:flex-row bg-[#FAF9F5] overflow-hidden">
        {/* =========================================================================
            LEFT 70%: THE ACTUAL GOOGLE MAP API & ROAD SIMULATION
            ========================================================================= */}
        <section className="w-full lg:w-[70%] h-[45vh] lg:h-full relative border-r border-[#EAE7DC] order-2 lg:order-1 flex-1">
          <RouteMap
            className="w-full h-full rounded-none border-0"
            points={points}
            route={route}
            loading={routeLoading}
            error={routeError}
            driverMarkers={driverMarkers}
            showDriverMarkers={searched && drivers.length > 0}
            onPinMove={setPointPosition}
          />
        </section>

        {/* =========================================================================
            RIGHT 30%: "GET YOUR DRIVER" SEARCHING & ON-DEMAND BOOKING CONSOLE
            ========================================================================= */}
        <aside className="w-full lg:w-[30%] min-w-[340px] xl:min-w-[380px] 2xl:min-w-[420px] bg-white border-l border-[#EAE7DC] h-[55vh] lg:h-full overflow-y-auto p-5 sm:p-6 flex flex-col justify-between order-1 lg:order-2 shadow-[-6px_0_20px_rgba(0,0,0,0.02)] z-10">
          <div className="space-y-5">
            {/* Header: "Get your driver" */}
            <div className="border-b border-[#EAE7DC] pb-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4F1EA] border border-[#E5E1D5] text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#090B10]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  <span>On-Demand Chauffeur</span>
                </div>
                {isDemoDataMode ? <DemoBadge label="Demo Map" /> : null}
              </div>
              <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-extrabold text-[#090B10] tracking-tight">
                Get your driver
              </h1>
              <p className="mt-1 text-xs text-[#5A6070] leading-relaxed">
                Your car, your keys. Verified independent chauffeurs on your schedule.
              </p>
            </div>

            {/* Google Console Place Searching */}
            <div className="space-y-3 rounded-2xl bg-[#FAF9F5] p-3.5 border border-[#EAE7DC]">
              <LocationField
                id="booking-pickup"
                label="Pickup Location"
                value={pickup}
                placeholder="Search pickup address"
                provider={provider}
                biasLocation={userLocation ?? pickup?.position ?? null}
                onSelect={setPickup}
                onValidityChange={valid => placeValidity('booking-pickup', valid)}
                trailing={
                  <button
                    type="button"
                    onClick={handleUseGps}
                    title="Use current GPS location"
                    className="px-2.5 py-2 rounded-xl bg-white border border-[#DCD8CC] text-[#090B10] hover:bg-[#FAF9F5] hover:border-[#090B10] transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold shadow-2xs"
                  >
                    <LocateFixed className={`h-3.5 w-3.5 ${gpsLoading ? 'animate-spin text-[#16A34A]' : 'text-[#090B10]'}`} />
                    <span className="hidden sm:inline text-[11px]">GPS</span>
                  </button>
                }
              />
              <LocationField
                id="booking-destination"
                label="Destination"
                value={destination}
                placeholder="Search destination address"
                provider={provider}
                biasLocation={userLocation ?? pickup?.position ?? null}
                onSelect={setDestination}
                onValidityChange={valid => placeValidity('booking-destination', valid)}
              />

              {/* Intermediate stops if added */}
              {stops.map((stop, index) => (
                <LocationField
                  key={stop.id}
                  id={`booking-stop-${stop.id}`}
                  onValidityChange={valid => placeValidity(`booking-stop-${stop.id}`, valid)}
                  label={`Stop ${index + 1}`}
                  value={stop}
                  placeholder="Search intermediate stop"
                  provider={provider}
                  biasLocation={userLocation ?? pickup?.position ?? null}
                  onSelect={(place) =>
                    setStops((current) => current.map((item, itemIndex) => (itemIndex === index ? place : item)))
                  }
                  trailing={
                    <button
                      type="button"
                      aria-label={`Remove stop ${index + 1}`}
                      onClick={() => setStops((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="p-2 text-[#5A6070] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                />
              ))}

              <div className="flex items-center justify-between pt-1">
                {stops.length < 3 ? (
                  <button
                    type="button"
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
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#090B10] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add intermediate stop</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#7A8090]">Max 3 stops</span>
                )}

                {/* Subtle vehicle indicator (replaces holographic pass with zero clutter) */}
                {customer?.vehicles && customer.vehicles.length > 1 ? (
                  <select
                    aria-label="Assigned vehicle"
                    value={vehicleId}
                    onChange={(e) => {
                      setVehicleId(e.target.value);
                      setQuote(null);
                    }}
                    className="text-xs font-bold text-[#090B10] bg-transparent border-0 underline cursor-pointer"
                  >
                    {customer.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                ) : vehicle ? (
                  <span className="text-[11px] font-semibold text-[#5A6070]">
                    {vehicle.make} {vehicle.model}
                  </span>
                ) : null}
              </div>

              {/* Route Summary Pill */}
              {routeLoading ? (
                <div className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs text-[#5A6070] border border-[#EAE7DC]">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  <span>Calculating route…</span>
                </div>
              ) : route ? (
                <div className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs border border-[#EAE7DC]">
                  <span className="font-bold text-[#090B10]">
                    {route.distanceKm} km · {route.durationMinutes} min
                  </span>
                  <span className="text-[11px] text-[#5A6070] truncate max-w-[140px]">{route.summary}</span>
                </div>
              ) : null}

              {routeError ? (
                <div className="rounded-xl bg-[#FFF0F3] p-2.5 text-xs text-[#A6002A] border border-[#FFD0D8] flex items-center justify-between">
                  <span className="truncate">{routeError}</span>
                  <button
                    type="button"
                    onClick={() => setRouteRetry((c) => c + 1)}
                    className="font-bold underline text-[11px] shrink-0 ml-2"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>

            {/* Booking Option: Instant vs Scheduled */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#090B10]">
                Dispatch Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('INSTANT');
                    setQuote(null);
                    setScheduleError(null);
                  }}
                  aria-pressed={bookingType === 'INSTANT'}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    bookingType === 'INSTANT'
                      ? 'border-[#090B10] bg-[#090B10] text-white shadow-xs'
                      : 'border-[#EAE7DC] bg-white text-[#090B10] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <Zap className={`h-3.5 w-3.5 ${bookingType === 'INSTANT' ? 'text-[#B8F23A]' : 'text-[#090B10]'}`} />
                    <span>Instant</span>
                  </div>
                  <span className={`mt-0.5 block text-[11px] ${bookingType === 'INSTANT' ? 'text-white/70' : 'text-[#6A7080]'}`}>
                    5-min driver response
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookingType('SCHEDULED');
                    setQuote(null);
                    setScheduleError(null);
                  }}
                  aria-pressed={bookingType === 'SCHEDULED'}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    bookingType === 'SCHEDULED'
                      ? 'border-[#090B10] bg-[#090B10] text-white shadow-xs'
                      : 'border-[#EAE7DC] bg-white text-[#090B10] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <CalendarClock className={`h-3.5 w-3.5 ${bookingType === 'SCHEDULED' ? 'text-[#B8F23A]' : 'text-[#090B10]'}`} />
                    <span>Scheduled</span>
                  </div>
                  <span className={`mt-0.5 block text-[11px] ${bookingType === 'SCHEDULED' ? 'text-white/70' : 'text-[#6A7080]'}`}>
                    4h to 30 days ahead
                  </span>
                </button>
              </div>

              {/* Dynamic Scheduled Pickup Field */}
              {bookingType === 'SCHEDULED' ? (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <label htmlFor="scheduled-pickup-time" className="block text-[11px] font-bold text-[#090B10]">
                    Select Pickup Date & Time
                  </label>
                  <input
                    id="scheduled-pickup-time"
                    type="datetime-local"
                    value={pickupAt}
                    onChange={(event) => {
                      setPickupAt(event.currentTarget.value);
                      setScheduleError(null);
                    }}
                    className="w-full rounded-xl border border-[#DCD8CC] bg-white px-3.5 py-2 text-xs sm:text-sm text-[#090B10] focus:border-[#090B10] focus:outline-none"
                  />
                  {scheduleError ? (
                    <p className="text-xs text-[#DC2626]">{scheduleError}</p>
                  ) : null}
                  {broadcastWindow ? (
                    <div className="rounded-xl bg-[#FAF9F5] border border-[#EAE7DC] p-2.5 text-[11px] text-[#5A6070] flex items-start gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#090B10]" />
                      <p>
                        Broadcast window: <strong>{formatDateTime(broadcastWindow.startAt)}</strong> to{' '}
                        <strong>{formatDateTime(broadcastWindow.endAt)}</strong>.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!vehicle && !customerLoading ? <FormAlert tone="warning" title="Add your vehicle"><Link href="/customer/profile" className="underline">Add an owned vehicle to continue booking.</Link></FormAlert> : null}
            {bookingType === 'SCHEDULED' ? <Field id="scheduled-rate-cap" label="Maximum hourly rate (₹)"><Input id="scheduled-rate-cap" type="number" min="0" value={filters.maxHourlyRate ?? ''} onChange={e => updateFilter('maxHourlyRate', e.currentTarget.value === '' ? null : Number(e.currentTarget.value))} /></Field> : null}
            {/* Search Trigger Button (Always present before search) */}
            <VeyroButton
              type="button"
              className="w-full bg-[#090B10] text-white hover:bg-black rounded-xl h-11 text-xs sm:text-sm font-bold shadow-xs active:scale-[0.99]"
              loading={searchLoading}
              disabled={hasUnresolvedPlaces || !vehicle || !route || routeLoading}
              onClick={() => void handleSearchDrivers()}
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {bookingType === 'INSTANT' ? 'Find drivers in pickup area' : 'Check available drivers'}
            </VeyroButton>

            {searchError ? (
              <FormAlert tone="error" title="Search failed" className="border-[#FFD0D8] bg-[#FFF0F3] text-[#A6002A]">
                {searchError}
              </FormAlert>
            ) : null}

            {/* =====================================================================
                DRIVER RESULTS & FILTRATION (Shown ONLY when actual drivers are present)
                ===================================================================== */}
            {searched && drivers.length > 0 ? (
              <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#090B10]">{drivers.length} drivers found</span>
                    <span className="text-[11px] text-[#7A8090]">({filters.radiusKm} km radius)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#090B10] hover:underline"
                  >
                    <Filter className="h-3 w-3" />
                    <span>{showFilters ? 'Hide filters' : 'Filters'}</span>
                  </button>
                </div>

                {/* Optional Filters */}
                {showFilters ? (
                  <div className="rounded-xl border border-[#EAE7DC] bg-[#FAF9F5] p-3 space-y-2.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label htmlFor="filter-sort" className="block text-[10px] font-bold text-[#090B10] uppercase">
                          Sort by
                        </label>
                        <select
                          id="filter-sort"
                          value={filters.sort}
                          onChange={(e) => updateFilter('sort', e.target.value as DriverSearchFilters['sort'])}
                          className="mt-1 w-full rounded-lg border border-[#DCD8CC] bg-white p-1.5 text-xs text-[#090B10]"
                        >
                          <option value="RECOMMENDED">Recommended</option>
                          <option value="CLOSEST">Closest</option>
                          <option value="LOWEST_FARE">Lowest fare</option>
                          <option value="HIGHEST_RATED">Highest rated</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="filter-radius" className="block text-[10px] font-bold text-[#090B10] uppercase">
                          Radius
                        </label>
                        <select
                          id="filter-radius"
                          value={filters.radiusKm}
                          onChange={(e) => updateFilter('radiusKm', Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-[#DCD8CC] bg-white p-1.5 text-xs text-[#090B10]"
                        >
                          <option value={15}>15 km</option>
                          <option value={25}>25 km</option>
                          <option value={40}>40 km</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Driver List */}
                {bookingType === 'SCHEDULED' ? (
                  <div className="rounded-xl bg-[#FAF9F5] border border-[#EAE7DC] p-3.5 text-xs text-[#090B10]">
                    <p className="font-bold">{drivers.length} currently eligible drivers. Availability is checked again during broadcast.</p>
                    <p className="mt-1 text-[11px] text-[#5A6070]">
                      The first to accept in your broadcast window will be assigned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
            ) : searched && drivers.length === 0 ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E] space-y-1.5">
                <p className="font-bold">No active drivers within {filters.radiusKm} km.</p>
                <p className="text-[11px] text-[#A16207]">Try expanding your search radius to find drivers further away.</p>
                <button
                  type="button"
                  onClick={() => {
                    updateFilter('radiusKm', 25);
                  }}
                  className="font-bold underline text-[#92400E] hover:text-black block pt-1"
                >
                  Expand radius to 25 km →
                </button>
              </div>
            ) : null}

            {/* Server Quote & Confirmation */}
            {quote ? (
              <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                <FareBreakdown
                  lines={[
                    { label: 'Pricing mode', amount: quote.pricingMode },
                    { label: 'Hourly rate', amount: `₹${quote.hourlyRate}/h` },
                    { label: 'Estimated duration', amount: `${quote.estimatedDurationMinutes} min` },
                    { label: 'Distance', amount: `${quote.estimatedDistanceKm} km` },
                  ]}
                  total={`₹${quote.estimatedBaseFare}`}
                  note={`${quote.waitingPolicy} ${quote.cancellationPolicy}`}
                  exclusions={quote.exclusions}
                />
              </div>
            ) : null}

            {quoteError ? <FormAlert tone="error" title="Quote issue">{quoteError}</FormAlert> : null}
            {formError ? <FormAlert tone="error" title="Booking error">{formError}</FormAlert> : null}
          </div>

          {/* Action CTAs at bottom of panel */}
          <div className="mt-6 pt-4 border-t border-[#EAE7DC] space-y-2">
            {!quote ? (
              <VeyroButton
                type="button"
                variant="secondary"
                className="w-full h-11 rounded-xl border border-[#DCD8CC] bg-[#FAF9F5] text-[#090B10] hover:bg-[#F4F1EA] text-xs sm:text-sm font-bold"
                loading={quoteLoading}
                disabled={hasUnresolvedPlaces || !vehicle || !route || Boolean(routeError) || balanceBlocksBooking || (!selectedDriver && bookingType === 'INSTANT')}
                onClick={() => void handleQuote()}
              >
                Get Fare Quote
              </VeyroButton>
            ) : (
              <VeyroButton
                type="button"
                className="w-full h-12 rounded-xl bg-[#090B10] text-white hover:bg-black font-extrabold text-sm shadow-md active:scale-[0.99]"
                loading={confirming}
                disabled={balanceBlocksBooking}
                onClick={() => void handleConfirm()}
              >
                Confirm Chauffeur Booking
              </VeyroButton>
            )}

            {balanceBlocksBooking ? (
              <div className="pt-2">
                <FormAlert tone="warning" title="Outstanding Balance">
                  ₹{unpaidBalance} pending. Settle to unblock bookings.
                </FormAlert>
                {settleTripId && !['PENDING', 'CAPTURED', 'DISPUTED', 'REVIEW_REQUIRED'].includes(settleStatus ?? '') ? <VeyroButton
                  type="button"
                  size="sm"
                  className="w-full mt-2"
                  loading={settling}
                  onClick={() => setSettleOpen(true)}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Settle Previous Fare
                </VeyroButton> : null}
                {!isDemoDataMode && settleTripId ? <VeyroButton type="button" variant="secondary" size="sm"
                  className="mt-2 w-full" loading={settling} onClick={() => void handleSettle(true)}>
                  Check payment status
                </VeyroButton> : null}
              </div>
            ) : null}
            {settleNotice ? <FormAlert tone={settleNotice.tone} title="Payment status">{settleNotice.message}</FormAlert> : null}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        title="Settle previous fare"
        description="Starts Razorpay test checkout for unpaid trip."
        confirmLabel={settling ? 'Starting checkout…' : 'Start checkout'}
        onConfirm={() => void handleSettle()}
      >
        <p className="text-xs text-[#5A6070]">Invoice {settleTripId}</p>
      </ConfirmDialog>
    </CustomerShell>
  );
}
