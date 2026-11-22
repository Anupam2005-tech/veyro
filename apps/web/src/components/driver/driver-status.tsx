'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  DemoBadge,
  FormAlert,
  VeyroButton,
} from '@veyro/ui';
import { getDriverApplication, resubmitDriverApplication } from '@/lib/api/client';
import type { DriverApplicationView } from '@/lib/api/client';
import type { DriverApplicationStatus } from '@/lib/api/types';
import { isDemoDataMode } from '@/lib/env';
import { useSession } from '@/lib/auth/session-provider';
import { StudioOnboardingShell } from '../onboarding/studio-onboarding-shell';

const previewStates: DriverApplicationStatus[] = [
  'PENDING_REVIEW',
  'NEEDS_CHANGES',
  'REJECTED',
  'APPROVED',
  'DEACTIVATED',
];

const statusCopy: Record<
  DriverApplicationStatus,
  { title: string; description: string; tone: 'info' | 'warning' | 'error' | 'success' }
> = {
  PENDING_REVIEW: {
    title: 'Waiting for review',
    description:
      'Your application is in the Veyro review queue. You cannot go online until an Admin approves it.',
    tone: 'info',
  },
  NEEDS_CHANGES: {
    title: 'Changes requested',
    description:
      'An Admin reviewed your application and needs more information. Update the details below and resubmit.',
    tone: 'warning',
  },
  REJECTED: {
    title: 'Application not approved',
    description:
      'This application was rejected. You can review the reason and submit a corrected application.',
    tone: 'error',
  },
  APPROVED: {
    title: 'You are approved',
    description:
      'Your driver profile is approved. You can go online and start receiving eligible offers.',
    tone: 'success',
  },
  DEACTIVATED: {
    title: 'Account deactivated',
    description:
      'Your driver account is currently deactivated. Contact Veyro support for the next step.',
    tone: 'error',
  },
};

function statusIcon(status: DriverApplicationStatus) {
  if (status === 'APPROVED') return <CheckCircle2 aria-hidden="true" className="h-7 w-7" />;
  if (status === 'PENDING_REVIEW') return <Clock3 aria-hidden="true" className="h-7 w-7" />;
  if (status === 'NEEDS_CHANGES') return <RefreshCw aria-hidden="true" className="h-7 w-7" />;
  if (status === 'DEACTIVATED') return <Ban aria-hidden="true" className="h-7 w-7" />;
  return <AlertCircle aria-hidden="true" className="h-7 w-7" />;
}

function previewReason(status: DriverApplicationStatus): string {
  if (status === 'NEEDS_CHANGES') {
    return 'Driving licence image is unclear. Upload a full, readable front side and resubmit.';
  }
  if (status === 'REJECTED') {
    return 'The submitted licence could not be verified against the provided identity details.';
  }
  if (status === 'DEACTIVATED') {
    return 'Driver account deactivated by Admin action.';
  }
  return '';
}

