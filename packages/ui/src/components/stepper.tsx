import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface StepperProps {
  steps: readonly string[];
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol
      aria-label="Onboarding progress"
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-3', className)}
    >
      {steps.map((step, index) => {
        const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';

        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn('flex items-center gap-2', index < steps.length - 1 ? 'mr-1 sm:mr-3' : '')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold',
                state === 'complete' && 'border-theme-accent bg-theme-accent text-theme-accent-ink',
                state === 'current' && 'border-theme-accent text-[color:var(--theme-focus)]',
                state === 'upcoming' && 'border-theme-border text-theme-muted'
              )}
            >
              {state === 'complete' ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="sr-only">{step}</span>
            <span
              aria-hidden="true"
              className={cn(
                'hidden text-xs font-medium sm:block',
                state === 'upcoming' ? 'text-theme-muted' : 'text-theme-text'
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'hidden h-px w-6 sm:block',
                  index < current ? 'bg-theme-accent' : 'bg-theme-border'
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
