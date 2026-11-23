'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Info,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-studio-brand text-white hover:bg-studio-brand-hover focus-visible:ring-studio-brand',
  dark: 'bg-studio-obsidian text-white hover:bg-black focus-visible:ring-studio-obsidian',
  secondary: 'bg-white text-studio-ink border border-studio-input-border hover:bg-studio-tint focus-visible:ring-studio-ink',
  ghost: 'bg-transparent text-studio-ink hover:bg-studio-tint focus-visible:ring-studio-ink',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700',
};

export function Button({
  variant = 'primary',
  busy,
  className,
  children,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'min-h-[36px] px-3 text-sm' : size === 'lg' ? 'min-h-[52px] px-6 text-base' : 'min-h-[44px] px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section
      className={cx(
        'rounded-xl border bg-studio-surface p-5',
        dark ? 'border-studio-ink/15 shadow-sm' : 'border-studio-border shadow-[0_1px_2px_rgba(17,24,39,0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-studio-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'pending';

const TONES: Record<Tone, { cls: string; icon: LucideIcon }> = {
  neutral: { cls: 'bg-studio-tint text-studio-ink', icon: CircleDashed },
  success: { cls: 'bg-emerald-100 text-emerald-900', icon: CheckCircle2 },
  warning: { cls: 'bg-amber-100 text-amber-900', icon: AlertTriangle },
  danger: { cls: 'bg-red-100 text-red-900', icon: XCircle },
  info: { cls: 'bg-sky-100 text-sky-900', icon: Info },
  pending: { cls: 'bg-violet-100 text-violet-900', icon: Clock },
};

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: 'success', ACTIVE: 'success', COMPLETED: 'success', CAPTURED: 'success', PAID: 'success', RESOLVED: 'success', ASSIGNED: 'success', CREDITED: 'success', ONLINE: 'success', WAIVED: 'success',
  PENDING_REVIEW: 'pending', SEARCHING: 'pending', SCHEDULED_QUEUED: 'pending', SCHEDULED_BROADCASTING: 'pending', UNDER_REVIEW: 'pending', PENDING: 'pending', ORDER_CREATED: 'pending', NOT_STARTED: 'pending',
  DRIVER_EN_ROUTE: 'info', ARRIVED: 'info', IN_PROGRESS: 'info', OPEN: 'info',
  NEEDS_CHANGES: 'warning', NEEDS_REBOOK: 'warning', EXPIRED: 'warning', UNPAID: 'warning', STALE: 'warning', DEMO_NOT_SENT: 'warning',
  REJECTED: 'danger', DEACTIVATED: 'danger', SUSPENDED: 'danger', CANCELLED: 'danger', CANCELLED_BY_CUSTOMER: 'danger', CANCELLED_BY_DRIVER: 'danger',
  CUSTOMER_NO_SHOW: 'danger', DRIVER_NO_SHOW: 'danger', FAILED: 'danger', DISMISSED: 'neutral', OFFLINE: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  SEARCHING: 'Waiting for driver',
  SCHEDULED_QUEUED: 'Scheduled',
  SCHEDULED_BROADCASTING: 'Finding a driver',
  ASSIGNED: 'Driver assigned',
  DRIVER_EN_ROUTE: 'Driver en route',
  NEEDS_REBOOK: 'Needs rebooking',
  CANCELLED_BY_CUSTOMER: 'Cancelled by you',
  CANCELLED_BY_DRIVER: 'Cancelled by driver',
  DEMO_NOT_SENT: 'Not sent (test mode)',
  NOT_STARTED: 'Upcoming',
};

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
  const t = TONES[tone ?? STATUS_TONE[status] ?? 'neutral'];
  const Icon = t.icon;
  const text = label ?? STATUS_LABEL[status] ?? status.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', t.cls)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {text}
    </span>
  );
}

export function Alert({ tone = 'info', title, children, action }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode }) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-lg p-3 text-sm', t.cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : ''}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-sm text-studio-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function Empty({ icon: Icon = CircleDashed, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-studio-border px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-studio-muted" aria-hidden />
      <p className="font-semibold">{title}</p>
      {children ? <div className="text-sm text-studio-muted">{children}</div> : null}
    </div>
  );
}

const fieldCls =
  'w-full min-h-[44px] rounded-lg border border-studio-input-border bg-white px-3 py-2 text-sm text-studio-ink placeholder:text-studio-muted focus:border-studio-brand focus:outline-none focus:ring-2 focus:ring-studio-brand/20 disabled:bg-studio-tint';

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-studio-muted">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldCls, props.className)}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, 'min-h-[96px]', props.className)} />;
}

export function ChipToggle({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'min-h-[36px] rounded-full border px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-ink',
        selected ? 'border-studio-brand bg-studio-brand-soft text-studio-brand' : 'border-studio-input-border bg-white text-studio-ink hover:bg-studio-tint',
      )}
    >
      {children}
    </button>
  );
}

/** Accessible modal built on <dialog>. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className="w-[min(520px,calc(100vw-32px))] rounded-xl p-0 text-studio-ink backdrop:bg-black/50"
      aria-label={title}
    >
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-studio-muted hover:bg-studio-tint" aria-label="Close">
            ✕
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-studio-muted">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-studio-muted">New driver</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" aria-label={`Rated ${value} out of 5`}>
      <span aria-hidden className="text-amber-500">★</span>
      {value.toFixed(1)}
    </span>
  );
}
