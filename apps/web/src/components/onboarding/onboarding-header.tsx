'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { DemoBadge, VeyroButton } from '@veyro/ui';
import { useSession } from '@/lib/auth/session-provider';

export interface OnboardingHeaderProps {
  title: string;
  subtitle: string;
  stepLabel?: string;
}

export function OnboardingHeader({ title, subtitle, stepLabel }: OnboardingHeaderProps) {
  const router = useRouter();
  const { demoMode, signOut } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  }

  return (
    <header className="border-b border-studio-border bg-studio-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-studio-obsidian font-display text-sm font-extrabold text-white"
            aria-label="Veyro home"
          >
            V
          </Link>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold text-studio-ink">Veyro</p>
            <p className="truncate text-xs text-studio-muted">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {stepLabel ? (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-studio-muted sm:inline">
              {stepLabel}
            </span>
          ) : null}
          {demoMode ? <DemoBadge className="hidden sm:inline-flex" /> : null}
          <Link
            href="/"
            aria-label="Veyro home"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-studio-border px-3 text-xs font-semibold text-studio-ink hover:bg-studio-tint"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <VeyroButton
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Sign out"
            loading={signingOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </VeyroButton>
        </div>
      </div>
      <div className="sr-only">{title}</div>
    </header>
  );
}
