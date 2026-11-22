import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { VeyroButton } from '@veyro/ui';
import { RouteRibbonLazy } from './RouteRibbonLazy';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-night-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 78% 18%, rgba(184,242,58,0.10), transparent 38%), radial-gradient(circle at 12% 80%, rgba(170,176,196,0.08), transparent 45%)',
        }}
      />
      <div className="relative mx-auto grid max-w-content items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div className="veyro-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-night-border bg-night-glass px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-night-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-night-accent" />
            Veyro Release 1
          </p>
          <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-night-text sm:text-5xl lg:text-6xl">
            Your keys. Our pro.{' '}
            <span className="text-night-accent">Zero traffic stress.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-night-muted sm:text-lg">
            You own the ride. We bring the verified chauffeur — on demand or
            scheduled around your day.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <VeyroButton asChild size="lg">
              <Link href="/auth?role=customer">
                Book Your Chauffeur <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </VeyroButton>
            <VeyroButton asChild size="lg" variant="secondary">
              <Link href="/auth?role=driver">Drive With Veyro</Link>
            </VeyroButton>
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-night-muted sm:grid-cols-2">
            {[
              'Your vehicle, your keys',
              'Independent verified drivers',
              'Transparent hourly fare',
              'Demo SOS — no external dispatch',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-night-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <RouteRibbonLazy />
        </div>
      </div>
    </section>
  );
}
