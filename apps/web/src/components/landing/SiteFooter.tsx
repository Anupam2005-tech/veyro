import Link from 'next/link';
import { VeyroWordmark } from '@veyro/ui';

const legalLinks = [
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Safety', href: '/legal/safety' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-night-border bg-night-surface/60">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <VeyroWordmark />
            <p className="mt-3 max-w-sm text-sm text-night-muted">
              Your keys. Our pro. Zero traffic stress. Veyro connects vehicle
              owners with independent professional drivers.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-8 gap-y-3">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-night-muted hover:text-night-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-night-border pt-6 text-xs text-night-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Veyro. Release 1 demo.</p>
          <p>
            Fares, policies and safety behaviour shown here reflect approved
            Release 1 decisions. SOS is simulated; no external dispatch is
            configured.
          </p>
        </div>
      </div>
    </footer>
  );
}
