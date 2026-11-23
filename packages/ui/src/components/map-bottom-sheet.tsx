'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MapPin, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MapBottomSheetProps {
  title: string;
  triggerLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function MapBottomSheet({
  title,
  triggerLabel = 'View location details',
  children,
  className,
}: MapBottomSheetProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-control border border-theme-border bg-theme-glass px-4 py-2 text-sm font-medium text-theme-text hover:bg-theme-glass-strong"
        >
          <MapPin aria-hidden="true" className="h-4 w-4 text-theme-accent" />
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-card border border-theme-border bg-theme-surface p-5',
            'sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[26rem] sm:rounded-card',
            className
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl font-bold text-theme-text">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close location details"
                className="rounded-control p-1.5 text-theme-muted hover:bg-theme-glass"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Location and route details for this trip.
          </Dialog.Description>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
