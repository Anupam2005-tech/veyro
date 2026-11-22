'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  FileWarning,
  Heart,
  RotateCcw,
  Star,
} from 'lucide-react';
import {
  DemoBadge,
  ErrorState,
  FareBreakdown,
  Field,
  FormAlert,
  LoadingState,
  Select,
  Textarea,
  VeyroButton,
} from '@veyro/ui';
import {
  createTripReport,
  getTrip,
  listFavouriteDriverIds,
  payTrip,
  setDriverFavourite,
  submitTripRating,
} from '@/lib/api/client';
import type { PaymentStatus, ReportSubmission, TripRecord } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { CustomerShell } from './customer-shell';

const reportCategories: Array<{ value: ReportSubmission['category']; label: string }> = [
  { value: 'SAFETY', label: 'Safety concern' },
  { value: 'PAYMENT', label: 'Payment issue' },
  { value: 'VEHICLE', label: 'Vehicle condition' },
  { value: 'BEHAVIOUR', label: 'Driver behaviour' },
  { value: 'OTHER', label: 'Something else' },
];

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function paymentCopy(status: PaymentStatus): { title: string; tone: 'info' | 'success' | 'warning' | 'error' } {
  const map: Record<PaymentStatus, { title: string; tone: 'info' | 'success' | 'warning' | 'error' }> = {
    PENDING: { title: 'Payment pending', tone: 'warning' },
    PENDING_VERIFICATION: { title: 'Payment verification pending', tone: 'info' },
    CAPTURED: { title: 'Payment captured', tone: 'success' },
    FAILED: { title: 'Payment failed', tone: 'error' },
    REFUND_PENDING: { title: 'Refund being processed', tone: 'warning' },
    REFUNDED: { title: 'Payment refunded', tone: 'warning' },
    DISPUTED: { title: 'Payment disputed', tone: 'warning' },
    REVIEW_REQUIRED: { title: 'Payment held for review', tone: 'warning' },
  };
  return map[status];
}

