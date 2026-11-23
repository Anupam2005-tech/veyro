'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Alert, Card, Empty, PageHeader, SectionTitle, Spinner, StatusBadge } from '@/components/ui';
import { dateTime, humanize, inr } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';
import type { LedgerEntry } from '@/lib/types';

interface Earnings {
  entries: LedgerEntry[];
  totals: { grossInr: number; commissionInr: number; commissionPct: number; adjustmentsInr: number; netInr: number; completedTrips: number };
  rates: { hourlyRateInr: number; perKmRateInr: number | null; perKmActive: boolean };
  demo: boolean;
}

export default function DriverEarningsPage() {
  const me = useRequireRole('DRIVER');
  const { data, error } = useApi<Earnings>(me ? '/drivers/earnings' : null, 15000);
  if (!me || (!data && !error)) return <Spinner />;
  if (!data) return <Alert tone="danger">{error}</Alert>;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" subtitle="What customers owe you for completed trips and fees. Veyro takes no commission." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Gross', inr(t.grossInr)],
          [`Commission (${t.commissionPct}%)`, inr(t.commissionInr)],
          ['Net', inr(t.netInr)],
          ['Completed trips', String(t.completedTrips)],
        ].map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs font-medium text-studio-muted">{k}</p>
            <p className="text-2xl font-semibold tabular-nums">{v}</p>
          </Card>
        ))}
      </div>
      <Alert tone="info" title="About payouts">
        Payouts are not yet processed through Veyro. This statement is a record of your earnings. Your current rate is {inr(data.rates.hourlyRateInr)}/hr, billed by actual trip minutes.
      </Alert>
      <Card>
        <SectionTitle>Statement</SectionTitle>
        {data.entries.length ? (
          <ul className="divide-y divide-studio-border text-sm">
            {data.entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{humanize(e.type)}</p>
                  <p className="text-xs text-studio-muted">
                    {e.reason} · {dateTime(e.createdAt)}
                    {e.tripId ? <> · <Link className="underline" href={`/driver/trips/${e.tripId}`}>trip</Link></> : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  <span className="font-semibold tabular-nums">{inr(e.amountInr)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={Wallet} title="No earnings yet">Complete a trip to see it here.</Empty>
        )}
      </Card>
    </div>
  );
}
