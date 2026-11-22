import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileWarning,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type VeyroStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'needs_changes'
  | 'deactivated'
  | 'completed';

const statusConfig: Record<
  VeyroStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock3,
    className: 'border-[color:var(--theme-warning)] bg-theme-glass text-[color:var(--theme-warning)]',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'border-[color:var(--theme-success)] bg-theme-glass text-[color:var(--theme-success)]',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'border-[color:var(--theme-error)] bg-theme-glass text-[color:var(--theme-error)]',
  },
  active: {
    label: 'Active',
    icon: CircleDashed,
    className: 'border-[color:var(--theme-info)] bg-theme-glass text-[color:var(--theme-info)]',
  },
  needs_changes: {
    label: 'Needs changes',
    icon: FileWarning,
    className: 'border-[color:var(--theme-warning)] bg-theme-glass text-[color:var(--theme-warning)]',
  },
  deactivated: {
    label: 'Deactivated',
    icon: PauseCircle,
    className: 'border-[color:var(--theme-neutral)] bg-theme-glass text-[color:var(--theme-neutral)]',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'border-[color:var(--theme-success)] bg-theme-glass text-[color:var(--theme-success)]',
  },
};

export interface StatusBadgeProps {
  status: VeyroStatus;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        config.className,
        className
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label ?? config.label}
    </span>
  );
}

export function NoticeBadge({
  children,
  tone = 'warning',
  className,
}: {
  children: React.ReactNode;
  tone?: 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const tones = {
    warning:
      'border-[color:var(--theme-warning)] bg-theme-glass text-[color:var(--theme-warning)]',
    danger: 'border-[color:var(--theme-error)] bg-theme-glass text-[color:var(--theme-error)]',
    info: 'border-[color:var(--theme-info)] bg-theme-glass text-[color:var(--theme-info)]',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
