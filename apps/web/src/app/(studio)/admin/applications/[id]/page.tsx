'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { MapView } from '@/components/MapView';
import { Alert, Button, Card, ErrorText, Field, KeyValue, Modal, PageHeader, SectionTitle, Spinner, StatusBadge, Textarea } from '@/components/ui';
import { apiWithMessage } from '@/lib/api';
import { dateTime, humanize, inr } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { Place } from '@/lib/types';

interface AppDetail {
  id: string;
  driverId: string;
  status: string;
  email?: string;
  profile: { name: string; phone: string; experienceYears: number; languages: string[]; bio: string };
  capabilities: { categories: string[]; transmissions: string[] };
  serviceArea: Place & { radiusKm: number };
  rates: { hourlyRateInr: number; perKmRateInr: number | null };
  documents: { id: string; kind: string; filename: string; mime: string; size: number; uploadedAt: string; url: string; urlExpiresAt: string }[];
  reviewReason: string | null;
  requestedChanges: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  driver?: { approvalStatus: string; isSuspended: boolean; suspensionReason: string | null; verifiedNoShowCount: number; rating: number | null; ratingCount: number; isOnline: boolean };
  history: { id: string; action: string; before: string | null; after: string | null; reason: string; adminName: string; createdAt: string }[];
}

type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEACTIVATE' | 'RESTORE';

const LABEL: Record<Decision, string> = {
  APPROVE: 'Approve driver',
  REJECT: 'Reject application',
  REQUEST_CHANGES: 'Request changes',
  DEACTIVATE: 'Deactivate driver',
  RESTORE: 'Restore driver',
};

