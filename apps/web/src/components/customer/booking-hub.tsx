'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarDays, CarFront, Clock3, MapPin, Navigation, UserRound } from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  LoadingState,
  Select,
  StatusBadge,
  VeyroButton,
  type VeyroStatus,
} from '@veyro/ui';
import { cancelBooking, listBookings, listFavouriteDriverIds } from '@/lib/api/client';
import type { BookingRecord, BookingStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { formatDateTime } from '@/lib/booking/policy';
import { isDemoDataMode } from '@/lib/env';
import { CustomerShell } from './customer-shell';

type Tab = 'upcoming' | 'active' | 'past' | 'favourites';

const statusCopy: Record<BookingStatus, { status: VeyroStatus; label: string }> = {
  AWAITING_DRIVER: { status: 'pending', label: 'Awaiting driver' },
  ACCEPTED: { status: 'approved', label: 'Accepted' },
  EN_ROUTE: { status: 'active', label: 'Driver en route' },
  ACTIVE: { status: 'active', label: 'Trip active' },
  COMPLETED: { status: 'completed', label: 'Completed' },
  CANCELLED: { status: 'rejected', label: 'Cancelled' },
};

const cancellationReasons = [
  'Plans changed',
  'Route no longer needed',
  'Found another option',
  'Driver did not contact me',
  'Other',
] as const;

function groupBookings(
  bookings: BookingRecord[],
  favouriteDriverIds: string[]
): Record<Tab, BookingRecord[]> {
  const groups: Record<Tab, BookingRecord[]> = {
    upcoming: [],
    active: [],
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
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
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

function BookingCard({
  booking,
  onCancel,
}: {
  booking: BookingRecord;
  onCancel: (booking: BookingRecord) => void;
}) {
  const copy = statusCopy[booking.status];
  const canCancel = booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED';

  return (
    <article className="rounded-card border border-studio-border bg-white p-4 shadow-studio-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
            {booking.id}
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold text-studio-ink">
            {booking.pickup.label} → {booking.destination.label}
          </h2>
        </div>
        <StatusBadge status={copy.status} label={copy.label} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-studio-muted sm:grid-cols-2 lg:grid-cols-4">
        <p className="inline-flex items-start gap-2">
          <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {formatDateTime(booking.pickupAt)}
        </p>
        <p className="inline-flex items-start gap-2">
          <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {booking.bookingType === 'INSTANT' ? 'Instant booking' : 'Scheduled booking'}
        </p>
        <p className="inline-flex items-start gap-2">
          <CarFront aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {booking.vehicle.make} {booking.vehicle.model}
        </p>
        <p className="inline-flex items-start gap-2">
          <UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {booking.driver?.name ?? 'Driver not assigned yet'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-studio-border pt-3">
        <div className="space-y-1 text-xs text-studio-muted">
          <p className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {booking.quote.estimatedDistanceKm} km · {booking.quote.estimatedDurationMinutes} min
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Navigation aria-hidden="true" className="h-3.5 w-3.5" />
            Frozen {booking.quote.pricingMode} quote · ₹{booking.quote.estimatedBaseFare}
          </p>
          {booking.cancelReason ? <p>Reason: {booking.cancelReason}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.status !== 'CANCELLED' ? (
            <VeyroButton asChild size="sm">
              <Link href={`/customer/trips/${booking.id}`}>
                {booking.status === 'COMPLETED' ? 'View receipt' : 'Open trip cockpit'}
              </Link>
            </VeyroButton>
          ) : null}
          {canCancel ? (
            <VeyroButton type="button" variant="secondary" size="sm" onClick={() => onCancel(booking)}>
              Cancel booking
            </VeyroButton>
          ) : null}
          <VeyroButton asChild variant="secondary" size="sm">
            <Link href="/customer">
              Plan another ride <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </VeyroButton>
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
  const [tab, setTab] = React.useState<Tab>('upcoming');
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

  const groups = React.useMemo(
    () => groupBookings(bookings, favouriteDriverIds),
    [bookings, favouriteDriverIds]
  );
  const visible = groups[tab];

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
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
              Booking hub
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Every ride in one place
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-studio-muted">
              Review frozen quotes, monitor active trips and keep a clean record of past rides.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isDemoDataMode ? <DemoBadge label="Demo bookings" /> : null}
            <VeyroButton asChild size="sm">
              <Link href="/customer">New booking</Link>
            </VeyroButton>
          </div>
        </div>

        {createdId ? (
          <div className="mt-6">
            <FormAlert tone="success" title="Booking created">
              {createdId} is now in your booking hub. The quote snapshot is frozen.
            </FormAlert>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6">
            <ErrorState
              title="Could not load bookings"
              description={error}
              actionLabel="Try again"
              onAction={() => window.location.reload()}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Booking status">
          {(['upcoming', 'active', 'past', 'favourites'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-control border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                tab === item
                  ? 'border-studio-ink bg-studio-obsidian text-white'
                  : 'border-studio-border bg-white text-studio-muted hover:text-studio-ink'
              }`}
            >
              {item}
              <span className="ml-2 font-mono text-xs">{groups[item].length}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <LoadingState label="Loading your bookings…" />
          ) : visible.length === 0 ? (
            <EmptyState
              title={tab === 'favourites' ? 'No favourite drivers yet' : `No ${tab} bookings`}
              description={
                tab === 'favourites'
                  ? 'Save a driver from a completed trip receipt and their rides appear here.'
                  : 'Plan a route and freeze a quote to see it here.'
              }
              actionLabel="Open booking studio"
              onAction={() => window.location.assign('/customer')}
            />
          ) : (
            visible.map((booking) => (
              <motion.div
                key={booking.id}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
              >
                <BookingCard booking={booking} onCancel={setCancelTarget} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
        title="Cancel this booking?"
        description="Choose a reason. Instant cancellation is ₹0; scheduled cancellation follows the approved policy calculated by the server."
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel booking'}
        destructive
        onConfirm={() => void handleCancel()}
      >
        <Field id="cancel-reason" label="Cancellation reason" required>
          <Select
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.currentTarget.value)}
          >
            <option value="">Select a reason</option>
            {cancellationReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </Select>
        </Field>
      </ConfirmDialog>
    </CustomerShell>
  );
}
