'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { DemoBadge, VeyroButton } from '@veyro/ui';
import { useSession } from '@/lib/auth/session-provider';

export interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
  stepLabel?: string;
  onlyLogo?: boolean;
}

export function OnboardingHeader({
  title,
  subtitle,
  stepLabel,
  onlyLogo = true,
}: OnboardingHeaderProps) {
  const router = useRouter();
  const { demoMode, signOut } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  }

  if (onlyLogo) {
    return (
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-12">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
            aria-label="Veyro home"
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
        <div className="sr-only">{title}</div>
      </header>
    );
  }

  return (
    <header className="border-b border-[#EAE7DC] bg-[#FAF9F5]">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
            aria-label="Veyro home"
          >
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={100}
              height={26}
              priority
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </Link>
          {subtitle ? (
            <>
              <div className="hidden sm:block h-4 w-px bg-[#DCD8CC]" />
              <p className="truncate text-xs text-[#5A6070] hidden sm:block">{subtitle}</p>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {stepLabel ? (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5A6070] bg-white border border-[#EAE7DC] px-2.5 py-1 rounded-full shadow-2xs">
              {stepLabel}
            </span>
          ) : null}
          {demoMode ? <DemoBadge className="hidden sm:inline-flex" /> : null}
          <Link
            href="/"
            aria-label="Veyro home"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCD8CC] bg-white px-3 text-xs font-semibold text-[#090B10] hover:bg-[#F4F1EA] transition-colors shadow-2xs"
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
            className="rounded-xl border border-[#DCD8CC] bg-white hover:bg-[#FFF5F5] hover:text-[#DC2626] transition-colors"
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
