'use client';

import * as React from 'react';
import { NotificationInbox } from '@/components/notifications/notification-inbox';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  LogOut,
  MapPinned,
  ShieldCheck,
  User,
  UserRound,
} from 'lucide-react';
import { AppShell, DemoBadge } from '@veyro/ui';
import { useSession } from '@/lib/auth/session-provider';

export interface CustomerShellProps {
  subtitle?: string;
  children: React.ReactNode;
}

export function CustomerShell({ children }: CustomerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, demoMode, signOut } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close dropdown on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth gate for customer section
  React.useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(`/auth?role=customer&returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile && profile.role === 'DRIVER') {
      router.replace('/driver');
      return;
    }

    if (profile && !profile.onboardingComplete) {
      router.replace('/onboarding/customer');
      return;
    }
  }, [loading, pathname, profile, router, user]);

  async function handleSignOut() {
    setSigningOut(true);
    setDropdownOpen(false);
    await signOut();
    router.replace('/auth');
  }

  const header = (
    <header className="h-16 w-full border-b border-[#EAE7DC] bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
        {/* Left Side: Veyro trimmed logo only */}
        <div className="flex items-center">
          <Link
            href="/customer"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
            aria-label="Veyro home"
          >
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={105}
              height={30}
              className="h-6 sm:h-7 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Right Side: Profile icon pinned at the very right with dropdown */}
        <div className="relative flex items-center gap-3" ref={dropdownRef}>
          <NotificationInbox role="CUSTOMER" />
          {demoMode ? <DemoBadge className="hidden md:inline-flex" /> : null}

          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User profile and account settings"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#DCD8CC] bg-[#FAF9F5] text-[#090B10] hover:bg-[#F4F1EA] hover:border-[#090B10] transition-all shadow-xs relative overflow-hidden"
          >
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <UserRound className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            )}
            <span className="sr-only">Toggle profile menu</span>
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen ? (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[#EAE7DC] bg-white p-2 shadow-xl shadow-black/10 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              {/* User summary */}
              <div className="px-3 py-2.5 border-b border-[#EAE7DC]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold tracking-wider text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                    Customer
                  </span>
                  {demoMode ? <DemoBadge label="Demo" /> : null}
                </div>
                <p className="mt-2 text-sm font-bold text-[#090B10] truncate">
                  {profile?.fullName || user?.displayName || 'Vehicle Owner'}
                </p>
                <p className="text-xs text-[#6A7080] truncate">
                  {user?.email || user?.phoneNumber || 'Private Tier'}
                </p>
              </div>

              {/* Links */}
              <div className="py-1">
                <Link
                  href="/customer"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#090B10] hover:bg-[#FAF9F5] rounded-xl transition-colors"
                >
                  <MapPinned className="h-4 w-4 text-[#5A6070]" />
                  <span>Book a Chauffeur</span>
                </Link>
                <Link
                  href="/customer/bookings"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#090B10] hover:bg-[#FAF9F5] rounded-xl transition-colors"
                >
                  <CalendarDays className="h-4 w-4 text-[#5A6070]" />
                  <span>Trip History & Bookings</span>
                </Link>
                <Link
                  href="/customer/profile"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#090B10] hover:bg-[#FAF9F5] rounded-xl transition-colors"
                >
                  <User className="h-4 w-4 text-[#5A6070]" />
                  <span>My Profile & Vehicles</span>
                </Link>
              </div>

              {/* Sign out */}
              <div className="border-t border-[#EAE7DC] pt-1">
                <button
                  type="button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={() => void handleSignOut()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FFF5F5] rounded-xl transition-colors text-left disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 text-[#DC2626]" />
                  <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );

  return (
    <AppShell theme="studio" header={header}>
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F5] text-[#090B10]">{children}</div>
    </AppShell>
  );
}
