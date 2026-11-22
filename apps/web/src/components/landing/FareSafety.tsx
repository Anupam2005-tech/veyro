import { CircleDollarSign, Info, Timer, Wallet } from 'lucide-react';
import { FareBreakdown } from '@veyro/ui';
import { publicPolicy, scheduledCancellationSlabCopy } from '@/lib/public-policy';

const policyRows = [
  {
    icon: Timer,
    label: 'Waiting',
    copy: `${publicPolicy.freeWaitingMinutes} min free, up to ${publicPolicy.maximumWaitingMinutes} min. ₹${publicPolicy.waitingFeeInr} after the free window; ₹${publicPolicy.customerNoShowFeeInr} customer no-show replaces the waiting fee.`,
  },
  {
    icon: Wallet,
    label: 'Cancellation',
    copy: `Instant: ₹${publicPolicy.instantCancellationFeeInr}. Scheduled: ${scheduledCancellationSlabCopy.join('; ')}.`,
  },
  {
    icon: CircleDollarSign,
    label: 'Fees',
    copy: `₹${publicPolicy.customerPlatformFeeInr} customer platform fee and ${publicPolicy.driverCommissionPercent}% driver commission. No minimum fare or minimum billable time.`,
  },
];

export function FareSafety() {
  return (
    <section id="fares" className="border-b border-night-border py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
          Fares &amp; policy
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold text-night-text sm:text-4xl">
          Transparent by design.
        </h2>
        <p className="mt-4 max-w-2xl text-night-muted">
          The driver-service fare is shown separately from expenses you pay
          directly. Only HOURLY pricing is active in Release 1.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <FareBreakdown
            className="border-night-border bg-night-surface shadow-none"
            lines={[
              { label: 'Driver service · 2 hours', amount: '₹420.00', emphasis: true },
              { label: 'Estimated base fare', amount: '₹420.00' },
              { label: 'Waiting', amount: '₹0.00' },
            ]}
            total="₹420.00"
            exclusions={[...publicPolicy.excludedExpenses]}
            note="Illustrative estimate at an assumed ₹210/hour driver rate. The final fare is calculated by Veyro from the recorded trip time."
          />
          <div className="rounded-card border border-night-border bg-night-surface">
            {policyRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex gap-4 border-b border-night-border p-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-night-canvas text-night-accent">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-night-text">{row.label}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-night-muted">
                      {row.copy}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="flex items-start gap-2 p-5 text-xs text-night-muted">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Applicable policy versions and rates are frozen with each quote at
              confirmation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
