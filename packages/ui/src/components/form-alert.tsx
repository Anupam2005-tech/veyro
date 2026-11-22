import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export type FormAlertTone = 'error' | 'success' | 'info' | 'warning';

export interface FormAlertProps {
  tone?: FormAlertTone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

const toneStyles: Record<FormAlertTone, { icon: React.ElementType; className: string }> = {
  error: {
    icon: AlertCircle,
    className:
      'border-[color:var(--theme-error)] bg-theme-glass text-[color:var(--theme-error)]',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-theme-accent bg-theme-glass text-theme-text',
  },
  info: { icon: Info, className: 'border-theme-border bg-theme-glass text-theme-text' },
  warning: {
    icon: TriangleAlert,
    className: 'border-amber-500 bg-amber-500/10 text-theme-text',
  },
};

export function FormAlert({ tone = 'info', title, children, className }: FormAlertProps) {
  const { icon: Icon, className: toneClass } = toneStyles[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-panel border p-4 text-sm', toneClass, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="text-xs leading-relaxed opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
