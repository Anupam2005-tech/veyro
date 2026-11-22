import { CalendarClock, Zap } from 'lucide-react';
import { NoticeBadge } from '@veyro/ui';
import { publicPolicy } from '@/lib/public-policy';

export function BookingModes() {
  return (
    <section id="booking-modes" className="border-b border-night-border py-20 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
          Two ways to ride
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold text-night-text sm:text-4xl">
          Instant or scheduled. Always your call.
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="glass-panel rounded-card p-6 shadow-glass sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night-accent text-night-accent-ink">
                <Zap aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="font-display text-2xl font-bold text-night-text">Instant</h3>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-night-muted">
              See eligible online drivers near your pickup, compare their rates
              and choose one. The selected driver gets a five-minute response
              window.
            </p>
            <dl className="mt-6 grid gap-4 border-t border-night-border pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-night-muted">
                  Response window
                </dt>
                <dd className="mt-1 font-mono text-lg text-night-accent">
                  {publicPolicy.instantResponseWindowMinutes} min
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-night-muted">
                  Initial search radius
                </dt>
                <dd className="mt-1 font-mono text-lg text-night-text">
                  {publicPolicy.initialSearchRadiusKm} km
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-night-muted">
              You can expand the radius yourself — we never expand it silently.
            </p>
          </article>

          <article className="glass-panel rounded-card p-6 shadow-glass sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-night-border bg-night-glass-strong text-night-accent">
                <CalendarClock aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="font-display text-2xl font-bold text-night-text">Scheduled</h3>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-night-muted">
              Plan up to 30 days ahead. Eligible drivers are notified in the
              defined pre-pickup window, and the first to accept is assigned.
            </p>
            <dl className="mt-6 grid gap-4 border-t border-night-border pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-night-muted">
                  Booking window
                </dt>
                <dd className="mt-1 font-mono text-lg text-night-accent">
                  4 h – 30 days
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-night-muted">
                  Driver notification
                </dt>
                <dd className="mt-1 font-mono text-sm text-night-text">
                  pickup − 12 h → − 2 h
                </dd>
              </div>
            </dl>
            <NoticeBadge className="mt-5" tone="info">
              No driver is shown as assigned until they accept.
            </NoticeBadge>
          </article>
        </div>
      </div>
    </section>
  );
}
