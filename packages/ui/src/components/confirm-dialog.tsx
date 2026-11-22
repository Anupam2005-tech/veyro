'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { TriangleAlert, X } from 'lucide-react';
import { VeyroButton } from './button';
import { cn } from '../lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  children,
  className,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 veyro-scale-in rounded-card border border-theme-border bg-theme-surface p-6 shadow-studio-card',
            className
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-control',
                  destructive
                    ? 'bg-theme-glass text-[color:var(--theme-error)]'
                    : 'bg-theme-glass text-[color:var(--theme-focus)]'
                )}
              >
                <TriangleAlert aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <Dialog.Title className="font-display text-lg font-bold text-theme-text">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-relaxed text-theme-muted">
                  {description}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="rounded-control p-1 text-theme-muted hover:bg-theme-glass"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children ? <div className="mt-5">{children}</div> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <VeyroButton variant="secondary" size="sm">
                {cancelLabel}
              </VeyroButton>
            </Dialog.Close>
            <VeyroButton
              variant={destructive ? 'destructive' : 'primary'}
              size="sm"
              onClick={onConfirm}
            >
              {confirmLabel}
            </VeyroButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
