import * as React from 'react';
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { VeyroButton } from './button';
import { cn } from '../lib/utils';

export interface StateMessageProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

function StateShell({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: StateMessageProps & { icon: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-theme-border bg-theme-surface px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-control bg-theme-glass-strong text-[color:var(--theme-focus)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-theme-muted">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <VeyroButton className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </VeyroButton>
      ) : null}
    </div>
  );
}

export function EmptyState(props: StateMessageProps) {
  return (
    <StateShell
      {...props}
      icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
    />
  );
}

export function ErrorState(props: StateMessageProps) {
  return (
    <StateShell
      {...props}
      icon={<TriangleAlert aria-hidden="true" className="h-5 w-5" />}
    />
  );
}

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'veyro-shimmer flex flex-col items-center rounded-card border border-theme-border bg-theme-surface px-6 py-12 text-center',
        className
      )}
    >
      <LoaderCircle
        aria-hidden="true"
        className="mb-4 h-6 w-6 animate-spin text-theme-accent motion-reduce:animate-none"
      />
      <p className="text-sm font-medium text-theme-muted">{label}</p>
    </div>
  );
}
