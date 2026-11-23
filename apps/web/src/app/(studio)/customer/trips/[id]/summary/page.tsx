'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PayPanel } from '@/components/PayPanel';
import { Alert, Button, Card, ErrorText, Field, KeyValue, PageHeader, Select, Spinner, StatusBadge, Textarea, cx } from '@/components/ui';
import { api, apiWithMessage } from '@/lib/api';
import { dateTime, humanize, inr, shortId, time } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { Trip } from '@/lib/types';

interface MyReport { id: string; tripId: string; category: string; status: string; resolutionNote: string | null; createdAt: string }

export default function TripSummary() {
  const me = useRequireRole('CUSTOMER');
  const { id } = useParams<{ id: string }>();
  const { data: trip, reload } = useApi<Trip>(me ? `/trips/${id}` : null);
  const categories = useApi<string[]>(me ? '/reports/categories' : null);
  const reports = useApi<MyReport[]>(me ? '/reports' : null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [favourite, setFavourite] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const rate = useAction();
  const report = useAction();

  if (!me || !trip || !trip.booking) return <Spinner />;
  const b = trip.booking;
  const f = trip.fare;
  const myReport = reports.data?.find((r) => r.tripId === trip.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Trip receipt" subtitle={<span className="tabular-nums">Trip #{shortId(trip.id)} · {dateTime(trip.endedAt ?? trip.arrivedAt)}</span>} action={<StatusBadge status={trip.status} />} />
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-base font-semibold">Fare breakdown</h2>
            {f ? (
              <div className="space-y-3">
                <KeyValue items={[
                  ['Pricing', 'Hourly, billed by the minute'],
                  ['Hourly rate', `${inr(b.quote.hourlyRateInr)}/hr`],
                  ['Trip time', trip.status === 'CUSTOMER_NO_SHOW' ? '—' : `${f.billableMinutes} min (${time(trip.startedAt)} → ${time(trip.endedAt)})`],
                  ['Driver fare', inr(f.baseFareInr)],
                  ['Waiting charge', inr(f.waitingFeeInr)],
                  ...(f.noShowFeeInr ? [['Customer no-show fee', inr(f.noShowFeeInr)] as [string, string]] : []),
                  ['Booking fee', inr(f.platformFeeInr)],
                ]} />
                <div className="flex items-baseline justify-between border-t border-studio-border pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-semibold tabular-nums">{inr(f.totalInr)}</span>
                </div>
                <p className="text-xs text-studio-muted">Estimate at booking: {inr(b.quote.displayEstimatedFareInr)} for {b.quote.estimatedRouteMinutes} min. Fuel, tolls and parking are excluded and not collected by Veyro.</p>
                {trip.status === 'CUSTOMER_NO_SHOW' ? (
                  <Alert tone="warning" title="No-show fee">
                    Your driver arrived at {time(trip.arrivedAt)} and waited 30 minutes without the trip being started. If this is wrong, report it below and we will hold the fee while we review it.
                  </Alert>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-studio-muted">No fare for this trip.</p>
            )}
          </Card>

          {trip.status === 'COMPLETED' ? (
            <Card>
              <h2 className="mb-3 text-base font-semibold">Rate {trip.driver?.firstName}</h2>
              {trip.rating ? (
                <p className="text-sm">You rated this trip <strong>{trip.rating.stars}★</strong>{trip.rating.comment ? `: “${trip.rating.comment}”` : ''}.</p>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await rate.run(() => apiWithMessage(`/trips/${trip.id}/rating`, { body: { stars, comment, favourite } }));
                    if (r) {
                      setNotice(r.message);
                      void reload();
                    }
                  }}
                >
                  <div role="radiogroup" aria-label="Rating" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)}
                        className={cx('h-11 w-11 rounded-xl border text-xl', n <= stars ? 'border-amber-400 bg-amber-100' : 'border-studio-border')}>
                        ★
                      </button>
                    ))}
                  </div>
                  <Field label="Comment (optional)">{(fid) => <Textarea id={fid} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} />}</Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favourite} onChange={(e) => setFavourite(e.target.checked)} className="h-4 w-4" /> Add {trip.driver?.firstName} to favourites</label>
                  <ErrorText>{rate.error}</ErrorText>
                  <Button type="submit" variant="dark" disabled={!stars} busy={rate.busy}>Submit rating</Button>
                </form>
              )}
            </Card>
          ) : null}

          <Card>
            <h2 className="mb-3 text-base font-semibold">Report a problem</h2>
            {myReport ? (
              <div className="space-y-1 text-sm">
                <p>Your report ({humanize(myReport.category)}) is <StatusBadge status={myReport.status} /></p>
                {myReport.resolutionNote ? <p className="text-studio-muted">Resolution: {myReport.resolutionNote}</p> : null}
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await report.run(() => apiWithMessage('/reports', { body: { tripId: trip.id, category, description } }));
                  if (r) {
                    setNotice(r.message);
                    void reports.reload();
                    void api('/me');
                  }
                }}
              >
                <Field label="Category">
                  {(fid) => (
                    <Select id={fid} required value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Choose a category</option>
                      {categories.data?.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="What happened?" hint="At least 10 characters. Your report is confidential.">
                  {(fid) => <Textarea id={fid} required minLength={10} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />}
                </Field>
                <ErrorText>{report.error}</ErrorText>
                <Button type="submit" variant="secondary" busy={report.busy} disabled={!category}>Submit report</Button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <PayPanel />
          <Card>
            <KeyValue items={[
              ['Driver', trip.driver?.name ?? '—'],
              ['Vehicle', `${b.vehicle.make} ${b.vehicle.model}`],
              ['From', b.pickup.label],
              ['To', b.destination.label],
            ]} />
          </Card>
          <Link href="/customer/bookings" className="block text-center text-sm underline">All my rides</Link>
        </div>
      </div>
    </div>
  );
}
