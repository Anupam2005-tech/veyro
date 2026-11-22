import { Siren } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SafetyActionButtonProps {
  onClick: () => void;
  label?: string;
  demoMode?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SafetyActionButton({
  onClick,
  label = 'SOS',
  demoMode = false,
  disabled = false,
  className,
}: SafetyActionButtonProps) {
  return (
    <div className={cn('inline-flex flex-col items-start gap-2', className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-red-600 px-6 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Siren aria-hidden="true" className="h-5 w-5" />
        {label}
      </button>
      {demoMode ? (
        <p className="text-xs text-theme-muted">
          Demo SOS — no external message sent.
        </p>
      ) : null}
    </div>
  );
}
