'use client';

import { useState } from 'react';
import { Flag, ShieldAlert } from 'lucide-react';
import { Alert, Button, Card, Empty, ErrorText, Field, Modal, PageHeader, SectionTitle, Select, Spinner, StatusBadge, Textarea } from '@/components/ui';
import { apiWithMessage } from '@/lib/api';
import { dateTime, humanize, shortId, time } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';

interface ReportRow {
  id: string;
  tripId: string;
  reporterRole: string;
  reporterName: string;
  reportedName: string;
  category: string;
  description: string;
  status: string;
  linkedLedgerEntryId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface SosRow {
  id: string;
  tripId: string;
  status: string;
  customerName: string;
  raisedByName: string;
  createdAt: string;
  cancelledAt: string | null;
  locationSnapshot: { lat: number; lng: number; capturedAt: string } | null;
  deliveryAttempts: { name: string; status: string }[];
}

export default function AdminReports() {
  const me = useRequireRole('ADMIN');
  const reports = useApi<ReportRow[]>(me ? '/admin/reports' : null, 10000);
  const sos = useApi<SosRow[]>(me ? '/admin/sos' : null, 10000);
  const [closing, setClosing] = useState<{ report: ReportRow; status: 'RESOLVED' | 'DISMISSED' } | null>(null);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<'UPHELD' | 'REJECTED'>('UPHELD');
  const [notice, setNotice] = useState<string | null>(null);
  const act = useAction();

  if (!me) return <Spinner />;

  async function update(r: ReportRow, status: string, body: Record<string, unknown> = {}) {
    const res = await act.run(() => apiWithMessage(`/admin/reports/${r.id}/status`, { method: 'POST', body: { status, ...body } }));
    if (res) {
      setNotice(res.message);
      setClosing(null);
      setNote('');
      void reports.reload();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Review safety alerts, trip reports and charge disputes." />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <ErrorText>{act.error}</ErrorText>

      <Card>
        <SectionTitle>SOS alerts</SectionTitle>
        <p className="mb-3 text-xs text-studio-muted">Alerts are recorded here. They are not yet forwarded to emergency contacts or authorities.</p>
        {sos.data?.length ? (
          <ul className="divide-y divide-studio-border text-sm">
            {sos.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" aria-hidden /> Trip #{shortId(s.tripId)} · raised by {s.raisedByName}</p>
                  <p className="text-xs text-studio-muted">
                    {dateTime(s.createdAt)}
                    {s.locationSnapshot ? ` · at ${s.locationSnapshot.lat.toFixed(5)}, ${s.locationSnapshot.lng.toFixed(5)} (${time(s.locationSnapshot.capturedAt)})` : ' · no location'}
                    {` · contacts: ${s.deliveryAttempts.map((d) => `${d.name} (${humanize(d.status)})`).join(', ') || 'none'}`}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-studio-muted">No SOS alerts.</p>
        )}
      </Card>

      <Card>
        <SectionTitle>Reports and disputes</SectionTitle>
        {reports.data && !reports.data.length ? <Empty icon={Flag} title="No reports">Reports submitted by customers and drivers will appear here.</Empty> : null}
        <ul className="space-y-3">
          {reports.data?.map((r) => {
            const open = r.status === 'OPEN' || r.status === 'UNDER_REVIEW';
            return (
              <li key={r.id} className="rounded-xl border border-studio-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {humanize(r.category)} {r.linkedLedgerEntryId ? <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Charge dispute</span> : null}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm">{r.description}</p>
                <p className="mt-1 text-xs text-studio-muted">
                  {r.reporterName} ({r.reporterRole.toLowerCase()}) about {r.reportedName} · trip #{shortId(r.tripId)} · {dateTime(r.createdAt)}
                </p>
                {r.resolutionNote ? <p className="mt-2 text-sm text-studio-muted">Resolution: {r.resolutionNote}</p> : null}
                {open ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === 'OPEN' ? <Button size="sm" variant="secondary" busy={act.busy} onClick={() => void update(r, 'UNDER_REVIEW')}>Start review</Button> : null}
                    <Button size="sm" onClick={() => setClosing({ report: r, status: 'RESOLVED' })}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={() => setClosing({ report: r, status: 'DISMISSED' })}>Dismiss</Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal open={closing !== null} onClose={() => setClosing(null)} title={closing?.status === 'RESOLVED' ? 'Resolve report' : 'Dismiss report'}>
        {closing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void update(closing.report, closing.status, { note, ...(closing.report.linkedLedgerEntryId ? { disputeOutcome: outcome } : {}) });
            }}
          >
            {closing.report.linkedLedgerEntryId ? (
              <Field label="Dispute outcome" hint="Upheld waives the charge. Rejected makes it payable again.">
                {(fid) => (
                  <Select id={fid} value={outcome} onChange={(e) => setOutcome(e.target.value as 'UPHELD' | 'REJECTED')}>
                    <option value="UPHELD">Upheld: waive the charge</option>
                    <option value="REJECTED">Rejected: the charge stands</option>
                  </Select>
                )}
              </Field>
            ) : null}
            <Field label="Resolution note (sent to the reporter)">
              {(fid) => <Textarea id={fid} required minLength={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}
            </Field>
            <ErrorText>{act.error}</ErrorText>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setClosing(null)}>Cancel</Button>
              <Button type="submit" busy={act.busy} disabled={note.trim().length < 3}>Confirm</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
