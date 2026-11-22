'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  DemoBadge,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from '@veyro/ui';
import { getAdminOverview } from '@/lib/api/client';
import type { AdminApplicationRecord, AdminOverviewData } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { AdminShell } from './admin-shell';

function statusTone(status: AdminApplicationRecord['status']): string {
  if (status === 'APPROVED') return 'bg-studio-lime text-studio-ink';
  if (status === 'REJECTED' || status === 'DEACTIVATED') return 'bg-red-100 text-red-800';
  if (status === 'NEEDS_CHANGES') return 'bg-amber-100 text-amber-900';
  return 'bg-studio-tint text-studio-ink';
}

export default function AdminOverview() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [overview, setOverview] = React.useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('ALL');

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getAdminOverview(activeUser)
      .then((next) => {
        if (active) {
          setOverview(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load admin overview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  const filtered = (overview?.applications ?? []).filter((application) => {
    const matchesQuery = `${application.driverName} ${application.phone} ${application.id}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus = status === 'ALL' || application.status === status;
    return matchesQuery && matchesStatus;
  });

  const cards = overview
    ? [
        { label: 'Pending applications', value: overview.pendingApplications, icon: ClipboardCheck },
        { label: 'Approved drivers', value: overview.approvedDrivers, icon: CheckCircle2 },
        { label: 'Rejected applications', value: overview.rejectedApplications, icon: XCircle },
        { label: 'Open reports', value: overview.openReports, icon: ShieldAlert },
      ]
    : [];

  return (
    <AdminShell subtitle="Manual review and safety">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Release 1 admin
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Review console
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              One ADMIN role. Every decision is audit-logged with admin ID, timestamp, old state,
              new state and reason.
            </p>
          </div>
          {overview?.demo || demoPreview ? <DemoBadge /> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading admin overview…" className="mt-8" />
        ) : error || !overview ? (
          <ErrorState title="Admin overview unavailable" description={error ?? 'No data.'} className="mt-8" />
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass">
                  <card.icon aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-studio-muted">
                    {card.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-extrabold text-studio-ink">{card.value}</p>
                </div>
              ))}
            </div>

            <section className="mt-8 rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">
                    Driver application queue
                  </h2>
                  <p className="mt-1 text-xs text-studio-muted">
                    Search by name, phone or application ID. Filter by review state.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <div className="relative sm:w-64">
                    <Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-studio-muted" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.currentTarget.value)}
                      placeholder="Search applications"
                      aria-label="Search applications"
                      className="pl-9"
                    />
                  </div>
                  <Select value={status} onChange={(event) => setStatus(event.currentTarget.value)} aria-label="Filter by status">
                    <option value="ALL">All statuses</option>
                    <option value="PENDING_REVIEW">Pending review</option>
                    <option value="NEEDS_CHANGES">Needs changes</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DEACTIVATED">Deactivated</option>
                  </Select>
                </div>
              </div>

              <div className="mt-6 divide-y divide-studio-border">
                {filtered.length === 0 ? (
                  <EmptyState
                    title="No matching applications"
                    description="Try a different search term or status filter."
                  />
                ) : (
                  filtered.map((application) => {
                    const params = new URLSearchParams();
                    if (demoPreview) params.set('role', 'admin');
                    const queryString = params.toString();
                    return (
                      <Link
                        key={application.id}
                        href={`/admin/applications/${application.id}${queryString ? `?${queryString}` : ''}`}
                        className="flex flex-wrap items-center justify-between gap-4 py-4 transition-colors hover:bg-studio-tint/40"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-studio-tint text-studio-ink">
                            <FileSearch aria-hidden="true" className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-display text-base font-bold text-studio-ink">
                              {application.driverName}
                            </p>
                            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-studio-muted">
                              {application.id} · {application.phone}
                            </p>
                            <p className="mt-1 text-xs text-studio-muted">
                              Submitted {new Date(application.submittedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${statusTone(application.status)}`}>
                            {application.status.replace('_', ' ')}
                          </span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 text-studio-muted" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
