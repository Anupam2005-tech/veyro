'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, UsersRound } from 'lucide-react';
import {
  DemoBadge,
  EmptyState,
  ErrorState,
  FormAlert,
  LoadingState,
  StatusBadge,
  type VeyroStatus,
} from '@veyro/ui';
import { getAdminCustomers } from '@/lib/api/client';
import type { CustomerAccountRecord } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { AdminShell } from './admin-shell';

const statusTone: Record<CustomerAccountRecord['status'], VeyroStatus> = {
  ACTIVE: 'approved',
  SUSPENDED: 'deactivated',
};

export default function AdminCustomers() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [customers, setCustomers] = React.useState<CustomerAccountRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getAdminCustomers(activeUser)
      .then((data) => {
        if (active) {
          setCustomers(data);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load customers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  return (
    <AdminShell subtitle="Customer account controls">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Safety operations
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Customer status
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Review suspension reasons and qualifying cancellation incidents. Restore actions are
              always recorded in the audit trail.
            </p>
          </div>
          {demoPreview ? <DemoBadge /> : null}
        </div>

        <div className="mt-8">
          <FormAlert tone="info" title="Demo account controls">
            Customer suspension and restore data in this pass is labelled demo state. A real restore
            requires the approval backend endpoint.
          </FormAlert>
        </div>

        {loading ? (
          <LoadingState label="Loading customer accounts…" className="mt-8" />
        ) : error ? (
          <ErrorState title="Customer accounts unavailable" description={error} className="mt-8" />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customer accounts found"
            description="Customer status records will appear here."
            className="mt-8"
          />
        ) : (
          <div className="mt-8 space-y-3">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}${demoPreview ? '?role=admin' : ''}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-studio-border bg-white p-5 shadow-glass transition-colors hover:border-studio-ink"
              >
                <div className="flex items-start gap-4">
                  <UsersRound aria-hidden="true" className="mt-0.5 h-5 w-5 text-studio-muted" />
                  <div>
                    <p className="font-mono text-xs font-bold text-studio-ink">{customer.id}</p>
                    <p className="mt-1 font-display text-xl font-extrabold text-studio-ink">
                      {customer.fullName}
                    </p>
                    <p className="mt-1 text-xs text-studio-muted">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={statusTone[customer.status]}
                    label={customer.status.toLowerCase()}
                  />
                  {customer.status === 'SUSPENDED' ? (
                    <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[color:var(--theme-error)]" />
                  ) : null}
                  <span className="text-xs text-studio-muted">
                    {customer.cancellationIncidentCount} qualifying cancellation
                    {customer.cancellationIncidentCount === 1 ? '' : 's'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
