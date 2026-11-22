import { CircleDot, Timer } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DynamicTripPillProps {
  label: string;
  countdown?: string;
  detail?: string;
  tone?: 'neutral' | 'live' | 'warning';
  className?: string;
}

const toneClasses = {
  neutral: 'border-theme-border bg-theme-glass text-theme-text',
  live: 'border-[color:var(--theme-success)] bg-theme-glass text-[color:var(--theme-success)]',
  warning: 'border-[color:var(--theme-warning)] bg-theme-glass text-[color:var(--theme-warning)]',
} as const;

export function DynamicTripPill({
  label,
  countdown,
  detail,
  tone = 'neutral',
  className,
}: DynamicTripPillProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-3 rounded-full border px-4 py-2 text-sm',
        toneClasses[tone],
        className
      )}
    >
      <CircleDot aria-hidden="true" className="h-4 w-4" />
      <span className="font-semibold">{label}</span>
      {countdown ? (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          <Timer aria-hidden="true" className="h-3.5 w-3.5" />
          {countdown}
        </span>
      ) : null}
      {detail ? <span className="text-xs opacity-80">{detail}</span> : null}
    </div>
  );
}
