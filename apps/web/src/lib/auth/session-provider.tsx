'use client';

import * as React from 'react';
import type { RoleIntent, VeyroProfile } from '../api/types';
import { isDemoMode } from '../env';
import type { AuthUser } from './types';

const ROLE_KEY = 'veyro:role-intent';

interface SessionContextValue {
  user: AuthUser | null;
  profile: VeyroProfile | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  roleIntent: RoleIntent | null;
  setRoleIntent: (role: RoleIntent) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [profile, setProfile] = React.useState<VeyroProfile | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [roleIntent, setRoleIntentState] = React.useState<RoleIntent | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.sessionStorage.getItem(ROLE_KEY);
    if (stored === 'customer' || stored === 'driver') {
      setRoleIntentState(stored);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import('./auth')
      .then(async ({ handleAuthRedirect, subscribeToAuth }) => {
        await handleAuthRedirect().catch(() => null);
        if (!active) {
          return;
        }
        unsubscribe = subscribeToAuth((nextUser) => {
          if (!active) {
            return;
          }
          setUser(nextUser);
          setAuthLoading(false);
        });
      })
      .catch(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return () => {
        active = false;
      };
    }

    const currentUser = user;
    setProfileLoading(true);
    void import('../api/client')
      .then(({ bootstrapSession }) => bootstrapSession(currentUser, roleIntent))
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Could not load your Veyro profile.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, roleIntent]);

  const setRoleIntent = React.useCallback((nextRole: RoleIntent) => {
    setRoleIntentState(nextRole);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ROLE_KEY, nextRole);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const currentUser = user;
    setProfileLoading(true);
    try {
      const { bootstrapSession } = await import('../api/client');
      const nextProfile = await bootstrapSession(currentUser, roleIntent);
      setProfile(nextProfile);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh your profile.');
    } finally {
      setProfileLoading(false);
    }
  }, [user, roleIntent]);

  const signOut = React.useCallback(async () => {
    setAuthLoading(true);
    try {
      const { signOutCurrentUser } = await import('./auth');
      await signOutCurrentUser();
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value: SessionContextValue = {
    user,
    profile,
    loading: authLoading || profileLoading,
    error,
    demoMode: isDemoMode,
    roleIntent,
    setRoleIntent,
    refreshProfile,
    signOut,
    clearError: () => setError(null),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider.');
  }
  return context;
}
