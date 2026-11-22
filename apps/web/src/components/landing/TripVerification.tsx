import { Link2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { DynamicTripPill, OtpVaultCard } from '@veyro/ui';
import { DemoSosAction } from './DemoSosAction';

export function TripVerification() {
  return (
    <section id="safety" className="border-b border-night-border py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
          Trip verification &amp; safety
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold text-night-text sm:text-4xl">
          Verified at every handoff.
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="space-y-5">
            <OtpVaultCard title="Start OTP" mode="display" code="482913" helper="Shown after the driver arrives." />
            <OtpVaultCard title="End OTP" mode="display" code="713064" helper="Separate, single-use code for trip end." />
            <p className="font-mono text-[11px] uppercase tracking-wider text-night-muted">
              Demo codes · not valid for a trip
            </p>
          </div>
          <div className="rounded-card border border-night-border bg-night-surface p-6 sm:p-8">
            <DynamicTripPill
              label="Driver en route"
              countdown="04:32"
              detail="Live location · updated 8s ago"
              tone="live"
            />
            <h3 className="mt-8 flex items-center gap-2 font-display text-xl font-bold text-night-text">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-night-accent" />
              Share your trip
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-night-muted">
              Send a private link to someone you trust. They must sign in before
              they can see the read-only trip view, and the link expires when
              the trip ends.
            </p>
            <p className="mt-5 flex items-center gap-2 text-xs text-night-muted">
              <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
              Authentication plus a valid share token is required.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-night-muted">
              <Link2 aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
              Revocation is available to the customer at any time.
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-card border border-night-border bg-night-surface p-6 sm:p-8">
            <div>
              <h3 className="flex items-center gap-2 font-display text-xl font-bold text-night-text">
                Emergency safety
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-night-muted">
                One tap records an SOS event against the active trip and shows
                delivery state per contact. Release 1 is a demo: no external
                SMS, call or emergency dispatch is configured.
              </p>
              <p className="mt-4 text-xs text-night-muted">
                Use the phone call fallback for urgent help.
              </p>
            </div>
            <div className="mt-8">
              <DemoSosAction />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
