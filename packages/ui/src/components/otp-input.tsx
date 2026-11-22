'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export type OtpInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
  length?: number;
};

export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  { className, invalid, length = 6, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={length}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-panel border bg-theme-surface px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] text-theme-text placeholder:text-theme-muted focus:border-[color:var(--theme-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-focus)] disabled:opacity-50',
        invalid ? 'border-[color:var(--theme-error)]' : 'border-theme-border',
        className
      )}
      {...props}
    />
  );
});
