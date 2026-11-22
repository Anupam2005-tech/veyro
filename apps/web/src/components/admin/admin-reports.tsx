'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  Input,
  LoadingState,
  Select,
  Textarea,
  VeyroButton,
} from '@veyro/ui';
import { getAdminOverview, getAdminReports, resolveAdminReport } from '@/lib/api/client';
import type { AdminApplicationRecord, ReportRecord, ReportStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { AdminShell } from './admin-shell';

type Decision = 'UNDER_REVIEW' | 'RESOLVE' | 'DISMISS';

function statusTone(status: ReportStatus): string {
  if (status === 'RESOLVED') return 'bg-studio-lime text-studio-ink';
  if (status === 'DISMISSED') return 'bg-studio-tint text-studio-muted';
  if (status === 'UNDER_REVIEW') return 'bg-amber-100 text-amber-900';
  return 'bg-red-100 text-red-800';
}

export default function AdminReports() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [reports, setReports] = React.useState<ReportRecord[]>([]);
  const [drivers, setDrivers] = React.useState<AdminApplicationRecord[]>([]);
  const [driverQuery, setDriverQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<ReportRecord | null>(null);
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [note, setNote] = React.useState('');
  const [filter, setFilter] = React.useState('ALL');

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([getAdminReports(activeUser), getAdminOverview(activeUser)])
      .then(([next, overview]) => {
        if (active) {
          setReports(next);
          setDrivers(overview.applications);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  const filtered = reports.filter((report) => filter === 'ALL' || report.status === filter);
  const query = driverQuery.trim().toLowerCase();
  const filteredDrivers = query
    ? drivers.filter((driver) =>
        [driver.driverName, driver.phone, driver.id].some((value) =>
          value.toLowerCase().includes(query)
        )
      )
    : drivers;

  async function submitDecision() {
    if (!activeUser || !selected || !decision || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await resolveAdminReport(activeUser, selected.id, {
        action: decision,
        note: note || undefined,
      });
      setReports((current) => current.map((report) => (report.id === updated.id ? updated : report)));
      setSelected(updated);
      setNotice(
        decision === 'RESOLVE'
          ? 'Report resolved. Reporter will be notified.'
          : decision === 'DISMISS'
            ? 'Report dismissed with reason.'
            : 'Report moved to Under Review.'
      );
      setDecision(null);
      setNote('');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not update report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell subtitle="Incident reports">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Safety operations
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Reports
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Open a report to review the detail, set Under Review, Resolve with a note or Dismiss
              with a reason. Only the reporter is notified.
            </p>
          </div>
          {demoPreview ? <DemoBadge /> : null}
        </div>

        {!loading ? (
          <section className="mt-8 rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                  Driver lookup
                </p>
                <h2 className="mt-2 font-display text-xl font-extrabold text-studio-ink">
                  Search driver history
                </h2>
                <p className="mt-1 text-xs text-studio-muted">
                  Find a driver by name, phone or application ID, then open the review record for the
                  incident timeline.
                </p>
              </div>
              <div className="w-full sm:w-72">
                <Input
                  id="driver-lookup"
                  type="search"
                  value={driverQuery}
                  onChange={(event) => setDriverQuery(event.currentTarget.value)}
                  placeholder="Name, phone or application ID"
                  aria-label="Search drivers"
                />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {filteredDrivers.length === 0 ? (
                <p className="rounded-panel bg-studio-tint p-4 text-xs text-studio-muted">
                  No driver matches this search.
                </p>
              ) : (
                filteredDrivers.map((driver) => (
                  <Link
                    key={driver.id}
                    href={`/admin/applications/${driver.id}${demoPreview ? '?role=admin' : ''}`}
                    className="flex items-center justify-between gap-4 rounded-panel border border-studio-border bg-white p-4 transition-colors hover:border-studio-ink"
                  >
                    <div>
                      <p className="text-sm font-bold text-studio-ink">{driver.driverName}</p>
                      <p className="mt-1 text-xs text-studio-muted">
                        {driver.id} · {driver.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-studio-tint px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-studio-ink">
                        {driver.incidentCount} incident{driver.incidentCount === 1 ? '' : 's'}
                      </span>
                      <Search aria-hidden="true" className="h-4 w-4 text-studio-muted" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}

        {loading ? (
          <LoadingState label="Loading reports…" className="mt-8" />
        ) : error ? (
          <ErrorState title="Reports unavailable" description={error} className="mt-8" />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Report directory</h2>
                <Select value={filter} onChange={(event) => setFilter(event.currentTarget.value)} aria-label="Filter reports">
                  <option value="ALL">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <EmptyState title="No reports found" description="Try a different status filter." className="mt-6" />
              ) : (
                <div className="mt-6 divide-y divide-studio-border">
                  {filtered.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        setSelected(report);
                        setNote('');
                      }}
                      className={`flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-studio-tint/40 ${
                        selected?.id === report.id ? 'bg-studio-tint/50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-mono text-xs font-bold text-studio-ink">{report.id}</p>
                        <p className="mt-1 text-sm text-studio-ink">{report.category} · {report.tripId}</p>
                        <p className="mt-1 text-xs text-studio-muted">
                          {report.reporterRole} · {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${statusTone(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                        <Eye aria-hidden="true" className="h-4 w-4 text-studio-muted" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-5">
              {notice ? (
                <FormAlert tone={notice.includes('Could not') ? 'error' : 'success'} title="Report update">
                  {notice}
                </FormAlert>
              ) : null}

              {!selected ? (
                <div className="rounded-card border border-dashed border-studio-border bg-studio-surface p-8 text-center">
                  <ClipboardList aria-hidden="true" className="mx-auto h-8 w-8 text-studio-muted" />
                  <p className="mt-4 font-display text-xl font-bold text-studio-ink">Select a report</p>
                  <p className="mt-2 text-sm text-studio-muted">
                    Choose an item from the directory to see its detail and resolution controls.
                  </p>
                </div>
              ) : (
                <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                        {selected.id}
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                        {selected.category}
                      </h2>
                    </div>
                    <ShieldAlert aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-studio-muted">Trip</dt>
                      <dd className="font-mono font-semibold text-studio-ink">{selected.tripId}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-studio-muted">Reporter</dt>
                      <dd className="font-semibold text-studio-ink">
                        {selected.reporterRole} · {selected.reporterName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-studio-muted">Submitted</dt>
                      <dd className="font-semibold text-studio-ink">{new Date(selected.createdAt).toLocaleString()}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 rounded-panel bg-studio-bg p-4 text-sm leading-relaxed text-studio-ink">
                    {selected.description}
                  </p>
                  {selected.resolutionNote ? (
                    <FormAlert tone="success" title="Resolution note" className="mt-4">
                      {selected.resolutionNote}
                    </FormAlert>
                  ) : null}
                  {selected.dismissReason ? (
                    <FormAlert tone="warning" title="Dismiss reason" className="mt-4">
                      {selected.dismissReason}
                    </FormAlert>
                  ) : null}
                  <div className="mt-6 space-y-3">
                    <VeyroButton
                      className="w-full"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setDecision('UNDER_REVIEW');
                        setNote('');
                      }}
                    >
                      Set Under Review
                    </VeyroButton>
                    <VeyroButton
                      className="w-full"
                      disabled={busy}
                      onClick={() => {
                        setDecision('RESOLVE');
                        setNote('');
                      }}
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Resolve report
                    </VeyroButton>
                    <VeyroButton
                      className="w-full"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => {
                        setDecision('DISMISS');
                        setNote('');
                      }}
                    >
                      <XCircle aria-hidden="true" className="h-4 w-4" />
                      Dismiss report
                    </VeyroButton>
                  </div>
                  <p className="mt-3 text-[11px] text-studio-muted">
                    Reporter identity is never shown to the reported party.
                  </p>
                </section>
              )}
            </div>
          </div>
        )}

        <ConfirmDialog
          open={decision !== null}
          onOpenChange={(open) => {
            if (!open) setDecision(null);
          }}
          title={
            decision === 'RESOLVE'
              ? 'Resolve this report?'
              : decision === 'DISMISS'
                ? 'Dismiss this report?'
                : 'Move to Under Review?'
          }
          description={
            decision === 'RESOLVE'
              ? 'A resolution note is required. Only the reporter will be notified.'
              : decision === 'DISMISS'
                ? 'A dismissal reason is required and recorded.'
                : 'The report status changes to Under Review for follow-up.'
          }
          confirmLabel={decision === 'RESOLVE' ? 'Resolve' : decision === 'DISMISS' ? 'Dismiss' : 'Continue'}
          destructive={decision === 'DISMISS'}
          onConfirm={() => void submitDecision()}
        >
          {decision === 'UNDER_REVIEW' ? null : (
            <Field id="report-note" label={decision === 'RESOLVE' ? 'Resolution note' : 'Dismiss reason'} required>
              <Textarea
                id="report-note"
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
                placeholder="Record the decision and action taken"
              />
            </Field>
          )}
        </ConfirmDialog>
      </div>
    </AdminShell>
  );
}
