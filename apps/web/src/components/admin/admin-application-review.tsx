'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  FileLock2,
  History,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  ConfirmDialog,
  DemoBadge,
  ErrorState,
  Field,
  FormAlert,
  Input,
  LoadingState,
  Textarea,
  VeyroButton,
} from '@veyro/ui';
import {
  driverSafetyControl,
  downloadApplicationDocument,
  getAdminApplication,
  reviewAdminApplication,
} from '@/lib/api/client';
import type { AdminApplicationRecord, AdminReviewAction } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import RouteMap from '@/components/customer/route-map-dynamic';
import { AdminShell } from './admin-shell';

type DialogMode = AdminReviewAction | 'DEACTIVATE' | 'RESTORE' | null;

export default function AdminApplicationReview({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';
  const activeUser = user ?? (demoPreview ? DEMO_USER : null);
  const [application, setApplication] = React.useState<AdminApplicationRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogMode>(null);
  const [reason, setReason] = React.useState('');
  const [missingItems, setMissingItems] = React.useState('');
  const [documentBusy, setDocumentBusy] = React.useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = React.useState<{ url: string; kind: string; type: string } | null>(null);
  React.useEffect(() => () => { if (documentPreview) URL.revokeObjectURL(documentPreview.url); }, [documentPreview]);

  async function openDocument(id: string, kind: string, type: string, preview: boolean) {
    if (!activeUser || isDemoDataMode) return;
    setDocumentBusy(id); setNotice(null);
    try {
      const blob = await downloadApplicationDocument(activeUser, applicationId, id);
      const url = URL.createObjectURL(new Blob([blob], { type: ['image/png', 'image/jpeg', 'application/pdf'].includes(type) ? type : 'application/octet-stream' }));
      if (preview) setDocumentPreview({ url, kind, type });
      else {
        const link = document.createElement('a'); link.href = url; link.download = kind.toLowerCase() + (type === 'application/pdf' ? '.pdf' : type === 'image/png' ? '.png' : '.jpg');
        link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Private document unavailable.'); }
    finally { setDocumentBusy(null); }
  }

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getAdminApplication(activeUser, applicationId)
      .then((next) => {
        if (active) {
          setApplication(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load this application.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser, applicationId]);

  async function submitDecision() {
    if (!activeUser || !dialog || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (dialog === 'DEACTIVATE' || dialog === 'RESTORE') {
        const updated = await driverSafetyControl(activeUser, application?.driverUid ?? applicationId, {
          action: dialog,
          reason,
        });
        setApplication(updated);
        setNotice(`${dialog === 'DEACTIVATE' ? 'Driver deactivated' : 'Driver restored'} with audit note.`);
      } else {
        const updated = await reviewAdminApplication(activeUser, applicationId, {
          action: dialog,
          reason: reason || undefined,
          missingItems:
            dialog === 'REQUEST_CHANGES'
              ? missingItems.split(',').map((item) => item.trim()).filter(Boolean)
              : undefined,
        });
        setApplication(updated);
        setNotice(`Application ${dialog.toLowerCase().replace('_', ' ')} recorded.`);
        if (dialog === 'APPROVE') {
          const params = new URLSearchParams();
          if (demoPreview) params.set('role', 'admin');
          router.push(`/admin${params.toString() ? `?${params.toString()}` : ''}`);
        }
      }
      setDialog(null);
      setReason('');
      setMissingItems('');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not record this decision.');
    } finally {
      setBusy(false);
    }
  }

  const dialogCopy: Record<Exclude<DialogMode, null>, { title: string; description: string; confirm: string; destructive: boolean }> = {
    APPROVE: {
      title: 'Approve this driver?',
      description: 'The driver becomes eligible for online status after approval. This action is audit-logged.',
      confirm: 'Approve driver',
      destructive: false,
    },
    REJECT: {
      title: 'Reject this application?',
      description: 'A reason is mandatory. The driver will see the reason in their application status.',
      confirm: 'Reject application',
      destructive: true,
    },
    REQUEST_CHANGES: {
      title: 'Request changes?',
      description: 'Add a reason and a comma-separated list of missing or incorrect items.',
      confirm: 'Request changes',
      destructive: false,
    },
    DEACTIVATE: {
      title: 'Deactivate driver?',
      description: 'A mandatory reason is recorded. The driver immediately loses online and offer eligibility.',
      confirm: 'Deactivate driver',
      destructive: true,
    },
    RESTORE: {
      title: 'Restore driver?',
      description: 'Restoration requires an explicit audit note. Old and new states are recorded.',
      confirm: 'Restore driver',
      destructive: false,
    },
  };

  return (
    <AdminShell subtitle={`Application ${applicationId}`}>
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-studio-muted hover:text-studio-ink">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Back to review console
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Manual review
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Driver application
            </h1>
            <p className="mt-3 text-sm text-studio-muted">
              Verify identity documents, decide with a recorded reason, and audit every safety
              action.
            </p>
          </div>
          {demoPreview ? <DemoBadge /> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading application…" className="mt-6" />
        ) : error || !application ? (
          <ErrorState title="Application unavailable" description={error ?? 'Not found.'} className="mt-6" />
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-4">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                      {application.id}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-extrabold text-studio-ink">
                      {application.driverName}
                    </h2>
                    <p className="mt-1 text-sm text-studio-muted">{application.phone}</p>
                  </div>
                  <span className="rounded-control bg-studio-tint px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-studio-ink">
                    {application.status.replace('_', ' ')}
                  </span>
                </div>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-studio-muted">Experience</dt>
                    <dd className="mt-1 text-sm font-bold text-studio-ink">{application.experienceYears} years</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Rate</dt>
                    <dd className="mt-1 text-sm font-bold text-studio-ink">₹{application.hourlyRateInr}/hour</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Categories</dt>
                    <dd className="mt-1 text-sm text-studio-ink">{application.categories.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Transmissions</dt>
                    <dd className="mt-1 text-sm text-studio-ink">{application.transmissions.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Languages</dt>
                    <dd className="mt-1 text-sm text-studio-ink">{application.languages.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-studio-muted">Service areas</dt>
                    <dd className="mt-1 text-sm text-studio-ink">{application.serviceAreas}</dd>
                  </div>
                </dl>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-studio-muted">
                  Submitted {new Date(application.submittedAt).toLocaleString()}
                </p>
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Pickup coverage</h2>
                <p className="mt-2 text-sm text-studio-muted">{application.serviceAreas}</p>
                {application.serviceAreaPlaceIds?.length ? (
                  <ul aria-label="Selected service areas" className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {application.serviceAreaPlaceIds.map((placeId, index) => (
                      <li key={placeId}>
                        <a href={`https://www.google.com/maps/search/?api=1&query=Service+area&query_place_id=${encodeURIComponent(placeId)}`}
                          target="_blank" rel="noopener noreferrer" className="font-semibold text-studio-ink underline">
                          View area {index + 1} on Google Maps
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {application.serviceAreaBounds ? <RouteMap points={[
                  { id: 'southwest', label: 'Southwest coverage corner', address: '', position: application.serviceAreaBounds.southWest },
                  { id: 'northeast', label: 'Northeast coverage corner', address: '', position: application.serviceAreaBounds.northEast },
                ]} route={null} /> : <p className="mt-2 text-sm text-studio-muted">Pickup coverage has not been supplied. Request updated coverage before live matching.</p>}
              </section>
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Private documents</h2>
                  <FileLock2 aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-2 text-xs text-studio-muted">
                  Documents are available only through your authorized Admin session. No public download URL is stored.
                </p>
                <ul className="mt-5 space-y-2">
                  {application.documents.map((document) => (
                    <li
                      key={`${document.kind}-${document.storagePath}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-studio-border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-studio-ink">
                          {document.kind.replace('_', ' ').toLowerCase()}
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-studio-muted">
                          {document.fileName} · {(document.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      {!isDemoDataMode && document.id ? <div className="flex gap-2">
                        <VeyroButton type="button" variant="secondary" size="sm" loading={documentBusy === document.id} onClick={() => void openDocument(document.id!, document.kind, document.contentType, true)}>Preview</VeyroButton>
                        <VeyroButton type="button" variant="secondary" size="sm" disabled={documentBusy !== null} onClick={() => void openDocument(document.id!, document.kind, document.contentType, false)}>Download</VeyroButton>
                      </div> : <span className="text-xs text-studio-muted">Demo metadata</span>}
                    </li>
                  ))}
                </ul>
                {documentPreview ? <section aria-label="Private document preview" className="mt-4 space-y-3">
                  <div className="flex justify-between gap-2"><h3 className="font-semibold">{documentPreview.kind.replaceAll('_', ' ')}</h3><VeyroButton type="button" variant="secondary" size="sm" onClick={() => setDocumentPreview(null)}>Close preview</VeyroButton></div>
                  {documentPreview.type.startsWith('image/') ?
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={documentPreview.url} alt={documentPreview.kind.replaceAll('_', ' ')} className="max-h-[600px] max-w-full object-contain" /> :
                    <iframe title="Private verification document" sandbox="" src={documentPreview.url} className="h-[600px] w-full rounded-panel border border-studio-border" />}
                </section> : null}
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Incident history</h2>
                  <ShieldAlert aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                {application.incidentHistory.length === 0 ? (
                  <p className="mt-4 text-xs text-studio-muted">No driver incidents are recorded in this preview.</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {application.incidentHistory.map((incident) => (
                      <li key={incident.id} className="rounded-panel border border-studio-border p-4 text-xs">
                        <p className="font-bold text-studio-ink">
                          {incident.kind.replace('_', ' ')} · {incident.tripId ?? 'No linked trip'}
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

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Audit trail</h2>
                  <History aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                {application.auditTrail.length === 0 ? (
                  <p className="mt-4 text-xs text-studio-muted">No decisions recorded for this application yet.</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {application.auditTrail.map((entry) => (
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

            <div className="space-y-4">
              {notice ? (
                <FormAlert
                  tone={notice.includes('Could not') || notice.includes('required') ? 'error' : 'success'}
                  title="Decision update"
                >
                  {notice}
                </FormAlert>
              ) : null}
              {application.adminReason ? (
                <FormAlert tone="warning" title="Admin feedback on file">
                  {application.adminReason}
                </FormAlert>
              ) : null}
              {application.missingItems?.length ? (
                <FormAlert tone="warning" title="Missing or incorrect items">
                  {application.missingItems.join(', ')}
                </FormAlert>
              ) : null}

              {application.status === 'PENDING_REVIEW' ? <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Application decision</h2>
                <p className="mt-2 text-xs text-studio-muted">
                  Reject and request-changes require a reason. Approval is recorded with admin ID and
                  timestamp.
                </p>
                <div className="mt-5 space-y-3">
                  <VeyroButton
                    className="w-full"
                    size="lg"
                    disabled={busy}
                    onClick={() => setDialog('APPROVE')}
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Approve application
                  </VeyroButton>
                  <VeyroButton
                    className="w-full"
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setDialog('REQUEST_CHANGES');
                    }}
                  >
                    Request changes
                  </VeyroButton>
                  <VeyroButton
                    className="w-full"
                    variant="destructive"
                    size="lg"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setDialog('REJECT');
                    }}
                  >
                    <XCircle aria-hidden="true" className="h-4 w-4" />
                    Reject application
                  </VeyroButton>
                </div>
              </section> : null}

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Safety control</h2>
                  <ShieldAlert aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-2 text-xs text-studio-muted">
                  Verified no-show incidents: {application.incidentCount}. The fifth verified
                  incident suspends the driver automatically. Restoration is explicit and audited.
                </p>
                <div className="mt-5 grid gap-3">
                  <VeyroButton
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setDialog('DEACTIVATE');
                    }}
                  >
                    <Ban aria-hidden="true" className="h-4 w-4" />
                    Deactivate / suspend driver
                  </VeyroButton>
                  <VeyroButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setReason('');
                      setDialog('RESTORE');
                    }}
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    Restore driver
                  </VeyroButton>
                </div>
              </section>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={dialog !== null}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          title={dialog ? dialogCopy[dialog].title : ''}
          description={dialog ? dialogCopy[dialog].description : ''}
          confirmLabel={dialog ? dialogCopy[dialog].confirm : 'Confirm'}
          destructive={dialog ? dialogCopy[dialog].destructive : false}
          onConfirm={() => void submitDecision()}
        >
          <div className="space-y-4">
            <Field id="admin-reason" label="Reason / audit note" required>
              <Textarea
                id="admin-reason"
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
                placeholder="Enter the mandatory reason or audit note"
              />
            </Field>
            {dialog === 'REQUEST_CHANGES' ? (
              <Field id="admin-missing" label="Missing or incorrect items" hint="Comma separated">
                <Input
                  id="admin-missing"
                  value={missingItems}
                  onChange={(event) => setMissingItems(event.currentTarget.value)}
                  placeholder="Licence front, profile photo"
                />
              </Field>
            ) : null}
          </div>
        </ConfirmDialog>
      </div>
    </AdminShell>
  );
}
