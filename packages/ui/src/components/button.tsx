'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type VeyroButtonVariant =
  | 'primary'
  | 'obsidian'
  | 'secondary'
  | 'destructive'
  | 'ghost';

export type VeyroButtonSize = 'sm' | 'md' | 'lg';

export interface VeyroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VeyroButtonVariant;
  size?: VeyroButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

const variantClasses: Record<VeyroButtonVariant, string> = {
  primary:
    'bg-theme-accent text-theme-accent-ink hover:bg-theme-accent-hover shadow-lime',
  obsidian:
    'bg-theme-surface text-theme-text border border-theme-border hover:bg-theme-glass-strong',
  secondary:
    'bg-theme-glass text-theme-text border border-theme-border hover:bg-theme-glass-strong',
  destructive:
    'bg-[color:var(--theme-error)] text-[color:var(--theme-error-ink)] hover:brightness-95',
  ghost: 'bg-transparent text-theme-text hover:bg-theme-glass',
};

const sizeClasses: Record<VeyroButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

export const VeyroButton = React.forwardRef<HTMLButtonElement, VeyroButtonProps>(
  function VeyroButton(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      asChild = false,
      disabled,
      children,
      type,
      ...props
    },
    ref
  ) {
    const Comp: React.ElementType = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        aria-busy={loading || undefined}
        disabled={asChild ? undefined : disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
