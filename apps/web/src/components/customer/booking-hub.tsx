'use client';

import * as React from 'react';
import { usePolling } from '@/lib/hooks/use-polling';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Clock3,
  MapPin,
  Navigation,
  UserRound,
  ShieldCheck,
  CheckCircle2,
  Compass,
  Route,
  Receipt,
  Phone,
  XCircle,
} from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  Field,
  FormAlert,
  Select,
  VeyroButton,
} from '@veyro/ui';
import { cancelBooking, listBookings, listFavouriteDriverIds } from '@/lib/api/client';
import type { BookingRecord, BookingStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { formatDateTime } from '@/lib/booking/policy';
import { isDemoDataMode } from '@/lib/env';
import { CustomerShell } from './customer-shell';

type Tab = 'active' | 'upcoming' | 'past' | 'favourites';

const statusConfig: Record<
  BookingStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  EXPIRED: { label: 'Offer expired', bg: 'bg-[#FEF2F2]', text: 'text-[#B91C1C]', dot: 'bg-[#EF4444]', border: 'border-[#FECACA]' },
  NEEDS_REBOOK: { label: 'Needs rebooking', bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', dot: 'bg-[#F59E0B]', border: 'border-[#FDE68A]' },
  SCHEDULED_QUEUED: { label: 'Scheduled · broadcast queued', bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', dot: 'bg-[#3B82F6]', border: 'border-[#BFDBFE]' },
  SCHEDULED_BROADCASTING: { label: 'Scheduled · finding a driver', bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', dot: 'bg-[#F59E0B]', border: 'border-[#FDE68A]' },
  AWAITING_DRIVER: {
    label: 'Awaiting Driver',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    border: 'border-[#FDE68A]',
  },
  ACCEPTED: {
    label: 'Chauffeur Assigned',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    dot: 'bg-[#3B82F6]',
    border: 'border-[#BFDBFE]',
  },
  EN_ROUTE: {
    label: 'Driver En Route',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    dot: 'bg-[#22C55E]',
    border: 'border-[#BBF7D0]',
  },
  ACTIVE: {
    label: 'Trip in Progress',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    dot: 'bg-[#22C55E]',
    border: 'border-[#BBF7D0]',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-[#F8FAFC]',
    text: 'text-[#475569]',
    dot: 'bg-[#94A3B8]',
    border: 'border-[#E2E8F0]',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    dot: 'bg-[#EF4444]',
    border: 'border-[#FECACA]',
  },
};

const cancellationReasons = ['PLANS_CHANGED', 'PICKUP_OR_TIME_ISSUE', 'DRIVER_DELAYED', 'DRIVER_NO_SHOW', 'TECHNICAL_ISSUE', 'OTHER'] as const;

function groupBookings(
  bookings: BookingRecord[],
  favouriteDriverIds: string[]
): Record<Tab, BookingRecord[]> {
  const groups: Record<Tab, BookingRecord[]> = {
    active: [],
    upcoming: [],
    past: [],
    favourites: [],
  };

  bookings.forEach((booking) => {
    if (
      booking.status === 'COMPLETED' &&
      booking.driver &&
      favouriteDriverIds.includes(booking.driver.id)
    ) {
      groups.favourites.push(booking);
    }
    if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'NEEDS_REBOOK'].includes(booking.status)) {
      groups.past.push(booking);
      return;
    }
    if (
      booking.status === 'EN_ROUTE' ||
      booking.status === 'ACTIVE' ||
      (booking.status === 'AWAITING_DRIVER' && booking.bookingType === 'INSTANT')
    ) {
      groups.active.push(booking);
      return;
    }
    groups.upcoming.push(booking);
  });

  return groups;
}

function FlagshipBookingCard({
  booking,
  onCancel,
}: {
  booking: BookingRecord;
  onCancel: (booking: BookingRecord) => void;
}) {
  const cfg = statusConfig[booking.status] ?? statusConfig.AWAITING_DRIVER;
  const canCancel = !['COMPLETED', 'CANCELLED', 'EXPIRED', 'NEEDS_REBOOK'].includes(booking.status);
  const isActive = booking.status === 'ACTIVE' || booking.status === 'EN_ROUTE';

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-[#EAE7DC] bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#DCD8CC] transition-all">
      {/* Subtle luxury ambient accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isActive
            ? 'bg-[#16A34A]'
            : booking.status === 'COMPLETED'
            ? 'bg-[#090B10]'
            : booking.status === 'CANCELLED'
            ? 'bg-[#EF4444]'
            : 'bg-[#C9A86A]'
        }`}
      />

      <div className="flex flex-col gap-6">
        {/* Top Header: Booking ID, Badge & Fare */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F4F1EA] pb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold tracking-wider text-[#5A6070] bg-[#FAF9F5] px-2.5 py-1 rounded-lg border border-[#EAE7DC]">
              #{booking.id.slice(-8).toUpperCase()}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${isActive ? 'animate-ping' : ''}`} />
              {cfg.label}
            </span>
          </div>

          <div className="text-right">
            <p className="font-display text-xl sm:text-2xl font-black text-[#090B10] tracking-tight">
              ₹{booking.quote.estimatedBaseFare}
            </p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#7A8090]">
              {booking.quote.pricingMode} Quote
            </p>
          </div>
        </div>

        {/* Middle Route Diagram: Pickup to Destination */}
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Pickup */}
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F5E9] text-[#16A34A] border border-[#C8E6C9]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#7A8090]">
                Pickup Point
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-[#090B10] line-clamp-1">
                {booking.pickup.label}
              </p>
              <p className="text-xs text-[#6A7080] line-clamp-1">{booking.pickup.address}</p>
            </div>
          </div>

          {/* Trajectory Distance Indicator */}
          <div className="hidden md:flex flex-col items-center px-4">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F5] border border-[#EAE7DC] text-[10px] font-mono font-bold text-[#5A6070]">
              <Route className="h-3 w-3 text-[#C9A86A]" />
              <span>{booking.quote.estimatedDistanceKm} km · {booking.quote.estimatedDurationMinutes} min</span>
            </div>
            <div className="w-24 border-t-2 border-dashed border-[#DCD8CC] my-2" />
          </div>

          {/* Destination */}
          <div className="flex items-start gap-3 md:justify-end md:text-right">
            <div className="order-2 md:order-1">
              <p className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#7A8090]">
                Destination
              </p>
              <p className="mt-0.5 text-sm sm:text-base font-bold text-[#090B10] line-clamp-1">
                {booking.destination.label}
              </p>
              <p className="text-xs text-[#6A7080] line-clamp-1">{booking.destination.address}</p>
            </div>
            <div className="order-1 md:order-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#090B10] text-white">
              <Compass className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Driver & Vehicle Metadata Bento Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FAF9F5] p-3.5 sm:p-4 border border-[#EAE7DC]">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#5A6070]">
            {/* Pickup time */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#090B10]" />
              <span className="font-semibold text-[#090B10]">{formatDateTime(booking.pickupAt)}</span>
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-2">
              <CarFront className="h-4 w-4 text-[#090B10]" />
              <span className="font-medium text-[#090B10]">
                {booking.vehicle.make} {booking.vehicle.model}
              </span>
            </div>

            {/* Driver */}
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[#090B10]" />
              <span className="font-medium text-[#090B10]">
                {booking.driver?.name ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {booking.driver.name}
                  </span>
                ) : (
                  <span className="italic text-[#7A8090]">Awaiting assignment</span>
                )}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {canCancel ? (
              <button
                type="button"
                onClick={() => onCancel(booking)}
                className="px-3.5 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] rounded-xl transition-colors"
              >
                Cancel
              </button>
            ) : null}

            {booking.status !== 'CANCELLED' ? (
              <Link
                href={`/customer/trips/${booking.id}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isActive
                    ? 'bg-[#16A34A] text-white hover:bg-[#15803D] hover:shadow-md'
                    : 'bg-[#090B10] text-white hover:bg-[#1E222D]'
                }`}
              >
                {isActive ? (
                  <>
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Track Live</span>
                  </>
                ) : booking.status === 'COMPLETED' ? (
                  <>
                    <Receipt className="h-3.5 w-3.5" />
                    <span>View Receipt</span>
                  </>
                ) : (
                  <>
                    <span>View Trip</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BookingHub() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const shouldReduceMotion = useReducedMotion();
  const [bookings, setBookings] = React.useState<BookingRecord[]>([]);
  const [favouriteDriverIds, setFavouriteDriverIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>('active');
  const [cancelTarget, setCancelTarget] = React.useState<BookingRecord | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>('');
  const [cancelling, setCancelling] = React.useState(false);

  const createdId = searchParams.get('created');

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    Promise.all([listBookings(user), listFavouriteDriverIds(user)])
      .then(([results, favourites]) => {
        if (active) {
          setBookings(results);
          setFavouriteDriverIds(favourites);
          setError(null);
          // Auto-select tab with active rides if present, else upcoming or past
          const hasActive = results.some(
            (b) =>
              b.status === 'ACTIVE' ||
              b.status === 'EN_ROUTE' ||
              (b.status === 'AWAITING_DRIVER' && b.bookingType === 'INSTANT')
          );
          if (!hasActive && results.length > 0) {
            const hasUpcoming = results.some(
              (b) => ['AWAITING_DRIVER', 'ACCEPTED', 'SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING'].includes(b.status)
            );
            setTab(hasUpcoming ? 'upcoming' : 'past');
          }
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load your bookings.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  usePolling(user && !isDemoDataMode ? user.uid : null, () => listBookings(user!),
    results => { setBookings(results); setError(null); }, caught => setError(caught instanceof Error ? caught.message : 'Booking refresh unavailable.'));

  const groups = React.useMemo(
    () => groupBookings(bookings, favouriteDriverIds),
    [bookings, favouriteDriverIds]
  );
  const visible = groups[tab];
  const activeTripsCount = groups.active.length;

  async function handleCancel() {
    if (!user || !cancelTarget || !cancelReason) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      setBookings(await cancelBooking(user, cancelTarget.id, cancelReason));
      setCancelTarget(null);
      setCancelReason('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel this booking.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <CustomerShell subtitle="Upcoming, active, past and favourite rides">
      <div className="min-h-screen bg-[#FAF9F5] py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* =========================================================================
              FLAGSHIP HERO HEADER
              ========================================================================= */}
          <div className="relative overflow-hidden rounded-3xl bg-[#090B10] p-6 sm:p-10 text-white shadow-xl shadow-black/10">
            {/* Subtle background luxury glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C9A86A]/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#16A34A]/15 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#E5D7B7] border border-white/15 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    Private Chauffeur Portfolio
                  </span>
                  {isDemoDataMode ? <DemoBadge label="Demo" /> : null}
                </div>

                <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Your Chauffeured <br />
                  <span className="bg-gradient-to-r from-white via-[#EFEBE1] to-[#C9A86A] bg-clip-text text-transparent">
                    Journeys & Bookings
                  </span>
                </h1>
                <p className="mt-3 max-w-xl text-xs sm:text-sm text-[#A0A6B5] leading-relaxed">
                  Real-time GPS ride monitoring, immutable transparent fares, and complete history of
                  your verified professional chauffeurs.
                </p>
              </div>

              {/* Primary CTA */}
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/customer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-[#090B10] shadow-md hover:bg-[#FAF9F5] transition-all hover:scale-[1.02] active:scale-95"
                >
                  <MapPin className="h-4 w-4 text-[#16A34A]" />
                  <span>Book New Chauffeur</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A92A6]">Active Trips</p>
                <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-1.5">
                  {groups.active.length}
                  {groups.active.length > 0 ? (
                    <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-ping" />
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A92A6]">Scheduled</p>
                <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
                  {groups.upcoming.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A92A6]">Completed</p>
                <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
                  {groups.past.filter((b) => b.status === 'COMPLETED').length}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A92A6]">Favourites</p>
                <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#C9A86A]">
                  {favouriteDriverIds.length}
                </p>
              </div>
            </div>
          </div>

          {/* Alert if created */}
          {createdId ? (
            <div className="rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-xs font-semibold text-[#15803D] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
              <span>Booking #{createdId} confirmed. Your verified chauffeur is being prepared.</span>
            </div>
          ) : null}

          {/* =========================================================================
              NAVIGATION TABS
              ========================================================================= */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EAE7DC] pb-4">
            {(
              [
                { id: 'active', label: 'Active Trips', count: groups.active.length },
                { id: 'upcoming', label: 'Scheduled', count: groups.upcoming.length },
                { id: 'past', label: 'Past Rides', count: groups.past.length },
                { id: 'favourites', label: 'Favourite Chauffeurs', count: groups.favourites.length },
              ] as const
            ).map((t) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    selected
                      ? 'bg-[#090B10] text-white shadow-xs'
                      : 'bg-white text-[#5A6070] border border-[#EAE7DC] hover:border-[#090B10] hover:text-[#090B10]'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      selected ? 'bg-white/20 text-white' : 'bg-[#FAF9F5] text-[#7A8090]'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* =========================================================================
              BOOKINGS LIST OR EMPTY STATE
              ========================================================================= */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4 py-8">
                <div className="h-44 w-full animate-pulse rounded-3xl bg-white border border-[#EAE7DC]" />
                <div className="h-44 w-full animate-pulse rounded-3xl bg-white border border-[#EAE7DC]" />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#DCD8CC] bg-white p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF9F5] border border-[#EAE7DC] text-[#7A8090]">
                  <CarFront className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-[#090B10]">
                  {tab === 'active'
                    ? 'No Active Trips Right Now'
                    : tab === 'upcoming'
                    ? 'No Scheduled Bookings'
                    : tab === 'favourites'
                    ? 'No Favourite Chauffeurs Yet'
                    : 'No Past Rides Recorded'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-[#6A7080] leading-relaxed">
                  {tab === 'active'
                    ? 'Need a driver immediately? Head to the studio to request an on-demand verified chauffeur for your car.'
                    : tab === 'upcoming'
                    ? 'Schedule a chauffeur in advance for business meetings, airport drops, or late-night returns.'
                    : tab === 'favourites'
                    ? 'Mark top chauffeurs as favourites from completed trips to request them on future bookings.'
                    : 'Completed and historical journeys with itemized receipts will be archived here.'}
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/customer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#090B10] px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#1E222D] transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#16A34A]" />
                    <span>Open Booking Studio</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visible.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FlagshipBookingCard booking={booking} onCancel={setCancelTarget} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
        title="Cancel this booking?"
        description="Instant cancellation is ₹0. Scheduled cancellation follows the Veyro policy based on arrival window."
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel booking'}
        destructive
        onConfirm={() => void handleCancel()}
      >
        <Field id="cancel-reason" label="Reason for cancellation" required>
          <Select
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
          >
            <option value="">Select a reason</option>
            {cancellationReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason.replaceAll('_', ' ').toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
      </ConfirmDialog>
    </CustomerShell>
  );
}
