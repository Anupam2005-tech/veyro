import { cn } from '../lib/utils';

export interface DemoBadgeProps {
  label?: string;
  className?: string;
}

export function DemoBadge({ label = 'Demo mode', className }: DemoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border border-theme-border bg-theme-glass px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-theme-muted',
        className
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sassy" />
      {label}
    </span>
  );
}
