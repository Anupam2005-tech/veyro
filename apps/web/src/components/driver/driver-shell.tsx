'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { LayoutDashboard, LogOut, Navigation, UserRound, Wallet } from 'lucide-react';
import { AppShell, DemoBadge, VeyroButton } from '@veyro/ui';
import { getDriverProfile } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: string;
  disabled?: boolean;
};

export interface DriverShellProps {
  subtitle: string;
  children: React.ReactNode;
}

export function DriverShell({ subtitle, children }: DriverShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, demoMode, signOut } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);
  const [activeTripId, setActiveTripId] = React.useState<string | null>(null);
  const [scrolled, setScrolled] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'driver';

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = React.useMemo<NavItem[]>(
    () => [
      { href: '/driver', label: 'Dashboard', icon: LayoutDashboard },
      {
        href: activeTripId ? `/driver/trips/${activeTripId}` : '/driver',
        label: 'Active trip',
        icon: Navigation,
        match: '/driver/trips/',
        disabled: !activeTripId,
      },
      { href: '/driver/earnings', label: 'Earnings', icon: Wallet },
      { href: '/driver/profile', label: 'Profile', icon: UserRound },
    ],
    [activeTripId]
  );

  React.useEffect(() => {
    let active = true;
    const previewUser = isDemoDataMode && demoPreview ? DEMO_USER : null;
    const targetUser = user ?? previewUser;
    if (!targetUser) {
      return () => {
        active = false;
      };
    }
    getDriverProfile(targetUser)
      .then((data) => {
        if (active) setActiveTripId(data.activeTripId);
      })
      .catch(() => {
        if (active) setActiveTripId(null);
      });
    return () => {
      active = false;
    };
  }, [demoPreview, user]);

  React.useEffect(() => {
    if (loading || demoPreview) {
      return;
    }

    if (!user) {
      router.replace(`/auth?role=driver&returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile && (profile.role !== 'DRIVER' || !profile.onboardingComplete)) {
      router.replace('/onboarding/driver');
      return;
    }

    if (profile?.applicationStatus && profile.applicationStatus !== 'APPROVED') {
      router.replace('/driver/status');
    }
  }, [demoPreview, loading, pathname, profile, router, user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  }

  function isActive(item: NavItem) {
    return item.match
      ? pathname.startsWith(item.match)
      : pathname === item.href;
  }

  const header = (
    <header
      className={`border-b border-studio-border bg-studio-surface ${
        scrolled ? 'header-scrolled' : ''
      }`}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/driver"
            className="flex h-10 w-10 items-center justify-center rounded-control bg-studio-obsidian font-display text-sm font-extrabold text-white transition-colors hover:bg-studio-ink"
            aria-label="Veyro driver studio"
          >
            V
          </Link>
          <div>
            <p className="font-display text-base font-extrabold leading-tight text-studio-ink">
              Veyro Driver
            </p>
            <p className="truncate text-xs text-studio-muted">{subtitle}</p>
          </div>
        </div>

        <nav aria-label="Driver navigation" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => {
            const active = isActive(item);
            const className = `relative inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors ${
              active ? 'text-studio-ink' : 'text-studio-muted hover:text-studio-ink'
            } ${item.disabled ? 'cursor-not-allowed opacity-45' : ''}`;
            const content = (
              <>
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </>
            );
            return item.disabled ? (
              <span
                key={item.href}
                aria-disabled="true"
                title="No active trip right now"
                className={className}
              >
                {content}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                {content}
                {active && (
                  <motion.div
                    layoutId="driver-nav-indicator"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-studio-lime"
                    transition={shouldReduceMotion ? { duration: 0 } : undefined}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {demoMode ? <DemoBadge className="hidden sm:inline-flex" /> : null}
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
    </header>
  );

  const bottomNav = (
    <div className="grid h-16 grid-cols-4">
      {navigation.map((item) => {
        const active = isActive(item);
        const className = `relative flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${
          active ? 'text-studio-ink' : 'text-studio-muted'
        } ${item.disabled ? 'cursor-not-allowed opacity-45' : ''}`;
        const content = (
          <>
            <item.icon aria-hidden="true" className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
          </>
        );
        return item.disabled ? (
          <span key={item.href} aria-disabled="true" title="No active trip right now" className={className}>
            {content}
          </span>
        ) : (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={className}>
            {content}
            {active && (
              <motion.div
                layoutId="driver-bottom-indicator"
                className="absolute bottom-0 h-0.5 w-8 bg-studio-lime"
                transition={shouldReduceMotion ? { duration: 0 } : undefined}
              />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <AppShell theme="studio" header={header} bottomNav={bottomNav}>
      <div className="min-h-[calc(100vh-4rem)] bg-studio-bg pb-20 lg:pb-0">{children}</div>
    </AppShell>
  );
}
