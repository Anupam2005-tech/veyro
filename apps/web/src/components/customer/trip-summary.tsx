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
  payInvoice,
  setDriverFavourite,
  submitTripRating,
} from '@/lib/api/client';
import { checkCheckout, paymentStatusMessage, type CheckoutStatus } from '@/lib/api/razorpay-checkout';
import type { PaymentStatus, ReportSubmission, TripRecord } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { usePolling } from '@/lib/hooks/use-polling';
import { CustomerShell } from './customer-shell';

const reportCategories: Array<{ value: ReportSubmission['category']; label: string }> = [
  { value: 'SAFETY_CONCERN', label: 'Safety concern' },
  { value: 'FARE_OR_PAYMENT', label: 'Payment issue' },
  { value: 'SERVICE_ISSUE', label: 'Vehicle condition' },
  { value: 'DRIVER_CONDUCT', label: 'Driver behaviour' },
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
  const [checkoutStatus, setCheckoutStatus] = React.useState<CheckoutStatus | null>(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState(0);
  const [favouriteDriverIds, setFavouriteDriverIds] = React.useState<string[]>([]);
  const [favouriteBusy, setFavouriteBusy] = React.useState(false);
  const [reportCategory, setReportCategory] = React.useState<ReportSubmission['category']>('SAFETY_CONCERN');
  const [reportDescription, setReportDescription] = React.useState('');

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setCheckoutStatus(null);
    setPaymentError(null);
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

  usePolling(activeUser && !isDemoDataMode && !busy && checkoutStatus === 'PENDING' ? `${activeUser.uid}:${tripId}` : null,
    () => getTrip(activeUser!, tripId),
    next => {
      setTrip(next);
      if (next.finalFare?.paymentStatus === 'CAPTURED') setCheckoutStatus('CAPTURED');
      if (next.finalFare?.paymentStatus === 'DISPUTED') setCheckoutStatus('DISPUTED');
    }, () => {}, 10_000);

  async function handlePayment(checkOnly = false) {
    if (!activeUser || demoPreview || busy) return;
    setBusy(true);
    setPaymentError(null);
    try {
      const result = checkOnly ? await checkCheckout(activeUser, tripId) : await payInvoice(activeUser, tripId);
      setCheckoutStatus(result);
      if (result === 'CAPTURED' || result === 'DISPUTED') {
        try { setTrip(await getTrip(activeUser, tripId)); }
        catch { setPaymentError('Reload this page to refresh the receipt.'); }
      }
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Could not check the payment. Try again.');
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
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
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
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-4">
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
                  <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-panel border border-studio-border bg-studio-bg/60 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-studio-muted">Estimated Fare</p>
                        <p className="mt-1 font-display text-2xl font-black tracking-tight text-studio-ink sm:text-3xl">
                          {inr(trip.finalFare.estimateInr)}
                        </p>
                      </div>
                      <div className="rounded-panel border border-studio-lime/40 bg-gradient-to-br from-studio-tint/50 via-white to-studio-tint/20 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-studio-muted">Final Charged Fare</p>
                        <p className="mt-1 font-display text-3xl font-black tracking-tight text-studio-obsidian sm:text-4xl">
                          {inr(trip.finalFare.totalInr)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-studio-border pt-3 text-xs text-studio-muted sm:grid-cols-4">
                      <div>
                        <span className="block text-[11px] text-studio-muted">Billable time</span>
                        <span className="font-semibold text-studio-ink">{trip.finalFare.billableMinutes} min</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-studio-muted">Recorded distance</span>
                        <span className="font-semibold text-studio-ink">{trip.finalFare.billableKm} km</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-studio-muted">Wait / no-show</span>
                        <span className="font-semibold text-studio-ink">
                          {inr(trip.finalFare.waitingFeeInr)} / {inr(trip.finalFare.noShowFeeInr)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-studio-muted">Platform fee / comm.</span>
                        <span className="font-semibold text-studio-ink">{inr(0)} / 0%</span>
                      </div>
                    </div>
                  </section>
                  <FormAlert tone={paymentCopy(
                    checkoutStatus === 'READY' || checkoutStatus === null ? trip.finalFare.paymentStatus :
                      checkoutStatus === 'PENDING' ? 'PENDING_VERIFICATION' : checkoutStatus
                  ).tone} title={checkoutStatus ? 'Payment status' : paymentCopy(trip.finalFare.paymentStatus).title}>
                    {trip.finalFare.paymentReference
                      ? `Reference ${trip.finalFare.paymentReference}. `
                      : null}
                    {checkoutStatus ? paymentStatusMessage(checkoutStatus) : 'Razorpay Test Mode'}
                  </FormAlert>
                  {paymentError ? <FormAlert tone="error" title="Payment update">{paymentError}</FormAlert> : null}
                  {['PENDING', 'FAILED'].includes(trip.finalFare.paymentStatus) &&
                    !['CAPTURED', 'DISPUTED', 'REVIEW_REQUIRED'].includes(checkoutStatus ?? '') ? (
                    <div className="flex flex-wrap gap-2">
                      {checkoutStatus !== 'PENDING' ? <VeyroButton size="lg" loading={busy}
                        disabled={demoPreview} onClick={() => void handlePayment()}>
                        <CreditCard aria-hidden="true" className="h-4 w-4" />
                        Pay with Razorpay (test mode)
                      </VeyroButton> : null}
                      {!isDemoDataMode ? <VeyroButton size="lg" variant="secondary" disabled={busy}
                        onClick={() => void handlePayment(true)}>Check payment status</VeyroButton> : null}
                    </div>
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

            <div className="space-y-4">
              <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-studio-ink">Rate this drive</h2>
                    <p className="mt-1 text-xs text-studio-muted">Your review helps improve driver quality and standards.</p>
                  </div>
                  <Star aria-hidden="true" className="h-5 w-5 text-studio-ink" />
                </div>
                <div className="mt-5 flex items-center gap-2.5" role="group" aria-label="Rating from one to five stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      aria-pressed={rating === value}
                      disabled={demoPreview || busy}
                      onClick={() => setRating(value)}
                      className={`flex h-10 w-10 items-center justify-center rounded-control transition-colors disabled:opacity-50 ${
                        value <= rating
                          ? 'bg-studio-obsidian text-studio-lime'
                          : 'bg-studio-tint text-studio-muted hover:bg-studio-border/50 hover:text-studio-ink'
                      }`}
                    >
                      <Star aria-hidden="true" className="h-5 w-5" fill={value <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <VeyroButton
                  type="button"
                  className="mt-5 min-h-[44px] w-full"
                  loading={busy}
                  disabled={rating === 0 || demoPreview}
                  onClick={() => void handleRating()}
                >
                  Submit rating
                </VeyroButton>
                {trip.driver ? (
                  <div className="mt-4 rounded-panel border border-studio-border bg-studio-bg/60 p-3">
                    <VeyroButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-[38px]"
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
                className="rounded-card border border-studio-border bg-white p-4 sm:p-5"
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
                    <div className="input-glow rounded-panel">
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
                    </div>
                  </Field>
                  <Field id="report-description" label="Description" required>
                    <div className="input-glow rounded-panel">
                      <Textarea
                        id="report-description"
                        value={reportDescription}
                        onChange={(event) => setReportDescription(event.currentTarget.value)}
                        placeholder="Describe what happened. Do not include payment card details."
                      />
                    </div>
                  </Field>
                </div>
                <VeyroButton
                  type="submit"
                  variant="secondary"
                  className="mt-5 min-h-[44px] w-full"
                  loading={busy}
                  disabled={demoPreview}
                >
                  Submit report
                </VeyroButton>
              </form>

              <section className="rounded-card border border-studio-ink/20 bg-studio-obsidian p-4 text-white sm:p-5">
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
