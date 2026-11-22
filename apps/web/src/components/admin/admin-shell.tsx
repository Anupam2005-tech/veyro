'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, FileSearch, LayoutDashboard, LogOut, ShieldAlert, UsersRound } from 'lucide-react';
import { AppShell, DemoBadge, VeyroButton } from '@veyro/ui';
import { useSession } from '@/lib/auth/session-provider';
import { isDemoDataMode } from '@/lib/env';

const navigation = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/applications', label: 'Applications', icon: FileSearch, match: '/admin/applications' },
  { href: '/admin/customers', label: 'Customers', icon: UsersRound, match: '/admin/customers' },
  { href: '/admin/reports', label: 'Reports', icon: ClipboardList },
] as const;

export interface AdminShellProps {
  subtitle: string;
  children: React.ReactNode;
}

export function AdminShell({ subtitle, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, demoMode, signOut } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);
  const demoPreview = isDemoDataMode && searchParams.get('role') === 'admin';

  React.useEffect(() => {
    if (loading || demoPreview) return;
    if (!user) {
      router.replace(`/auth?role=admin&returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (profile && profile.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [demoPreview, loading, pathname, profile, router, user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace('/auth');
  }

  function isActive(item: (typeof navigation)[number]) {
    return 'match' in item && item.match
      ? pathname.startsWith(item.match)
      : pathname === item.href;
  }

  const header = (
    <header className="border-b border-studio-border bg-studio-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-studio-obsidian font-display text-sm font-extrabold text-white"
            aria-label="Veyro admin console"
          >
            V
          </Link>
          <div>
            <p className="flex items-center gap-2 font-display text-base font-extrabold leading-tight text-studio-ink">
              Veyro Admin
              <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
            </p>
            <p className="truncate text-xs text-studio-muted">{subtitle}</p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-studio-obsidian text-white'
                    : 'text-studio-muted hover:bg-studio-tint hover:text-studio-ink'
                }`}
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {demoMode || demoPreview ? <DemoBadge className="hidden sm:inline-flex" /> : null}
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
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              active ? 'text-studio-ink' : 'text-studio-muted'
            }`}
          >
            <item.icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <AppShell theme="studio" header={header} bottomNav={bottomNav}>
      <div className="min-h-[calc(100vh-4rem)] bg-studio-bg pb-20 md:pb-0">{children}</div>
    </AppShell>
  );
}
