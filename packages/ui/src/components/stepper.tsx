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
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-all duration-300',
                state === 'complete' &&
                  'border-[#B8F23A] bg-[#B8F23A] text-theme-accent-ink shadow-lime-glow',
                state === 'current' &&
                  'border-[#B8F23A] bg-[#B8F23A]/10 text-[#B8F23A] shadow-lime-glow ring-2 ring-[#B8F23A]/20',
                state === 'upcoming' && 'border-theme-border text-theme-muted'
              )}
            >
              {state === 'complete' ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="sr-only">{step}</span>
            <span
              aria-hidden="true"
              className={cn(
                'hidden text-xs font-medium sm:block transition-colors duration-200',
                state === 'upcoming' && 'text-theme-muted',
                state === 'current' && 'font-semibold text-white',
                state === 'complete' && 'text-theme-text'
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'hidden h-0.5 w-6 rounded-full sm:block transition-all duration-500 ease-out',
                  index < current
                    ? 'bg-[#B8F23A] shadow-[0_0_8px_rgba(184,242,58,0.4)]'
                    : 'bg-theme-border'
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
