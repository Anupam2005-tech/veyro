'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeIndianRupee, Clock3, History, Wallet } from 'lucide-react';
import {
  DemoBadge,
  ErrorState,
  FormAlert,
  LoadingState,
  VeyroButton,
} from '@veyro/ui';
import { getDriverEarnings } from '@/lib/api/client';
import type { DriverEarningsSummary } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { DriverShell } from './driver-shell';

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function DriverEarnings() {
  const { user } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const [summary, setSummary] = React.useState<DriverEarningsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getDriverEarnings(activeUser)
      .then((next) => {
        if (active) {
          setSummary(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load earnings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  const cards = summary
    ? [
        { label: 'Net earnings', value: inr(summary.totalNetInr), icon: Wallet, tone: 'dark' as const },
        { label: 'Gross service amount', value: inr(summary.grossInr), icon: BadgeIndianRupee },
        { label: 'Waiting credits', value: inr(summary.waitingCreditInr), icon: Clock3 },
        { label: 'Adjustments', value: inr(summary.adjustmentsInr), icon: ArrowUpRight },
      ]
    : [];

  return (
    <DriverShell subtitle="Earnings ledger">
      <div className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Driver finance
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">Earnings</h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Every completed drive is reconciled from the frozen quote, actual billable time and
              recorded waiting or adjustment items.
            </p>
          </div>
          {summary?.demo ? <DemoBadge /> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading earnings…" className="mt-8" />
        ) : error || !summary ? (
          <ErrorState title="Earnings unavailable" description={error ?? 'No ledger found.'} className="mt-8" />
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-card border p-5 ${
                    card.tone === 'dark'
                      ? 'border-studio-obsidian bg-studio-obsidian text-white ring-1 ring-studio-lime/20'
                      : 'border-studio-border bg-studio-surface text-studio-ink'
                  }`}
                >
                  <card.icon
                    aria-hidden="true"
                    className={`h-5 w-5 ${card.tone === 'dark' ? 'text-studio-lime' : 'text-studio-muted'}`}
                  />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider opacity-70">
                    {card.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-extrabold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-6">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">
                  Current rate configuration
                </h2>
                <div className="mt-5 rounded-panel border border-studio-border bg-studio-bg p-5">
                  <p className="font-display text-4xl font-extrabold text-studio-ink">
                    {inr(summary.hourlyRateInr)}
                    <span className="ml-2 font-body text-sm font-normal text-studio-muted">/ hour</span>
                  </p>
                  <p className="mt-2 text-xs text-studio-muted">
                    Effective {new Date(summary.rateEffectiveFrom).toLocaleDateString()}
                  </p>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-studio-muted">Driver commission</dt>
                    <dd className="font-mono font-semibold text-studio-ink">
                      {inr(summary.commissionInr)} · 0%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-studio-muted">Completed trips</dt>
                    <dd className="font-mono font-semibold text-studio-ink">{summary.completedTrips}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-studio-muted">Pricing mode</dt>
                    <dd className="font-mono font-semibold text-studio-ink">HOURLY</dd>
                  </div>
                </dl>
                <FormAlert tone="info" title="Rate changes" className="mt-5">
                  {summary.rateChangeCopy}
                </FormAlert>
                <VeyroButton asChild variant="secondary" className="mt-5">
                  <Link href="/driver/profile">Manage rate and profile</Link>
                </VeyroButton>
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Trip ledger</h2>
                  <History aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <div className="mt-5 divide-y divide-studio-border">
                  {summary.entries.map((entry) => (
                    <article key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-studio-ink">{entry.description}</p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-studio-muted">
                          {entry.tripId} · {new Date(entry.completedAt).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-[11px] text-studio-muted">
                          Gross {inr(entry.grossInr)} · waiting {inr(entry.waitingCreditInr)} ·
                          adjustments {inr(entry.adjustmentInr)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-extrabold text-studio-ink">
                          {inr(entry.netInr)}
                        </p>
                        <p className="text-[11px] text-studio-muted">net</p>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="mt-5 text-xs text-studio-muted">
                  Demo earnings are labelled and do not represent real paid amounts.
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </DriverShell>
  );
}
