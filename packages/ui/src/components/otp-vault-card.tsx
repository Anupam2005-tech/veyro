'use client';

import * as React from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { VeyroButton } from './button';
import { cn } from '../lib/utils';

export interface OtpVaultCardProps {
  title: string;
  mode: 'display' | 'input';
  code?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  helper?: string;
  length?: number;
  className?: string;
}

export function OtpVaultCard({
  title,
  mode,
  code = '',
  value = '',
  onChange,
  onSubmit,
  helper,
  length = 6,
  className,
}: OtpVaultCardProps) {
  const [revealed, setRevealed] = React.useState(false);
  const inputId = React.useId();
  const helperId = `${inputId}-helper`;

  return (
    <section
      className={cn(
        'rounded-card border border-white/15 bg-studio-obsidian p-5 text-white shadow-glass',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <KeyRound aria-hidden="true" className="h-4 w-4 text-[#B8F23A]" />
          {title}
        </h3>
        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-white/50" />
      </div>

      {mode === 'display' ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <output
            aria-label={`${title} digits`}
            className="font-mono text-2xl tracking-[0.15em] sm:text-3xl sm:tracking-[0.35em]"
          >
            {revealed ? code : '•'.repeat(Math.max(code.length, length))}
          </output>
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        </div>
      ) : (
        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.();
          }}
        >
          <label htmlFor={inputId} className="text-xs font-medium text-white/70">
            Six-digit code
          </label>
          <input
            id={inputId}
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={length}
            value={value}
            onChange={(event) =>
              onChange?.(
                event.currentTarget.value.replace(/\D/g, '').slice(0, length)
              )
            }
            aria-describedby={helper ? helperId : undefined}
            className="mt-2 w-full rounded-panel border border-white/25 bg-white/5 px-4 py-3 font-mono text-xl tracking-[0.2em] text-white placeholder:text-white/30 sm:text-2xl sm:tracking-[0.35em]"
            placeholder="000000"
          />
          {helper ? (
            <p id={helperId} className="mt-2 text-xs text-white/60">
              {helper}
            </p>
          ) : null}
          <VeyroButton type="submit" className="mt-4 w-full" size="sm">
            Verify code
          </VeyroButton>
        </form>
      )}
    </section>
  );
}
