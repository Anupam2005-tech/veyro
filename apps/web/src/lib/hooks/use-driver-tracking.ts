'use client';
import * as React from 'react';
import { publishTripLocation } from '../api/client';
import type { AuthUser } from '../auth/types';
import { isDemoDataMode } from '../env';

export function useDriverTracking(user: AuthUser | null, tripId: string, enabled: boolean, fail: (message: string) => void) {
  const failRef = React.useRef(fail); failRef.current = fail;
  React.useEffect(() => {
    if (!user || !enabled || isDemoDataMode || !navigator.geolocation) return;
    let active = true, sending = false, lastSent = 0;
    const publish = async (p: GeolocationPosition) => {
      if (!active || sending || document.visibilityState === 'hidden' || Date.now() - lastSent < 9000) return;
      sending = true;
      try { await publishTripLocation(user, tripId, p); lastSent = Date.now(); }
      catch (e) { if (active) failRef.current(e instanceof Error ? e.message : 'Live location could not update.'); }
      finally { sending = false; }
    };
    const refresh = () => {
      if (!active || document.visibilityState === 'hidden') return;
      navigator.geolocation.getCurrentPosition(p => void publish(p), () => {
        if (active) failRef.current('Allow foreground GPS access to share your trip location.');
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [user, tripId, enabled]);
}
