'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { NotificationItem, Role } from '@/lib/types';
import { cx } from './ui';

const NAV: Record<Role, [string, string][]> = {
  CUSTOMER: [
    ['/customer', 'Book'],
    ['/customer/bookings', 'My rides'],
    ['/customer/profile', 'Profile'],
  ],
  DRIVER: [
    ['/driver', 'Dashboard'],
    ['/driver/earnings', 'Earnings'],
    ['/driver/profile', 'Profile'],
    ['/driver/status', 'Status'],
  ],
  ADMIN: [
    ['/admin', 'Overview'],
    ['/admin/reports', 'Reports & SOS'],
    ['/admin/people', 'Drivers & customers'],
    ['/admin/audit', 'Audit log'],
  ],
};

function Notifications({ unread, onRead }: { unread: number; onRead: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    void api<NotificationItem[]>('/notifications').then(setItems).catch(() => setItems([]));
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 hover:bg-studio-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-ink"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-studio-sassy px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-studio-border bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              className="text-xs font-semibold underline"
              onClick={async () => {
                await api('/notifications/read-all', { method: 'POST' });
                onRead();
                setItems((list) => list?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
              }}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-auto">
            {items === null ? <li className="p-3 text-sm text-studio-muted">Loading…</li> : null}
            {items?.length === 0 ? <li className="p-3 text-sm text-studio-muted">No notifications.</li> : null}
            {items?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className={cx('w-full rounded-xl px-3 py-2 text-left hover:bg-studio-tint', !n.readAt && 'bg-studio-tint/60')}
                >
                  <p className="text-sm font-semibold">
                    {!n.readAt ? <span className="mr-1 inline-block h-2 w-2 rounded-full bg-studio-sassy" aria-label="Unread" /> : null}
                    {n.title}
                  </p>
                  <p className="text-xs text-studio-muted">{n.body}</p>
                  <p className="mt-0.5 tabular-nums text-[11px] text-studio-muted">{dateTime(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, signOut, refresh } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Keep the unread badge and account flags current.
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [me, refresh]);

  const nav = me ? NAV[me.role] : [];
  return (
    <div className="min-h-screen bg-studio-bg text-studio-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-studio-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href={me ? nav[0]?.[0] ?? '/' : '/'} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src="/icons/veyro-light-64.png" alt="" className="h-7 w-7" />
            Veyro
            {me?.role === 'ADMIN' ? <span className="rounded-md bg-studio-tint px-1.5 py-0.5 text-[11px] font-semibold text-studio-muted">Admin</span> : null}
          </Link>
          <nav aria-label="Primary" className="ml-4 hidden gap-1 md:flex">
            {nav.map(([href, label]) => {
              const active = href === pathname || (href !== nav[0]?.[0] && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx('rounded-lg px-3 py-2 text-sm font-medium', active ? 'bg-studio-tint text-studio-ink' : 'text-studio-muted hover:bg-studio-tint hover:text-studio-ink')}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {me ? <Notifications unread={me.unreadNotifications} onRead={() => void refresh()} /> : null}
            {me ? (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{me.name || me.email}</p>
                <p className="text-xs text-studio-muted">{me.role === 'ADMIN' ? 'Administrator' : me.role === 'DRIVER' ? 'Driver' : 'Customer'}</p>
              </div>
            ) : null}
            {me ? (
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push('/auth');
                }}
                className="rounded-xl p-2 hover:bg-studio-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-ink"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
        {nav.length ? (
          <nav aria-label="Primary mobile" className="flex gap-1 overflow-x-auto border-t border-studio-border px-4 py-2 md:hidden">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={cx('shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium', href === pathname ? 'bg-studio-ink text-white' : 'bg-studio-tint')}
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {me?.role === 'CUSTOMER' && me.outstandingBalanceInr > 0 && !pathname.startsWith('/customer/profile') ? (
        <div className="sticky top-16 z-30 bg-amber-100 text-amber-950">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
            <span>
              <strong>You have an unpaid balance of ₹{me.outstandingBalanceInr}.</strong> Please settle it to make new bookings.
            </span>
            <Link href="/customer/profile#payments" className="rounded-md bg-studio-ink px-3 py-1.5 font-medium text-white">
              Pay now
            </Link>
          </div>
        </div>
      ) : null}
      {me?.status === 'SUSPENDED' ? (
        <div className="bg-red-100 text-red-900">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
            <strong>Account suspended.</strong> {me.suspensionReason ?? ''}
          </div>
        </div>
      ) : null}
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
