'use client';

import * as React from 'react';
import { NotificationInbox } from '@/components/notifications/notification-inbox';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, LayoutDashboard, LogOut, Navigation, Trash2, UserRound, Wallet } from 'lucide-react';
import { AppShell, ConfirmDialog, DemoBadge, FormAlert } from '@veyro/ui';
import { getDriverProfile, requestAccountDeletion, setDriverOnline } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { usePolling } from '@/lib/hooks/use-polling';

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
  const [deletionOpen, setDeletionOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [accountNotice, setAccountNotice] = React.useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [online, setOnline] = React.useState(false);
  const profileMenu = React.useRef<HTMLDetailsElement>(null);
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
        if (!active) return;
        setActiveTripId(data.activeTripId);
        setOnline(data.online && data.applicationStatus === 'APPROVED');
        if (!isDemoDataMode && !loading && profile?.role === 'DRIVER') {
          if (!data.onboardingComplete) router.replace('/onboarding/driver');
          else if (data.applicationStatus !== 'APPROVED') router.replace('/driver/status');
        }
      })
      .catch(() => {
        if (active) { setActiveTripId(null); setOnline(false); }
      });
    return () => {
      active = false;
    };
  }, [demoPreview, loading, pathname, profile?.role, router, user]);

  // The overview owns its toggle and heartbeat. Other driver screens renew the
  // same shift without turning an explicitly offline driver back on.
  usePolling(user && online && !isDemoDataMode && pathname !== '/driver' && !signingOut ? user.uid + ':' + pathname : null,
    () => setDriverOnline(user!, true, true), next => setOnline(next.online),
    () => {}, 10000);

  React.useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenu.current?.contains(event.target) && profileMenu.current) {
        profileMenu.current.open = false;
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  React.useEffect(() => {
    if (loading || demoPreview) {
      return;
    }

    if (!user) {
      router.replace(`/auth/driver?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile && profile.role !== 'DRIVER') {
      router.replace('/onboarding/driver');
    }
  }, [demoPreview, loading, pathname, profile, router, user]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/auth/driver');
    } catch {
      setAccountNotice({ text: 'Could not sign out. Please try again.', tone: 'error' });
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeletionRequest() {
    const current = user ?? (demoPreview ? DEMO_USER : null);
    if (!current || deleting) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(current, 'DRIVER');
      setDeletionOpen(false);
      setAccountNotice({ text: isDemoDataMode ? 'Demo deletion request recorded.' : 'Your account deletion request is awaiting review.', tone: 'success' });
    } catch (error) {
      setDeletionOpen(false);
      setAccountNotice({ text: error instanceof Error ? error.message : 'Could not request account deletion.', tone: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  function isActive(item: NavItem) {
    return item.match
      ? pathname.startsWith(item.match)
      : pathname === item.href;
  }

  const header = (
    <header
      aria-label={subtitle}
      className={`border-b border-studio-border bg-studio-surface ${
        scrolled ? 'header-scrolled' : ''
      }`}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={demoPreview ? '/driver?role=driver' : '/driver'}
          className="inline-flex h-10 shrink-0 items-center rounded-md focus-visible:outline focus-visible:outline-2"
          aria-label="Veyro driver dashboard">
          <Image src="/brand/veyro-light-logo-trimmed.png" alt="Veyro" width={104} height={28} className="h-7 w-auto object-contain" />
        </Link>

        <nav aria-label="Driver navigation" className="hidden items-center gap-1 rounded-2xl border border-studio-border bg-studio-bg p-1 md:flex">
          {navigation.map((item) => {
            const active = isActive(item);
            const className = `relative inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-white text-studio-ink shadow-sm' : 'text-studio-muted hover:bg-white hover:text-studio-ink'
            } ${item.disabled ? 'cursor-not-allowed opacity-45' : ''}`;
            const content = (
              <>
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </>
            );
            return item.disabled ? (
              <span
                key={item.label}
                aria-disabled="true"
                title="No active trip right now"
                className={className}
              >
                {content}
              </span>
            ) : (
              <Link
                key={item.label}
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

        <div className="flex shrink-0 items-center gap-2">
          <NotificationInbox role="DRIVER" />
          {demoMode ? <DemoBadge className="hidden sm:inline-flex" /> : null}
          <details ref={profileMenu} className="relative" onKeyDown={event => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}>
            <summary aria-label="Profile menu" className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-studio-border bg-white px-2 pr-2.5 text-sm font-semibold text-studio-ink shadow-sm hover:bg-studio-tint [&::-webkit-details-marker]:hidden">
              <span className="grid size-7 place-items-center rounded-lg bg-studio-obsidian text-studio-lime"><UserRound aria-hidden="true" className="h-4 w-4" /></span>
              <span className="hidden max-w-24 truncate sm:inline">{profile?.fullName?.trim().split(/\s+/)[0] || 'Profile'}</span>
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-studio-muted" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-panel border border-studio-border bg-studio-surface p-1.5 text-sm text-studio-ink shadow-xl">
              <Link href={demoPreview ? '/driver/profile?role=driver' : '/driver/profile'} onClick={() => { if (profileMenu.current) profileMenu.current.open = false; }}
                aria-current={pathname === '/driver/profile' ? 'page' : undefined} className="flex items-center gap-2 rounded-control px-3 py-2.5 hover:bg-studio-tint">
                <UserRound aria-hidden="true" className="h-4 w-4" /> Edit profile and fare
              </Link>
              <Link href="/legal/privacy" className="block rounded-control px-3 py-2.5 hover:bg-studio-tint">Privacy policy</Link>
              <button type="button" disabled={signingOut} onClick={() => { if (profileMenu.current) profileMenu.current.open = false; void handleSignOut(); }}
                className="flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-left hover:bg-studio-tint">
                <LogOut aria-hidden="true" className="h-4 w-4" /> Sign out
              </button>
              <button type="button" onClick={() => { profileMenu.current?.querySelector('summary')?.focus(); if (profileMenu.current) profileMenu.current.open = false; setDeletionOpen(true); }}
                className="flex w-full items-center gap-2 rounded-control border-t border-studio-border px-3 py-2.5 text-left text-red-700 hover:bg-red-50">
                <Trash2 aria-hidden="true" className="h-4 w-4" /> Delete account
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );

  const bottomNav = (
    <div className="grid h-16 grid-cols-3">
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
          <span key={item.label} aria-disabled="true" title="No active trip right now" className={className}>
            {content}
          </span>
        ) : (
          <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={className}>
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
      <div className="driver-form-surface min-h-[calc(100vh-4rem)] bg-studio-bg pb-20 md:pb-0">
        {accountNotice ? <FormAlert tone={accountNotice.tone} title="Driver account" className="mx-4 mt-4">{accountNotice.text}</FormAlert> : null}
        {children}
      </div>
      <ConfirmDialog open={deletionOpen} onOpenChange={setDeletionOpen} title="Delete your account?" destructive
        description="Submit an account deletion request for review. You can keep using Veyro while the request is reviewed."
        confirmLabel={deleting ? 'Submitting…' : 'Request deletion'} onConfirm={() => void handleDeletionRequest()} />
    </AppShell>
  );
}
