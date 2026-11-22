import * as React from 'react';
import { cn } from '../lib/utils';

export interface PublicHeaderLink {
  label: string;
  href: string;
}

export interface PublicHeaderProps {
  links: PublicHeaderLink[];
  actions?: React.ReactNode;
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
  logoHref = '/',
  className,
}: PublicHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-theme-border bg-theme-canvas/80 backdrop-blur-xl',
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
              className="text-sm font-medium text-theme-muted transition-colors hover:text-theme-text"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
