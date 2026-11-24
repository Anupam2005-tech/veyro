'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/session-provider';

export function LandingSessionGate({ children }: { children: ReactNode }) {
  const { user, authLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading) router.replace('/customer');
  }, [authLoading, router, user]);

  if (authLoading || user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FAF8F4] text-[#0B0D12]">
        <p role="status">{user ? 'Opening your dashboard…' : 'Loading Veyro…'}</p>
      </main>
    );
  }

  return children;
}
