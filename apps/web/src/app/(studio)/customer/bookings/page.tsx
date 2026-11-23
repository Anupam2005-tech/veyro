'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Card, Empty, LinkButton, PageHeader, Spinner, StatusBadge, Stars, cx } from '@/components/ui';
import { dateTime, inr, shortId } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { Booking } from '@/lib/types';

const TABS = ['Active', 'Upcoming', 'Past', 'Favourites'] as const;

function bucket(b: Booking): (typeof TABS)[number] {
  if (b.status === 'ASSIGNED' && b.trip && ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(b.trip.status)) return 'Active';
  if (b.status === 'SEARCHING') return 'Active';
  if (['SCHEDULED_QUEUED', 'SCHEDULED_BROADCASTING', 'NEEDS_REBOOK', 'ASSIGNED'].includes(b.status)) return 'Upcoming';
  return 'Past';
}

function href(b: Booking): string {
  if (b.trip && ['COMPLETED', 'CUSTOMER_NO_SHOW'].includes(b.status)) return `/customer/trips/${b.trip.id}/summary`;
  if (b.trip && b.status === 'ASSIGNED') return `/customer/trips/${b.trip.id}`;
  return `/customer/bookings/${b.id}`;
}

export default function BookingHub() {
  const me = useRequireRole('CUSTOMER');
  const { data, loading } = useApi<Booking[]>(me ? '/bookings' : null, 10000);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Active');

  const favourites = useMemo(() => {
    const map = new Map<string, NonNullable<Booking['driver']>>();
    data?.forEach((b) => {
      if (b.driver && me?.favouriteDriverIds.includes(b.driver.id)) map.set(b.driver.id, b.driver);
    });
    return [...map.values()];
  }, [data, me]);

  if (!me) return <Spinner />;
  const list = (data ?? []).filter((b) => bucket(b) === tab);

  return (
    <div>
      <PageHeader title="My rides" action={<LinkButton href="/customer">Book a driver</LinkButton>} />
      <div role="tablist" className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('min-h-[40px] rounded-xl px-4 text-sm font-semibold', tab === t ? 'bg-studio-obsidian text-white' : 'bg-white border border-studio-border')}>
            {t}
            {t !== 'Favourites' ? <span className="ml-1 tabular-nums text-xs opacity-70">{(data ?? []).filter((b) => bucket(b) === t).length}</span> : null}
          </button>
        ))}
      </div>
      {loading && !data ? <Spinner /> : null}
      {tab === 'Favourites' ? (
        favourites.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {favourites.map((d) => (
              <Card key={d.id}>
                <p className="flex items-center gap-2 font-semibold">{d.name} <Stars value={d.rating} /></p>
                <p className="text-sm text-studio-muted">{inr(d.hourlyRateInr)}/hr · {d.languages.join(', ')}</p>
                <p className="mt-2 text-xs text-studio-muted">Favourite drivers are marked in your driver list when they are available nearby.</p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No favourite drivers yet">You can add a driver to your favourites after a trip.</Empty>
        )
      ) : data && !list.length ? (
        <Empty icon={CalendarClock} title={`No ${tab.toLowerCase()} rides`} />
      ) : (
        <ul className="space-y-2">
          {list.map((b) => (
            <li key={b.id}>
              <Link href={href(b)} className="flex flex-wrap items-center gap-3 rounded-2xl border border-studio-border bg-white p-4 hover:border-studio-input-border">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.pickup.label.split(',')[0]} → {b.destination.label.split(',')[0]}</p>
                  <p className="text-xs text-studio-muted">
                    <span className="tabular-nums">#{shortId(b.id)}</span> · {b.type === 'INSTANT' ? 'Instant' : `Scheduled ${dateTime(b.pickupAt)}`} · {b.vehicle.make} {b.vehicle.model}
                    {b.driver ? ` · ${b.driver.firstName}` : ''}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{b.trip?.fare ? inr(b.trip.fare.totalInr) : `~${inr(b.quote.displayEstimatedFareInr)}`}</span>
                <StatusBadge status={b.trip && b.status === 'ASSIGNED' ? b.trip.status : b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
