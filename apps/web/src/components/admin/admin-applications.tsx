'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileSearch } from 'lucide-react';
import {
  DemoBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  type VeyroStatus,
} from '@veyro/ui';
import { getAdminOverview } from '@/lib/api/client';
import type { AdminApplicationRecord, DriverApplicationStatus } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { AdminShell } from './admin-shell';

const statusTone: Record<DriverApplicationStatus, VeyroStatus> = {
  PENDING_REVIEW: 'pending',
  NEEDS_CHANGES: 'needs_changes',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  DEACTIVATED: 'deactivated',
};

export default function AdminApplications() {
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [applications, setApplications] = React.useState<AdminApplicationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getAdminOverview(activeUser)
      .then((data) => {
        if (active) {
          setApplications(data.applications);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load applications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  return (
    <AdminShell subtitle="Driver applications">
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Driver review
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Applications
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Open an application to review private documents, record a decision and inspect the
              incident history before approval.
            </p>
          </div>
          {demoPreview ? <DemoBadge /> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading applications…" className="mt-6" />
        ) : error ? (
          <ErrorState title="Applications unavailable" description={error} className="mt-6" />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications found"
            description="New driver applications will appear here for review."
            className="mt-6"
          />
        ) : (
          <div className="mt-6 space-y-2">
            {applications.map((application) => (
              <Link
                key={application.id}
                href={`/admin/applications/${application.id}${demoPreview ? '?role=admin' : ''}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-studio-border bg-white p-4 transition-colors hover:bg-studio-tint/40"
              >
                <div className="flex items-start gap-4">
                  <FileSearch aria-hidden="true" className="mt-0.5 h-5 w-5 text-studio-muted" />
                  <div>
                    <p className="font-mono text-xs font-bold text-studio-ink">{application.id}</p>
                    <p className="mt-1 font-display text-xl font-extrabold text-studio-ink">
                      {application.driverName}
                    </p>
                    <p className="mt-1 text-xs text-studio-muted">
                      {application.serviceAreas} · ₹{application.hourlyRateInr}/hr
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={statusTone[application.status]}
                    label={application.status.replace('_', ' ')}
                  />
                  <span className="text-xs text-studio-muted">
                    {application.incidentCount} incident{application.incidentCount === 1 ? '' : 's'}
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
