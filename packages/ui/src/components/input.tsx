'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

const controlClasses =
  'w-full rounded-panel border bg-theme-surface px-4 py-3 text-sm text-theme-text placeholder:text-theme-muted transition-colors focus:border-[color:var(--theme-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-focus)] disabled:cursor-not-allowed disabled:opacity-50';

function controlVariant(invalid?: boolean) {
  return invalid ? 'border-[color:var(--theme-error)]' : 'border-theme-border';
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, controlVariant(invalid), className)}
      {...props}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlClasses, controlVariant(invalid), 'min-h-28 resize-y', className)}
        {...props}
      />
    );
  }
);

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, controlVariant(invalid), 'appearance-none pr-10', className)}
      {...props}
    >
      {children}
    </select>
  );
});
