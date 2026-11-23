'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getToken, setToken } from './api';
import type { Me, Role } from './types';

interface SessionState {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<Me | null>;
  signIn: (token: string, me: Me) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return null;
    }
    try {
      const next = await api<Me>('/me');
      setMe(next);
      return next;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onOut = () => setMe(null);
    window.addEventListener('veyro:signed-out', onOut);
    return () => window.removeEventListener('veyro:signed-out', onOut);
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      me,
      loading,
      refresh,
      signIn: (token, next) => {
        setToken(token);
        setMe(next);
      },
      signOut: () => {
        setToken(null);
        setMe(null);
      },
    }),
    [me, loading, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export function homeFor(me: Me): string {
  if (me.role === 'ADMIN') return '/admin';
  if (me.role === 'DRIVER') {
    if (!me.applicationStatus || me.applicationStatus === 'DRAFT') return '/onboarding/driver';
    return me.applicationStatus === 'APPROVED' ? '/driver' : '/driver/status';
  }
  return me.onboarded ? '/customer' : '/onboarding/customer';
}

/**
 * Client-side route guard. This only decides what to render — every API call
 * is independently authorised on the server.
 */
export function useRequireRole(role: Role): Me | null {
  const { me, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    } else if (me.role !== role) {
      router.replace(homeFor(me));
    }
  }, [loading, me, role, router, pathname]);
  return me && me.role === role ? me : null;
}
