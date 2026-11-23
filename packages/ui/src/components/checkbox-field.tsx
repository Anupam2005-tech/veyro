import * as React from 'react';
import { cn } from '../lib/utils';

export interface CheckboxFieldProps {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
}

export function CheckboxField({
  id,
  label,
  description,
  checked,
  onChange,
  error,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-panel border border-theme-border bg-theme-surface p-4 text-sm text-theme-text"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#B8F23A]"
        />
        <span className="space-y-1">
          <span className="block font-medium">{label}</span>
          {description ? (
            <span className="block text-xs leading-relaxed text-theme-muted">{description}</span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-[color:var(--theme-error)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