export default function ApplicationDetail() {
  const me = useRequireRole('ADMIN');
  const { id } = useParams<{ id: string }>();
  const app = useApi<AppDetail>(me ? `/admin/applications/${id}` : null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const act = useAction();

  if (!me || (!app.data && !app.error)) return <Spinner />;
  const a = app.data;
  if (!a) return <Alert tone="danger">{app.error}</Alert>;
  const status = a.status;
  const reviewable = status === 'PENDING_REVIEW';
  const d = a.driver;

  async function submit() {
    if (!decision || !a) return;
    const path =
      decision === 'DEACTIVATE' ? `/admin/drivers/${a.driverId}/deactivate`
        : decision === 'RESTORE' ? `/admin/drivers/${a.driverId}/restore`
          : `/admin/applications/${a.id}/review`;
    const body =
      decision === 'DEACTIVATE' || decision === 'RESTORE'
        ? { reason }
        : { action: decision, reason, ...(decision === 'REQUEST_CHANGES' ? { changes: changes.split('\n').map((c) => c.trim()).filter(Boolean) } : {}) };
    const r = await act.run(() => apiWithMessage(path, { method: 'POST', body }));
    if (r) {
      setNotice(r.message);
      setDecision(null);
      setReason('');
      setChanges('');
      void app.reload();
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Applications</Link>
      <PageHeader title={a.profile.name || 'Applicant'} subtitle={a.email} action={<StatusBadge status={status} />} />
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {d?.isSuspended ? <Alert tone="danger" title="Suspended">{d.suspensionReason}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <SectionTitle>Profile</SectionTitle>
            <KeyValue items={[
              ['Phone', a.profile.phone],
              ['Experience', `${a.profile.experienceYears} years`],
              ['Languages', a.profile.languages.join(', ')],
              ['Bio', a.profile.bio || '—'],
              ['Categories', a.capabilities.categories.map(humanize).join(', ')],
              ['Transmissions', a.capabilities.transmissions.map(humanize).join(', ')],
              ['Hourly rate', inr(a.rates.hourlyRateInr)],
              ['Service area', `${a.serviceArea.label} · ${a.serviceArea.radiusKm} km`],
              ['Submitted', dateTime(a.submittedAt)],
            ]} />
            <MapView className="mt-4 h-48" markers={[{ id: 'area', ...a.serviceArea, kind: 'area' }]} circle={a.serviceArea} fitKey={a.id} ariaLabel="Service area map" />
          </Card>

          <Card>
            <SectionTitle>Documents</SectionTitle>
            <p className="mb-3 text-xs text-studio-muted">Documents are private. Links expire after a few minutes; reload the page to get new ones.</p>
            <ul className="grid gap-3 sm:grid-cols-3">
              {a.documents.map((doc) => (
                <li key={doc.id} className="rounded-xl border border-studio-border p-3">
                  <p className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" aria-hidden /> {humanize(doc.kind)}</p>
                  <p className="truncate text-xs text-studio-muted" title={doc.filename}>{doc.filename} · {Math.round(doc.size / 1024)} KB</p>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">Open document</a>
                </li>
              ))}
              {!a.documents.length ? <li className="text-sm text-studio-muted">No documents uploaded.</li> : null}
            </ul>
          </Card>

          <Card>
            <SectionTitle>History</SectionTitle>
            {a.history.length ? (
              <ol className="space-y-3 text-sm">
                {a.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-studio-border pl-3">
                    <p className="font-medium">{humanize(h.action)} {h.before ? <span className="text-studio-muted">({humanize(h.before)} → {humanize(h.after)})</span> : null}</p>
                    <p className="text-studio-muted">{h.reason}</p>
                    <p className="text-xs text-studio-muted">{h.adminName} · {dateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-studio-muted">No decisions yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card dark className="space-y-3">
            <p className="text-sm font-medium text-studio-muted">Decision</p>
            {reviewable ? (
              <>
                <Button className="w-full" onClick={() => setDecision('APPROVE')}>Approve</Button>
                <Button className="w-full" variant="secondary" onClick={() => setDecision('REQUEST_CHANGES')}>Request changes</Button>
                <Button className="w-full" variant="danger" onClick={() => setDecision('REJECT')}>Reject</Button>
              </>
            ) : null}
            {status === 'APPROVED' ? <Button className="w-full" variant="danger" onClick={() => setDecision('DEACTIVATE')}>Deactivate driver</Button> : null}
            {status === 'DEACTIVATED' || d?.isSuspended ? <Button className="w-full" onClick={() => setDecision('RESTORE')}>{d?.isSuspended ? 'Lift suspension' : 'Restore driver'}</Button> : null}
            {!reviewable && status !== 'APPROVED' && status !== 'DEACTIVATED' && !d?.isSuspended ? (
              <p className="text-sm text-studio-muted">Waiting for the applicant to resubmit.</p>
            ) : null}
            {a.reviewReason ? <p className="rounded-xl bg-studio-tint p-3 text-sm">Last reason: {a.reviewReason}</p> : null}
          </Card>
          {d ? (
            <Card>
              <KeyValue items={[
                ['Online', d.isOnline ? 'Yes' : 'No'],
                ['Missed pickups', `${d.verifiedNoShowCount} / 5`],
                ['Rating', d.rating ? `${d.rating} (${d.ratingCount})` : 'No ratings'],
              ]} />
            </Card>
          ) : null}
        </div>
      </div>

      <Modal open={decision !== null} onClose={() => setDecision(null)} title={decision ? LABEL[decision] : ''}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Field label="Reason (saved to the audit log)">
            {(fid) => <Textarea id={fid} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          {decision === 'REQUEST_CHANGES' ? (
            <Field label="Changes needed" hint="One per line">
              {(fid) => <Textarea id={fid} required value={changes} onChange={(e) => setChanges(e.target.value)} placeholder={'Upload a clearer licence photo\nAdd your phone number'} />}
            </Field>
          ) : null}
          <ErrorText>{act.error}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button>
            <Button type="submit" variant={decision === 'REJECT' || decision === 'DEACTIVATE' ? 'danger' : 'primary'} busy={act.busy} disabled={reason.trim().length < 3}>Confirm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
