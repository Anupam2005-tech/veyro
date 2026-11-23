'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { VeyroButton } from '@veyro/ui';
import DotField from '@/components/ui/DotField';
import { RouteRibbonLazy } from './RouteRibbonLazy';

const marqueeItems = [
  'Your vehicle, your keys',
  'Independent verified drivers',
  'Transparent hourly fare',
  'Zero surge pricing',
  'Dual-ended OTP verification',
  'Live trip cockpit & telemetry',
  'Customer-owned car coverage',
  'Instant SOS safety beacon',
  'Multi-stop road preview',
  'Direct automated settlement',
  'Professional vetted chauffeurs',
  'Zero fleet depreciation markup',
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen min-h-[100dvh] w-full flex-col justify-between overflow-hidden border-b border-[#EAE7DC] bg-[#FAF9F5]">
      {/* Interactive WebGL DotField Background in light theme with smaller dots */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
        <DotField
          lightMode
          gradientFrom="#090B10"
          gradientTo="#5A6070"
          glowColor="#B8F23A"
          dotRadius={0.9}
          dotSpacing={13}
          cursorRadius={220}
          bulgeStrength={0.5}
          glowRadius={160}
          glowIntensity={0.8}
          baseOpacity={0.3}
          sparkle
          interactive
          holdToZoom
          className="h-full w-full opacity-70"
        />
        {/* Subtle radial & linear fade to blend seamlessly into light canvas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FAF9F5]/40 via-transparent to-[#FAF9F5]/90"
        />
      </div>

      {/* Main Hero Content Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-content flex-1 flex-col justify-between px-4 pb-4 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="my-auto grid items-center gap-12 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] font-semibold text-[#5A6070]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] ring-2 ring-[#16A34A]/30" />
              Veyro Release 1 · Private Mobility
            </p>
            <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#090B10] sm:text-5xl lg:text-6xl xl:text-7xl">
              Your keys. Our pro.{' '}
              <span className="underline decoration-[#B8F23A] decoration-4 underline-offset-8">Zero traffic stress.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5A6070] sm:text-lg">
              You own the ride. We bring the verified chauffeur — on demand or
              scheduled around your day.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <VeyroButton asChild size="lg" className="bg-[#090B10] text-white hover:bg-black font-bold shadow-md">
                <Link href="/auth?role=customer">
                  Book Your Chauffeur <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </VeyroButton>
              <VeyroButton asChild size="lg" variant="secondary" className="bg-white text-[#090B10] border border-[#DCD8CC] hover:bg-[#F4F1EA] font-semibold">
                <Link href="/auth/driver">Drive With Veyro</Link>
              </VeyroButton>
            </div>
          </div>
          <div className="rounded-card border border-[#EAE7DC] bg-white/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/5 sm:p-6">
            <RouteRibbonLazy />
          </div>
        </div>

        {/* Floating Borderless Infinite Marquee: moves continuously right-to-left */}
        <div className="mt-auto w-full pt-6 pb-4">
          <div
            className="group relative flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#FAF9F5_8%,#FAF9F5_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#FAF9F5_8%,#FAF9F5_92%,transparent)]"
            aria-label="Veyro key features and trust standards"
          >
            {/* Unified wrapper moving from 0% to -50% for seamless right-to-left flow */}
            <div className="flex w-max shrink-0 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
              {/* Track 1 */}
              <div className="flex shrink-0 items-center gap-10 py-2 pr-10">
                {marqueeItems.map((item, index) => (
                  <div key={`track1-${index}`} className="flex shrink-0 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B8F23A]/30 text-[#090B10]">
                      <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span className="whitespace-nowrap text-sm font-medium tracking-wide text-[#5A6070] transition-colors hover:text-[#090B10]">
                      {item}
                    </span>
                    <span className="select-none pl-3 font-mono text-xs text-[#DCD8CC]" aria-hidden="true">
                      ·
                    </span>
                  </div>
                ))}
              </div>

              {/* Track 2 (exact replica for infinite seamless continuity) */}
              <div aria-hidden="true" className="flex shrink-0 items-center gap-10 py-2 pr-10">
                {marqueeItems.map((item, index) => (
                  <div key={`track2-${index}`} className="flex shrink-0 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B8F23A]/30 text-[#090B10]">
                      <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span className="whitespace-nowrap text-sm font-medium tracking-wide text-[#5A6070] transition-colors hover:text-[#090B10]">
                      {item}
                    </span>
                    <span className="select-none pl-3 font-mono text-xs text-[#DCD8CC]" aria-hidden="true">
                      ·
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
