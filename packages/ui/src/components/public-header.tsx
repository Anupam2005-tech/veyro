import * as React from 'react';
import { cn } from '../lib/utils';

export interface PublicHeaderLink {
  label: string;
  href: string;
}

export interface PublicHeaderProps {
  links: PublicHeaderLink[];
  actions?: React.ReactNode;
  announcement?: React.ReactNode;
  logoHref?: string;
  className?: string;
}

export function VeyroWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-xl font-extrabold tracking-[0.2em] text-theme-text',
        className
      )}
    >
      VEYRO<span className="text-theme-accent">.</span>
    </span>
  );
}

export function PublicHeader({
  links,
  actions,
  announcement,
  logoHref = '/',
  className,
}: PublicHeaderProps) {
  return (
    <>
      {announcement ? (
        <div className="flex min-h-10 items-center justify-center border-b border-night-border bg-night-surface px-4 py-2 text-center text-xs text-night-muted">
          {announcement}
        </div>
      ) : null}
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-theme-border bg-theme-canvas transition-colors',
          className
        )}
      >
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a href={logoHref} className="shrink-0" aria-label="Veyro home">
            <VeyroWordmark />
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-theme-muted transition-colors hover:text-theme-text after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-theme-accent after:transition-all hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      </header>
    </>
  );
}
