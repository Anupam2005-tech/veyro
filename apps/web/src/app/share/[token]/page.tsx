'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MapView } from '@/components/MapView';
import { LocationStatus } from '@/components/TripWidgets';
import { Alert, Card, KeyValue, Spinner, StatusBadge } from '@/components/ui';
import { time } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { LiveLocation } from '@/lib/types';

interface SharedTrip {
  active: boolean;
  reason?: string;
  status?: string;
  driverFirstName?: string;
  vehicleCategory?: string;
  pickupArea?: string;
  destinationArea?: string;
  routePolyline?: [number, number][];
  location?: LiveLocation | null;
  startedAt?: string | null;
}

/** Authenticated, read-only safety view (DEC-10). No dashboard chrome. */
export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const { me, loading } = useSession();
  const router = useRouter();
  const { data, error } = useApi<SharedTrip>(me ? `/share/${token}` : null, 5000);

  useEffect(() => {
    if (!loading && !me) router.replace(`/auth?next=${encodeURIComponent(`/share/${token}`)}`);
  }, [loading, me, router, token]);

  return (
    <div className="min-h-screen bg-studio-bg text-studio-ink">
      <header className="border-b border-studio-border bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 font-semibold text-lg font-semibold">
          <img src="/icons/veyro-light-64.png" alt="" className="h-6 w-6" /> Veyro <span className="text-sm font-normal text-studio-muted">Shared trip</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {!me || (!data && !error) ? <Spinner /> : null}
        {error ? <Alert tone="danger" title="Link unavailable">{error}</Alert> : null}
        {data && !data.active ? (
          <Alert tone="info" title="This trip is no longer being shared">The trip has ended or the link was revoked by the traveller.</Alert>
        ) : null}
        {data?.active ? (
          <>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{data.pickupArea} → {data.destinationArea}</p>
                <p className="text-sm text-studio-muted">Driver {data.driverFirstName} · {data.vehicleCategory}</p>
              </div>
              <StatusBadge status={data.status ?? ''} />
            </Card>
            <MapView
              className="h-[380px]"
              polyline={data.routePolyline}
              markers={data.location ? [{ id: 'drv', lat: data.location.lat, lng: data.location.lng, kind: data.location.stale ? 'driver-stale' : 'driver', label: 'Vehicle' }] : []}
              fitKey={token}
              ariaLabel="Shared trip map"
            />
            <LocationStatus location={data.location ?? null} label="Vehicle location" />
            <Card>
              <KeyValue items={[['Trip started', time(data.startedAt)], ['Status', data.status ?? '—']]} />
            </Card>
            <p className="text-xs text-studio-muted">This view does not include contact or payment details.</p>
          </>
        ) : null}
        <Link href="/" className="block text-center text-sm underline">About Veyro</Link>
      </main>
    </div>
  );
}
