'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Card, ErrorText, Field, Modal, PageHeader, SectionTitle, Spinner, StatusBadge, Textarea } from '@/components/ui';
import { apiWithMessage } from '@/lib/api';
import { inr, time } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { LiveLocation } from '@/lib/types';

interface DriverRow {
  id: string;
  name: string;
  approvalStatus: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  isOnline: boolean;
  verifiedNoShowCount: number;
  rating: number | null;
  hourlyRateInr: number;
  presence: LiveLocation | null;
  simulated: boolean;
  applicationId: string | null;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  status: string;
  customerCancellationCount: number;
  suspensionReason: string | null;
  outstandingBalanceInr: number;
}

type Pending = { kind: 'deactivate' | 'restore'; driver: DriverRow } | { kind: 'restore-customer'; customer: CustomerRow };

export default function AdminPeople() {
  const me = useRequireRole('ADMIN');
  const drivers = useApi<DriverRow[]>(me ? '/admin/drivers' : null, 10000);
  const customers = useApi<CustomerRow[]>(me ? '/admin/customers' : null, 10000);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const act = useAction();
  if (!me) return <Spinner />;

  async function confirm() {
    if (!pending) return;
    const path =
      pending.kind === 'restore-customer' ? `/admin/customers/${pending.customer.id}/restore`
        : `/admin/drivers/${pending.driver.id}/${pending.kind}`;
    const r = await act.run(() => apiWithMessage(path, { method: 'POST', body: { reason } }));
    if (r) {
      setNotice(r.message);
      setPending(null);
      setReason('');
      void drivers.reload();
      void customers.reload();
    }
  }

  const title = !pending ? '' : 'customer' in pending ? `Restore ${pending.customer.name}` : `${pending.kind === 'deactivate' ? 'Deactivate' : 'Restore'} ${pending.driver.name}`;

  return (
    <div className="space-y-6">
      <PageHeader title="People" subtitle="Manage driver and customer accounts." />
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <SectionTitle>Drivers</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-medium text-studio-muted">
              <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Status</th><th className="pr-3">Online</th><th className="pr-3">Rate</th><th className="pr-3">Missed pickups</th><th className="pr-3">Last location</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-studio-border">
              {drivers.data?.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 pr-3">
                    {d.applicationId ? <Link className="font-semibold underline" href={`/admin/applications/${d.applicationId}`}>{d.name}</Link> : d.name}
                    {d.simulated ? <span className="ml-2 text-xs text-studio-muted">(test)</span> : null}
                  </td>
                  <td className="pr-3"><StatusBadge status={d.isSuspended ? 'SUSPENDED' : d.approvalStatus} /></td>
                  <td className="pr-3">{d.isOnline ? 'Yes' : 'No'}</td>
                  <td className="pr-3">{inr(d.hourlyRateInr)}/hr</td>
                  <td className="pr-3">{d.verifiedNoShowCount}/5</td>
                  <td className="pr-3 tabular-nums text-xs">{d.presence ? `${time(d.presence.capturedAt)}${d.presence.stale ? ' (stale)' : ''}` : '—'}</td>
                  <td className="text-right">
                    {d.approvalStatus === 'APPROVED' && !d.isSuspended ? <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'deactivate', driver: d })}>Deactivate</Button> : null}
                    {d.approvalStatus === 'DEACTIVATED' || d.isSuspended ? <Button size="sm" variant="secondary" onClick={() => setPending({ kind: 'restore', driver: d })}>Restore</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle>Customers</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-medium text-studio-muted">
              <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Email</th><th className="pr-3">Status</th><th className="pr-3">Cancellations</th><th className="pr-3">Unpaid</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-studio-border">
              {customers.data?.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-3 font-semibold">{c.name}</td>
                  <td className="pr-3">{c.email}</td>
                  <td className="pr-3"><StatusBadge status={c.status} />{c.suspensionReason ? <p className="text-xs text-studio-muted">{c.suspensionReason}</p> : null}</td>
                  <td className="pr-3">{c.customerCancellationCount}/5</td>
                  <td className="pr-3">{inr(c.outstandingBalanceInr)}</td>
                  <td className="text-right">{c.status === 'SUSPENDED' ? <Button size="sm" variant="secondary" onClick={() => setPending({ kind: 'restore-customer', customer: c })}>Restore</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={pending !== null} onClose={() => setPending(null)} title={title}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void confirm(); }}>
          <Field label="Reason (saved to the audit log)">
            {(fid) => <Textarea id={fid} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <ErrorText>{act.error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
            <Button type="submit" variant={pending?.kind === 'deactivate' ? 'danger' : 'primary'} busy={act.busy} disabled={reason.trim().length < 3}>Confirm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
