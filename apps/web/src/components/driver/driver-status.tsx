'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import driverIllustration from '../../../public/img5.jpeg';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Ban,
  CarFront,
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
import { usePolling } from '@/lib/hooks/use-polling';
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

function statusBadgeStyles(status: DriverApplicationStatus) {
  if (status === 'APPROVED') {
    return {
      iconBg: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30',
      badge: 'border-emerald-500/30 bg-emerald-50 text-emerald-800',
      cardBorder: 'border-emerald-200/70',
    };
  }
  if (status === 'PENDING_REVIEW') {
    return {
      iconBg: 'bg-sky-500/15 text-sky-700 border border-sky-500/30',
      badge: 'border-sky-500/30 bg-sky-50 text-sky-800',
      cardBorder: 'border-sky-200/70',
    };
  }
  if (status === 'NEEDS_CHANGES') {
    return {
      iconBg: 'bg-amber-500/15 text-amber-700 border border-amber-500/30',
      badge: 'border-amber-500/30 bg-amber-50 text-amber-800',
      cardBorder: 'border-amber-200/70',
    };
  }
  if (status === 'DEACTIVATED') {
    return {
      iconBg: 'bg-zinc-500/15 text-zinc-700 border border-zinc-500/30',
      badge: 'border-zinc-500/30 bg-zinc-100 text-zinc-800',
      cardBorder: 'border-zinc-300/70',
    };
  }
  return {
    iconBg: 'bg-rose-500/15 text-rose-700 border border-rose-500/30',
    badge: 'border-rose-500/30 bg-rose-50 text-rose-800',
    cardBorder: 'border-rose-200/70',
  };
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, refreshProfile } = useSession();
  const [application, setApplication] = React.useState<DriverApplicationView | null>(null);
  const [applicationLoading, setApplicationLoading] = React.useState(true);
  const [resubmitting, setResubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const previewParam = searchParams.get('state');
  const preview =
    isDemoDataMode ? previewStates.find((state) => state.toLowerCase() === previewParam?.toLowerCase()) ?? null : null;

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

  const approved = !isDemoDataMode && application?.status === 'APPROVED';
  usePolling(user && !isDemoDataMode && !approved ? user.uid : null,
    () => getDriverApplication(user!), next => { setApplication(next); setError(null); }, () => {}, 10000);
  React.useEffect(() => {
    if (approved) router.replace('/driver');
  }, [approved, router]);

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

  if (approved) return (
    <div data-theme="studio" className="grid min-h-screen place-items-center bg-studio-bg text-studio-ink" role="status">
      Opening your driver dashboard…
    </div>
  );

  return (
    <div data-theme="studio" className="min-h-screen bg-[#FAF8F4] text-[#0B0D12] flex flex-col antialiased">
      {/* Top Navbar — Strictly ONLY the Logo on the Left Side */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-12">
          <Link
            href="/"
            aria-label="Veyro home"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
          >
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={104}
              height={28}
              priority
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </Link>
        </div>
      </header>

      {/* Main 2-Column Full-Screen Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-64px)]">
        {/* ===================================================================
            LEFT COLUMN: STATUS & DETAILS
            =================================================================== */}
        <section className="w-full lg:w-[50%] xl:w-[48%] 2xl:w-[45%] bg-white border-r border-black/[0.06] flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-12 lg:px-14 xl:px-16">
          <div className="w-full max-w-xl mx-auto lg:max-w-none space-y-6">
            {/* Mobile / Tablet Showcase Hero with /img5.jpeg */}
            <div className="lg:hidden relative overflow-hidden rounded-2xl bg-black mb-6 p-6 text-white shadow-lg">
              <Image
                src={driverIllustration}
                alt=""
                fill
                sizes="(max-width: 1023px) 100vw, 1px"
                priority
                className="object-cover object-center filter brightness-[0.62] contrast-[1.18]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/75" />
              <div className="relative z-10 space-y-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-mono font-medium tracking-wider text-[#B8F23A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B8F23A] animate-ping" />
                  PARTNER STATUS · PRIVATE ASSETS
                </div>
                <h2 className="font-display text-2xl font-black text-white leading-tight">
                  Drive the city&apos;s finest machines.{' '}
                  <span className="text-[#B8F23A]">Keep 100% of the fare.</span>
                </h2>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-studio-muted">
                  APPLICATION STATUS
                </span>
                {status ? (
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider ${
                      statusBadgeStyles(status).badge
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0B0D12]">
                Where things stand
              </h1>
              <p className="mt-2 text-sm text-[#5B6170] leading-relaxed">
                Veyro reviews every chauffeur application manually. Status here reflects the latest audit desk decision.
              </p>
            </div>

            {loading || applicationLoading ? (
              <div className="space-y-4 py-6">
                <div className="h-16 animate-pulse rounded-2xl bg-black/[0.04]" />
                <div className="h-24 animate-pulse rounded-2xl bg-black/[0.04]" />
              </div>
            ) : !user ? (
              <div className="space-y-5 py-4">
                <FormAlert tone="warning" title="Sign in to see your status">
                  Your application status is tied to your Veyro chauffeur account.
                </FormAlert>
                <VeyroButton asChild size="lg" className="w-full h-12 rounded-xl bg-[#0B0D12] text-white hover:bg-black font-bold">
                  <Link href="/auth/driver">Sign in to Chauffeur Portal</Link>
                </VeyroButton>
              </div>
            ) : !status || !copy ? (
              <div className="py-8 text-center rounded-2xl border border-black/[0.08] bg-[#FAF8F4] p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B0D12] text-[#B8F23A]">
                  <FileCheck2 aria-hidden="true" className="h-7 w-7" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-bold text-[#0B0D12]">
                  No application submitted yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[#5B6170] leading-relaxed">
                  Complete the four-step driver application to join the verified elite chauffeur roster.
                </p>
                <VeyroButton asChild className="mt-6 h-12 rounded-xl bg-[#0B0D12] text-white hover:bg-black font-bold px-6" size="lg">
                  <Link href="/onboarding/driver">Start Driver Application</Link>
                </VeyroButton>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Hero Card */}
                <div
                  className={`rounded-2xl border p-6 transition-all ${
                    status ? statusBadgeStyles(status).cardBorder : 'border-black/[0.08]'
                  } bg-[#FAF8F4]`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        statusBadgeStyles(status).iconBg
                      }`}
                    >
                      {statusIcon(status)}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-[#0B0D12]">{copy.title}</h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#5B6170] leading-relaxed">
                        {copy.description}
                      </p>
                    </div>
                  </div>

                  {adminReason ? (
                    <div className="mt-5 rounded-xl border border-black/[0.08] bg-white p-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-studio-muted">
                        Admin Feedback
                      </p>
                      <p className="mt-1 text-xs text-[#0B0D12] leading-relaxed">{adminReason}</p>
                    </div>
                  ) : null}

                  {error ? (
                    <FormAlert tone="error" title="Action failed" className="mt-4">
                      {error}
                    </FormAlert>
                  ) : null}

                  {status === 'NEEDS_CHANGES' ? (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <VeyroButton
                        type="button"
                        loading={resubmitting}
                        onClick={() => void handleResubmit()}
                        className="h-11 rounded-xl bg-[#0B0D12] text-white hover:bg-black font-bold flex items-center justify-center gap-2"
                      >
                        <RefreshCw aria-hidden="true" className="h-4 w-4" />
                        Resubmit for review
                      </VeyroButton>
                      <VeyroButton asChild variant="secondary" className="h-11 rounded-xl border-black/[0.12]">
                        <Link href="/onboarding/driver">Update Application Details</Link>
                      </VeyroButton>
                    </div>
                  ) : null}

                  {status === 'APPROVED' ? (
                    <div className="mt-6">
                      <VeyroButton asChild size="lg" className="h-11 rounded-xl bg-[#0B0D12] text-white hover:bg-black font-bold w-full sm:w-auto px-6">
                        <Link href="/driver">Open Driver Cockpit</Link>
                      </VeyroButton>
                    </div>
                  ) : null}
                </div>

                {/* Uploaded Documents Vault */}
                <div className="rounded-2xl border border-black/[0.08] bg-[#FAF8F4] p-5">
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-studio-muted">
                    Encrypted Documents Vault
                  </p>
                  {profile?.documents && profile.documents.length > 0 ? (
                    <ul className="mt-3 divide-y divide-black/[0.06]">
                      {profile.documents.map((document) => (
                        <li
                          key={`${document.kind}-${document.storagePath}`}
                          className="flex items-center justify-between gap-3 py-3 text-xs"
                        >
                          <span className="truncate font-semibold text-[#0B0D12]">
                            {document.kind.replace('_', ' ')} · {document.fileName}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-green-800 bg-green-50 px-2 py-0.5 rounded-full font-bold">
                            Encrypted
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-[#5B6170]">
                      Documents will appear here after submission. Zero public exposure.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Minimal security footer */}
          <footer className="pt-6 mt-8 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-studio-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#84CC16]" />
              Manual Operations Clearance
            </span>
            <span className="font-mono text-[10.5px]">0% TAKE RATE</span>
          </footer>
        </section>

        {/* ===================================================================
            RIGHT COLUMN: IMAGE COVERING WHOLE DIV + EDITORIAL TEXTS ABOVE IT
            =================================================================== */}
        <section className="hidden lg:flex flex-1 relative bg-black overflow-hidden lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] select-none">
          {/* Full-bleed background image */}
          <Image
            src={driverIllustration}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 1px"
            priority
            className="object-cover object-center filter brightness-[0.68] contrast-[1.15]"
          />

          {/* High-Contrast Obsidian Gradient & Vignette Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/65" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/35" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

          {/* Texts Above Image */}
          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white h-full">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-mono font-medium tracking-[0.2em] text-[#B8F23A] backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B8F23A] animate-ping" />
                PARTNER PROTOCOL · PRIVATE ASSETS
              </div>
              <h2 className="font-display text-4xl xl:text-5xl 2xl:text-[54px] font-black leading-[1.04] tracking-[-0.035em] text-white">
                Drive the city&apos;s finest machines.{' '}
                <span className="block mt-1 text-[#B8F23A]">
                  Keep 100% of the fare.
                </span>
              </h2>
              <p className="text-base xl:text-lg text-white/80 leading-relaxed max-w-lg font-light">
                No company beaters. No algorithmic surge cuts. Private car owners hand you the keys to their Honda, Audi, BMW, and EV collections.
              </p>
            </div>

            {/* Middle Feature Cards */}
            <div className="my-auto py-6 grid gap-4 max-w-xl">
              <div className="flex items-start gap-4 rounded-2xl border border-white/12 bg-black/55 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-black/70">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B8F23A]/15 text-[#B8F23A] border border-[#B8F23A]/30 font-mono text-sm font-bold">
                  0%
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white tracking-wide">
                    Zero Platform Commission
                  </h3>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">
                    Set your hourly rate. Veyro charges drivers no platform commission.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/12 bg-black/55 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-black/70">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20">
                  <ShieldCheck className="h-5 w-5 text-[#B8F23A]" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white tracking-wide">
                    Dual-OTP Key Custody
                  </h3>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">
                    Trip start and return are cryptographically verified. Keys are handed over only to authorized chauffeurs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/12 bg-black/55 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-black/70">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20">
                  <CarFront className="h-5 w-5 text-[#B8F23A]" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white tracking-wide">
                    Curated Private Fleet
                  </h3>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">
                    Take command of pristine automatics, DCTs, luxury sedans, MPVs, and performance electrics.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Status & Credibility Seal */}
            <div className="border-t border-white/12 pt-5 flex items-center justify-between text-xs text-white/60 font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#84CC16]" />
                <span className="tracking-wider text-white">BANGALORE INTAKE LIVE</span>
              </div>
              <span className="tracking-widest uppercase text-white/50">
                FLAGSHIP STANDARDS ONLY
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
