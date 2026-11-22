import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FareLine {
  label: string;
  amount: string;
  emphasis?: boolean;
}

export interface FareBreakdownProps {
  lines: FareLine[];
  total: string;
  note?: string;
  exclusions?: string[];
  className?: string;
}

export function FareBreakdown({
  lines,
  total,
  note,
  exclusions,
  className,
}: FareBreakdownProps) {
  return (
    <section className={cn('glass-panel rounded-card p-5 sm:p-6', className)}>
      <h3 className="font-display text-lg font-bold text-theme-text">
        Fare breakdown
      </h3>
      <dl className="mt-5 space-y-3">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <dt className={line.emphasis ? 'font-semibold text-theme-text' : 'text-theme-muted'}>
              {line.label}
            </dt>
            <dd className="font-mono text-theme-text">{line.amount}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-theme-border pt-4">
          <dt className="font-semibold text-theme-text">Total driver service fare</dt>
          <dd className="font-mono text-xl font-bold text-[color:var(--theme-focus)]">{total}</dd>
        </div>
      </dl>
      {exclusions?.length ? (
        <p className="mt-4 text-xs leading-relaxed text-theme-muted">
          Excluded (paid separately by customer): {exclusions.join(', ')}.
        </p>
      ) : null}
      {note ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-theme-muted">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {note}
        </p>
      ) : null}
    </section>
  );
}
