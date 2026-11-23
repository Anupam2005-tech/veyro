'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { Card, Empty, Field, Input, PageHeader, Select, Spinner, StatusBadge } from '@/components/ui';
import { dateTime, humanize } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';

interface Overview {
  pendingApplications: number;
  approvedDrivers: number;
  rejectedApplications: number;
  openReports: number;
  activeSos: number;
  onlineDrivers: number;
  activeTrips: number;
  suspendedCustomers: number;
}

interface AppRow {
  id: string;
  driverId: string;
  name: string;
  status: string;
  submittedAt: string | null;
  serviceArea: string;
  documents: number;
}

const STATUSES = ['PENDING_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'DEACTIVATED'];

export default function AdminHome() {
  const me = useRequireRole('ADMIN');
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [q, setQ] = useState('');
  const overview = useApi<Overview>(me ? '/admin/overview' : null, 10000);
  const apps = useApi<AppRow[]>(me ? `/admin/applications?status=${status}&q=${encodeURIComponent(q)}` : null, 10000);
  if (!me) return <Spinner />;
  const o = overview.data;

  const kpis: [string, number | undefined, string][] = [
    ['Pending applications', o?.pendingApplications, '/admin'],
    ['Approved drivers', o?.approvedDrivers, '/admin/people'],
    ['Online drivers', o?.onlineDrivers, '/admin/people'],
    ['Active trips', o?.activeTrips, '/admin/reports'],
    ['Open reports', o?.openReports, '/admin/reports'],
    ['Active SOS alerts', o?.activeSos, '/admin/reports'],
    ['Suspended customers', o?.suspendedCustomers, '/admin/people'],
    ['Rejected applications', o?.rejectedApplications, '/admin'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin console" subtitle="Applications, drivers, trips and reports at a glance." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-2xl border border-studio-border bg-white p-4 hover:border-studio-obsidian">
            <p className="text-xs font-medium text-studio-muted">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value ?? '—'}</p>
          </Link>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="mr-auto text-lg font-semibold">Driver applications</h2>
          <Field label="Status">
            {(id) => (
              <Select id={id} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Search">{(id) => <Input id={id} type="search" placeholder="Name or ID" value={q} onChange={(e) => setQ(e.target.value)} />}</Field>
        </div>
        {apps.data && !apps.data.length ? <Empty icon={Inbox} title="No applications match">Try another status filter.</Empty> : null}
        {apps.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-medium text-studio-muted">
                <tr><th className="py-2 pr-3">Applicant</th><th className="pr-3">Service area</th><th className="pr-3">Docs</th><th className="pr-3">Submitted</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-studio-border">
                {apps.data.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 pr-3"><Link href={`/admin/applications/${a.id}`} className="font-semibold underline">{a.name || a.driverId}</Link></td>
                    <td className="pr-3">{a.serviceArea.split(',')[0]}</td>
                    <td className="pr-3">{a.documents}/3</td>
                    <td className="pr-3">{dateTime(a.submittedAt)}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
