'use client';
import * as React from 'react';

// Refresh only visible pages, serialize requests, and discard responses after identity/route changes.
export function usePolling<T>(key: string | null, load: () => Promise<T>, accept: (value: T) => void,
  fail: (error: unknown) => void, intervalMs = 5000) {
  const callbacks = React.useRef({ load, accept, fail });
  callbacks.current = { load, accept, fail };
  React.useEffect(() => {
    if (!key) return;
    let active = true, pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try { const result = await callbacks.current.load(); if (active) callbacks.current.accept(result); }
      catch (error) { if (active) callbacks.current.fail(error); }
      finally { pending = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(() => void refresh(), intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [key, intervalMs]);
}
