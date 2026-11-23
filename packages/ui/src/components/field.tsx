'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export interface FieldProps {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldProps) {
  const describedBy = React.useMemo(
    () =>
      [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean) as string[],
    [error, hint, id]
  );

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const control = document.getElementById(id);
    if (!control) {
      return;
    }

    const previous = (control.dataset.fieldDescribedBy ?? '').split(' ').filter(Boolean);
    const current = (control.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((token) => token && !previous.includes(token));
    const next = Array.from(new Set([...current, ...describedBy]));

    if (next.length) {
      control.setAttribute('aria-describedby', next.join(' '));
      control.dataset.fieldDescribedBy = describedBy.join(' ');
    } else {
      control.removeAttribute('aria-describedby');
      delete control.dataset.fieldDescribedBy;
    }

    if (required) {
      control.setAttribute('aria-required', 'true');
      control.dataset.fieldRequired = 'true';
    } else if (control.dataset.fieldRequired === 'true') {
      control.removeAttribute('aria-required');
      delete control.dataset.fieldRequired;
    }

    if (error) {
      control.setAttribute('aria-invalid', 'true');
      control.dataset.fieldInvalid = 'true';
    } else if (control.dataset.fieldInvalid === 'true') {
      control.removeAttribute('aria-invalid');
      delete control.dataset.fieldInvalid;
    }
  }, [describedBy, error, id, required]);

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium text-theme-text"
      >
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-[color:var(--theme-error)]">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-theme-muted">
          {hint}
        </p>
      ) : null}
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

export function fieldDescribedBy(
  id: string,
  options: { hint?: React.ReactNode; error?: string } = {}
): string | undefined {
  const ids = [options.hint ? `${id}-hint` : null, options.error ? `${id}-error` : null];
  const result = ids.filter(Boolean).join(' ');
  return result || undefined;
}