export default function DriverStatus() {
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile } = useSession();
  const [application, setApplication] = React.useState<DriverApplicationView | null>(null);
  const [applicationLoading, setApplicationLoading] = React.useState(true);
  const [resubmitting, setResubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const previewParam = searchParams.get('state');
  const preview =
    previewStates.find((state) => state.toLowerCase() === previewParam?.toLowerCase()) ?? null;

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setApplication(null);
      setApplicationLoading(false);
      return () => {
        active = false;
      };
    }

    setApplicationLoading(true);
    getDriverApplication(user)
      .then((next) => {
        if (active) {
          setApplication(next);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load application status.');
        }
      })
      .finally(() => {
        if (active) {
          setApplicationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, profile?.updatedAt]);

  async function handleResubmit() {
    if (!user || preview) {
      return;
    }

    setResubmitting(true);
    setError(null);
    try {
      await resubmitDriverApplication(user);
      await refreshProfile();
      setApplication(await getDriverApplication(user));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resubmit your application.');
    } finally {
      setResubmitting(false);
    }
  }

  const status = preview ?? application?.status ?? profile?.applicationStatus ?? null;
  const adminReason =
    (preview ? previewReason(preview) : null) ??
    application?.adminReason ??
    profile?.adminReason;
  const copy = status ? statusCopy[status] : null;

  return (
    <StudioOnboardingShell
      title="Driver application status"
      subtitle="Track your Veyro review"
      stepLabel="Application"
    >
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Driver review
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-studio-ink">
                Where things stand
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-studio-muted">
                Veyro reviews every application manually. Status here always reflects the latest
                Admin decision.
              </p>
            </div>

            <div className="rounded-card border border-studio-border bg-studio-surface p-5">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-studio-ink" />
              <p className="mt-3 font-display text-base font-bold text-studio-ink">
                Pending drivers stay offline
              </p>
              <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                Online availability unlocks only after approval. This protects customers and
                keeps the service trustworthy.
              </p>
            </div>

            {isDemoDataMode ? (
              <div className="rounded-card border border-studio-border bg-studio-surface p-5">
                <div className="flex items-center gap-2">
                  <DemoBadge />
                  <span className="text-xs font-semibold text-studio-ink">State preview</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {previewStates.map((state) => (
                    <Link
                      key={state}
                      href={`/driver/status?state=${state.toLowerCase()}`}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                        preview === state
                          ? 'border-studio-ink bg-studio-ink text-white'
                          : 'border-studio-border text-studio-muted hover:text-studio-ink'
                      }`}
                    >
                      {state.replace('_', ' ').toLowerCase()}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/driver/status"
                  className="mt-3 inline-block text-xs text-studio-muted underline underline-offset-2"
                >
                  Clear preview
                </Link>
              </div>
            ) : null}
          </aside>

          <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-8">
            {loading || applicationLoading ? (
              <div className="space-y-4">
                <div className="h-16 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
                <div className="h-24 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
                <div className="h-12 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
              </div>
            ) : !user ? (
              <div className="space-y-5">
                <FormAlert tone="warning" title="Sign in to see your status">
                  Your application status is tied to your Veyro identity.
                </FormAlert>
                <VeyroButton asChild className="w-full">
                  <Link href="/auth?role=driver">Sign in as a driver</Link>
                </VeyroButton>
              </div>
            ) : !status || !copy ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-studio-tint">
                  <FileCheck2 aria-hidden="true" className="h-7 w-7 text-studio-ink" />
                </div>
                <h2 className="mt-6 font-display text-2xl font-extrabold text-studio-ink">
                  No application yet
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-studio-muted">
                  Complete the four-step driver application to enter the review queue.
                </p>
                <VeyroButton asChild className="mt-7" size="lg">
                  <Link href="/onboarding/driver">Start driver application</Link>
                </VeyroButton>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                      status === 'APPROVED'
                        ? 'bg-studio-lime text-studio-ink'
                        : 'bg-studio-tint text-studio-ink'
                    }`}
                  >
                    {statusIcon(status)}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                      Application status
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-extrabold text-studio-ink">
                      {copy.title}
                    </h2>
                  </div>
                </div>

                <p className="mt-6 text-sm leading-relaxed text-studio-muted">{copy.description}</p>

                {adminReason ? (
                  <FormAlert tone="warning" title="Admin feedback" className="mt-6">
                    {adminReason}
                  </FormAlert>
                ) : null}

                {application?.submittedAt ? (
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-studio-muted">
                    Submitted {new Date(application.submittedAt).toLocaleString()}
                  </p>
                ) : null}

                {error ? (
                  <FormAlert tone="error" title="Status action failed" className="mt-6">
                    {error}
                  </FormAlert>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {status === 'APPROVED' ? (
                    <VeyroButton asChild size="lg">
                      <Link href="/driver">Go to driver dashboard</Link>
                    </VeyroButton>
                  ) : null}
                  {status === 'NEEDS_CHANGES' || status === 'REJECTED' ? (
                    preview ? (
                      <VeyroButton asChild size="lg">
                        <Link href="/onboarding/driver">Update and resubmit</Link>
                      </VeyroButton>
                    ) : (
                      <VeyroButton
                        type="button"
                        size="lg"
                        loading={resubmitting}
                        onClick={() => void handleResubmit()}
                      >
                        Resubmit application
                      </VeyroButton>
                    )
                  ) : null}
                  <VeyroButton asChild variant="secondary" size="lg">
                    <Link href="/onboarding/driver">Review application</Link>
                  </VeyroButton>
                </div>

                <div className="mt-8 border-t border-studio-border pt-6">
                  <p className="font-display text-base font-bold text-studio-ink">
                    Private documents
                  </p>
                  {profile?.documents?.length ? (
                    <ul className="mt-4 space-y-2">
                      {profile.documents.map((document) => (
                        <li
                          key={`${document.kind}-${document.storagePath}`}
                          className="flex items-center justify-between gap-3 rounded-panel border border-studio-border px-4 py-3 text-xs"
                        >
                          <span className="truncate font-medium text-studio-ink">
                            {document.kind.replace('_', ' ').toLowerCase()} · {document.fileName}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-studio-muted">
                            Private
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-studio-muted">
                      Documents will appear here after submission. No public URLs are exposed.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </StudioOnboardingShell>
  );
}
