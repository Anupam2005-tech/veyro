'use client';

import { Satellite } from 'lucide-react';
import { describePermission } from '@/maps/trip-map-helpers';
import { time } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import type { GpsMode } from '@/lib/gps';
import { Alert, Card, cx } from './ui';

export function GpsPanel({
  gps,
}: {
  gps: { mode: GpsMode; setMode: (m: GpsMode) => void; permission: 'granted' | 'denied' | 'prompt' | 'unavailable'; lastSent: { at: number; accuracyM: number } | null; error: string | null };
}) {
  const now = useNow(2000);
  const age = gps.lastSent ? Math.round((now - gps.lastSent.at) / 1000) : null;
  const fresh = age !== null && age <= 30;
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold"><Satellite className="h-4 w-4" aria-hidden /> Location</p>
        <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', fresh ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>
          {fresh ? `Updated ${age}s ago` : gps.lastSent ? `Last update ${time(new Date(gps.lastSent.at).toISOString())}` : 'Waiting for location'}
        </span>
      </div>
      <div role="radiogroup" aria-label="Location source" className="grid grid-cols-3 gap-1 rounded-xl bg-studio-tint p-1 text-xs font-semibold">
        {(['device', 'demo', 'off'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={gps.mode === m} onClick={() => gps.setMode(m)} className={cx('min-h-[36px] rounded-lg', gps.mode === m ? 'bg-white shadow' : 'text-studio-muted')}>
            {m === 'device' ? 'Device' : m === 'demo' ? 'Simulated' : 'Off'}
          </button>
        ))}
      </div>
      <p className="text-xs text-studio-muted">
        {gps.mode === 'device' ? describePermission(gps.permission) : gps.mode === 'demo' ? 'Simulated location for testing on a computer.' : 'Location is off. You will not receive trip requests.'}
        {gps.lastSent ? ` · ±${Math.round(gps.lastSent.accuracyM)} m` : ''}
      </p>
      <p className="text-xs text-studio-muted">Keep this page open while you are online so your location stays up to date.</p>
      {gps.error ? <Alert tone="warning">{gps.error}</Alert> : null}
    </Card>
  );
}