export default function TripSummary({ tripId }: { tripId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, demoMode } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'customer';
  const [trip, setTrip] = React.useState<TripRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [favouriteDriverIds, setFavouriteDriverIds] = React.useState<string[]>([]);
  const [favouriteBusy, setFavouriteBusy] = React.useState(false);
  const [reportCategory, setReportCategory] = React.useState<ReportSubmission['category']>('SAFETY');
  const [reportDescription, setReportDescription] = React.useState('');

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getTrip(activeUser, tripId)
      .then((next) => {
        if (!active) return;
        setTrip(next);
        setRating(next.rating ?? 0);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load this receipt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser, tripId]);

  React.useEffect(() => {
    let active = true;
    if (!activeUser) {
      setFavouriteDriverIds([]);
      return () => {
        active = false;
      };
    }
    listFavouriteDriverIds(activeUser)
      .then((ids) => {
        if (active) setFavouriteDriverIds(ids);
      })
      .catch(() => {
        if (active) setFavouriteDriverIds([]);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  async function handleFavourite() {
    if (!activeUser || !trip?.driver) return;
    const next = !favouriteDriverIds.includes(trip.driver.id);
    setFavouriteBusy(true);
    try {
      setFavouriteDriverIds(await setDriverFavourite(activeUser, trip.driver.id, next));
      setNotice(next ? 'Driver saved to favourites on this device.' : 'Driver removed from favourites.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not update favourites.');
    } finally {
      setFavouriteBusy(false);
    }
  }

  async function handlePayment() {
    if (!activeUser || demoPreview) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await payTrip(activeUser, tripId);
      setTrip(updated);
      setNotice('Demo Razorpay test checkout started. Verification is pending.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRating() {
    if (!activeUser || demoPreview || rating === 0) return;
    setBusy(true);
    try {
      const updated = await submitTripRating(activeUser, tripId, { rating });
      setTrip(updated);
      setNotice('Thank you. Your rating was recorded.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not save your rating.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReport(event: React.FormEvent) {
    event.preventDefault();
    if (!activeUser || demoPreview) return;
    if (reportDescription.trim().length < 10) {
      setNotice('Please describe the issue in at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      const report = await createTripReport(activeUser, {
        tripId,
        reporterRole: 'CUSTOMER',
        category: reportCategory,
        description: reportDescription.trim(),
      });
      setReportDescription('');
      setNotice(`Report ${report.id} submitted. Only you will be notified of the outcome.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not submit your report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <CustomerShell subtitle={`Receipt ${tripId}`}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link href={`/customer/trips/${tripId}`} className="inline-flex items-center gap-2 text-xs font-semibold text-studio-muted hover:text-studio-ink">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back to trip
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Trip complete
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Receipt & feedback
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              The final fare is built from the frozen quote plus validated waiting or no-show items.
              Fuel, tolls and parking are never added to the driver-service fare.
            </p>
          </div>
          {demoMode || demoPreview ? <DemoBadge /> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading receipt…" className="mt-8" />
        ) : error || !trip ? (
          <ErrorState title="Receipt unavailable" description={error ?? 'Trip not found.'} className="mt-8" />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-5">
              {trip.finalFare ? (
                <>
                  <FareBreakdown
                    lines={trip.finalFare.lines.map((line) => ({
                      label: line.label,
                      amount: inr(line.amountInr),
                    }))}
                    total={inr(trip.finalFare.totalInr)}
                    exclusions={trip.finalFare.exclusions}
                    note="HOURLY driver-service fare · no minimum fare or minimum billable time"
                  />
                  <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-panel bg-studio-bg p-4">
                        <p className="text-xs text-studio-muted">Estimate</p>
                        <p className="mt-1 font-display text-2xl font-extrabold text-studio-ink">
                          {inr(trip.finalFare.estimateInr)}
                        </p>
                      </div>
                      <div className="rounded-panel bg-studio-bg p-4">
                        <p className="text-xs text-studio-muted">Final</p>
                        <p className="mt-1 font-display text-2xl font-extrabold text-studio-ink">
                          {inr(trip.finalFare.totalInr)}
                        </p>
                      </div>
                      <p className="text-xs text-studio-muted">
                        Billable time: {trip.finalFare.billableMinutes} min
                      </p>
                      <p className="text-xs text-studio-muted">
                        Recorded distance: {trip.finalFare.billableKm} km
                      </p>
                      <p className="text-xs text-studio-muted">
                        Waiting / no-show: {inr(trip.finalFare.waitingFeeInr)} /{' '}
                        {inr(trip.finalFare.noShowFeeInr)}
                      </p>
                      <p className="text-xs text-studio-muted">
                        Platform fee / commission: {inr(0)} / 0%
                      </p>
                    </div>
                  </section>
                  <FormAlert
                    tone={paymentCopy(trip.finalFare.paymentStatus).tone}
                    title={paymentCopy(trip.finalFare.paymentStatus).title}
                  >
                    {trip.finalFare.paymentReference
                      ? `Reference ${trip.finalFare.paymentReference}. `
                      : null}
                    Razorpay is shown in test mode only in this frontend pass.
                  </FormAlert>
                  {['PENDING', 'FAILED'].includes(trip.finalFare.paymentStatus) ? (
                    <VeyroButton
                      size="lg"
                      loading={busy}
                      disabled={demoPreview}
                      onClick={() => void handlePayment()}
                    >
                      <CreditCard aria-hidden="true" className="h-4 w-4" />
                      Pay with Razorpay (test mode)
                    </VeyroButton>
                  ) : null}
                </>
              ) : (
                <FormAlert tone="warning" title="Final fare not available">
                  This trip has not been completed, so no itemised receipt exists yet.
                </FormAlert>
              )}

              {notice ? (
                <FormAlert tone={notice.includes('Could not') || notice.includes('at least') ? 'error' : 'success'} title="Feedback update">
                  {notice}
                </FormAlert>
              ) : null}
            </div>

            <div className="space-y-5">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Rate this drive</h2>
                  <Star aria-hidden="true" className="h-5 w-5 text-studio-ink" />
                </div>
                <div className="mt-5 flex gap-2" role="group" aria-label="Rating from one to five stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      aria-pressed={rating === value}
                      disabled={demoPreview || busy}
                      onClick={() => setRating(value)}
                      className={`rounded-full p-2 transition-colors disabled:opacity-50 ${
                        value <= rating ? 'bg-studio-ink text-white' : 'bg-studio-tint text-studio-muted'
                      }`}
                    >
                      <Star aria-hidden="true" className="h-5 w-5" fill={value <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <VeyroButton
                  type="button"
                  className="mt-5"
                  loading={busy}
                  disabled={rating === 0 || demoPreview}
                  onClick={() => void handleRating()}
                >
                  Submit rating
                </VeyroButton>
                {trip.driver ? (
                  <div className="mt-4 rounded-panel bg-studio-bg p-4">
                    <VeyroButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={favouriteBusy}
                      aria-pressed={favouriteDriverIds.includes(trip.driver.id)}
                      onClick={() => void handleFavourite()}
                    >
                      <Heart
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill={
                          favouriteDriverIds.includes(trip.driver.id) ? 'currentColor' : 'none'
                        }
                      />
                      {favouriteDriverIds.includes(trip.driver.id)
                        ? 'Saved to favourites'
                        : 'Save driver to favourites'}
                    </VeyroButton>
                    <p className="mt-2 text-xs text-studio-muted">
                      Saved on this device so your booking hub can surface repeat drivers.
                    </p>
                  </div>
                ) : null}
              </section>

              <form
                onSubmit={(event) => void handleReport(event)}
                className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Report an issue</h2>
                  <FileWarning aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-2 text-xs text-studio-muted">
                  Predefined category and written description only. The reported party cannot see
                  your identity.
                </p>
                <div className="mt-5 space-y-4">
                  <Field id="report-category" label="Category" required>
                    <Select
                      id="report-category"
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
                  <Field id="report-description" label="Description" required>
                    <Textarea
                      id="report-description"
                      value={reportDescription}
                      onChange={(event) => setReportDescription(event.currentTarget.value)}
                      placeholder="Describe what happened. Do not include payment card details."
                    />
                  </Field>
                </div>
                <VeyroButton
                  type="submit"
                  variant="secondary"
                  className="mt-5"
                  loading={busy}
                  disabled={demoPreview}
                >
                  Submit report
                </VeyroButton>
              </form>

              <section className="rounded-card border border-studio-border bg-studio-obsidian p-5 text-white shadow-glass sm:p-6">
                <BadgeCheck aria-hidden="true" className="h-6 w-6 text-studio-lime" />
                <h2 className="mt-4 font-display text-lg font-bold">Service fare, not a taxi fare</h2>
                <p className="mt-2 text-xs leading-relaxed text-white/65">
                  You provided the vehicle and keys. Veyro arranged an independent professional
                  driver. Fuel, tolls and parking remain your responsibility and are excluded from
                  the driver-service fare.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
