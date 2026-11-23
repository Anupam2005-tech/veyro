import { cn } from '../lib/utils';

export interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs text-theme-muted">
          <span>{label}</span>
          <span className="font-mono">{Math.round(clamped)}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-theme-glass-strong"
      >
        <div
          className="h-full rounded-full bg-theme-accent transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
