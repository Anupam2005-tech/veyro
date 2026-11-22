'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, History, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  ErrorState,
  Field,
  FormAlert,
  LoadingState,
  StatusBadge,
  Textarea,
  VeyroButton,
  type VeyroStatus,
} from '@veyro/ui';
import { getAdminCustomer, restoreAdminCustomer } from '@/lib/api/client';
import type { CustomerAccountRecord } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { AdminShell } from './admin-shell';

const statusTone: Record<CustomerAccountRecord['status'], VeyroStatus> = {
  ACTIVE: 'approved',
  SUSPENDED: 'deactivated',
};

export default function AdminCustomerDetail({ customerId }: { customerId: string }) {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [customer, setCustomer] = React.useState<CustomerAccountRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getAdminCustomer(activeUser, customerId)
      .then((data) => {
        if (active) {
          setCustomer(data);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load this customer.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser, customerId]);

  async function handleRestore() {
    if (!activeUser || !reason.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await restoreAdminCustomer(activeUser, customerId, reason.trim());
      setCustomer(updated);
      setNotice('Customer restored. The restore action was added to the audit trail.');
      setRestoreOpen(false);
      setReason('');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not restore this customer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell subtitle={`Customer ${customerId}`}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href={`/admin/customers${demoPreview ? '?role=admin' : ''}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-studio-muted hover:text-studio-ink"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          All customer accounts
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Customer status detail
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              {customer?.fullName ?? customerId}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Suspension reasons and qualifying cancellation incidents are shown before any restore
              action can be recorded.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {demoPreview ? <DemoBadge /> : null}
            {customer ? (
              <StatusBadge
                status={statusTone[customer.status]}
                label={customer.status.toLowerCase()}
              />
            ) : null}
          </div>
        </div>

        {notice ? (
          <div className="mt-8">
            <FormAlert
              tone={notice.includes('Could not') ? 'error' : 'success'}
              title="Customer status update"
            >
              {notice}
            </FormAlert>
          </div>
        ) : null}

        {loading ? (
          <LoadingState label="Loading customer record…" className="mt-8" />
        ) : error || !customer ? (
          <ErrorState title="Customer record unavailable" description={error ?? 'Not found.'} className="mt-8" />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
            <div className="space-y-5">
              <section className="rounded-card border border-studio-border bg-white p-5 shadow-glass sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Account</h2>
                  <ShieldAlert aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-studio-muted">Customer ID</dt>
                    <dd className="mt-1 font-mono font-bold text-studio-ink">{customer.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Phone</dt>
                    <dd className="mt-1 font-semibold text-studio-ink">{customer.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Qualifying cancellations</dt>
                    <dd className="mt-1 font-semibold text-studio-ink">
                      {customer.cancellationIncidentCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Status</dt>
                    <dd className="mt-1 font-semibold text-studio-ink">{customer.status}</dd>
                  </div>
                </dl>
                {customer.suspensionReason ? (
                  <div className="mt-5">
                    <FormAlert tone="warning" title="Suspension reason">
                      {customer.suspensionReason}
                    </FormAlert>
                  </div>
                ) : null}
              </section>

              <section className="rounded-card border border-studio-border bg-white p-5 shadow-glass sm:p-7">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Incident history</h2>
                {customer.incidents.length === 0 ? (
                  <p className="mt-4 text-xs text-studio-muted">No incidents are recorded for this account.</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {customer.incidents.map((incident) => (
                      <li key={incident.id} className="rounded-panel border border-studio-border p-4 text-xs">
                        <p className="font-bold text-studio-ink">
                          {incident.category.replace('_', ' ')} · {incident.qualifying ? 'Qualifying' : 'Non-qualifying'}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-studio-muted">
                          {incident.id} · {new Date(incident.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-2 text-studio-muted">{incident.description}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Restore action</h2>
                  <History aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                  Restore is available only for suspended accounts. The audit reason is mandatory and
                  the action is recorded against your admin ID.
                </p>
                <VeyroButton
                  type="button"
                  className="mt-5 w-full"
                  disabled={customer.status === 'ACTIVE'}
                  onClick={() => setRestoreOpen(true)}
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Restore customer
                </VeyroButton>
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Audit trail</h2>
                {customer.auditTrail.length === 0 ? (
                  <p className="mt-4 text-xs text-studio-muted">No decisions recorded for this account yet.</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {customer.auditTrail.map((entry) => (
                      <li key={entry.id} className="rounded-panel border border-studio-border p-4 text-xs">
                        <p className="font-bold text-studio-ink">
                          {entry.action.replace('_', ' ')} · {entry.oldState} → {entry.newState}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-studio-muted">
                          {entry.adminId} · {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        {entry.reason ? <p className="mt-2 text-studio-muted">Reason: {entry.reason}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore this customer?"
        description="The restore action is audited. In real mode the approval backend must accept the request before access returns."
        confirmLabel={busy ? 'Restoring…' : 'Restore customer'}
        onConfirm={() => void handleRestore()}
      >
        <Field id="customer-restore-reason" label="Audit reason" required>
          <Textarea
            id="customer-restore-reason"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Why is this suspension being reversed?"
          />
        </Field>
      </ConfirmDialog>
    </AdminShell>
  );
}
