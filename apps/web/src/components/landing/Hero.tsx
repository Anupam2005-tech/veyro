'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { VeyroButton } from '@veyro/ui';
import { RouteRibbonLazy } from './RouteRibbonLazy';

const trustItems = [
  'Your vehicle, your keys',
  'Independent verified drivers',
  'Transparent hourly fare',
  'Demo SOS — no external dispatch',
];

export function Hero() {
  return (
    <section className="border-b border-night-border bg-night-canvas">
      <div className="mx-auto max-w-content px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-night-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-night-accent" />
              Veyro Release 1
            </p>
            <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-night-text sm:text-5xl lg:text-6xl">
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
          </div>
          <div className="rounded-card border border-night-border bg-night-surface p-4 sm:p-6">
            <RouteRibbonLazy />
          </div>
        </div>
        <ul className="mt-16 grid gap-px overflow-hidden rounded-card border border-night-border bg-night-border sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 bg-night-surface px-4 py-4 text-sm text-night-muted"
            >
              <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-night-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
