import * as React from 'react';
import { cn } from '../lib/utils';

export interface AppShellProps {
  theme?: 'night' | 'studio';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({
  theme = 'night',
  header,
  footer,
  bottomNav,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      data-theme={theme}
      className={cn('min-h-screen bg-theme-canvas text-theme-text', className)}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-theme-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-theme-text focus:shadow-studio-card"
      >
        Skip to content
      </a>
      {header}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      {footer}
      {bottomNav ? (
        <nav
          aria-label="Primary mobile navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-theme-border bg-theme-surface md:hidden"
        >
          {bottomNav}
        </nav>
      ) : null}
    </div>
  );
}
