'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CarFront,
  KeyRound,
  Route,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BentoCardProps {
  className?: string;
  number: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ElementType;
  preview: React.ReactNode;
  highlight: string;
}

function BentoCard({
  className,
  number,
  badge,
  title,
  description,
  icon: Icon,
  preview,
  highlight,
}: BentoCardProps) {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-black/[0.08] bg-white/80 p-8 shadow-xl shadow-black/[0.02] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-black/25 hover:shadow-2xl hover:shadow-black/[0.08] sm:p-9',
        className
      )}
    >
      {/* Dynamic Cursor Spotlight Beam on Hover (Lime + White luminous sheen) */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(184, 242, 58, 0.22), transparent 45%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(260px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.7), transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Large architectural watermark numeral */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-7 top-6 select-none font-display text-6xl font-black text-black/[0.06] transition-colors group-hover:text-black/[0.14] sm:text-7xl"
      >
        {number}
      </span>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col justify-between">
        <div>
          {/* Top Bar: Icon + Badge */}
          <div className="flex items-center justify-between">
            <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#090B10] text-[#B8F23A] shadow-md shadow-black/10 transition-transform duration-300 group-hover:scale-105">
              <Icon aria-hidden="true" className="h-6 w-6 stroke-[2]" />
            </span>
            <span className="rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#090B10]/70">
              {badge}
            </span>
          </div>

          {/* Title & Copy */}
          <h3 className="mt-7 font-display text-2xl font-bold tracking-tight text-[#090B10] sm:text-3xl">
            {title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-[#3D4351]">
            {description}
          </p>
        </div>

        {/* Embedded Interactive Mockup / Telemetry visual */}
        <div className="relative z-10 mt-6">{preview}</div>
      </div>

      {/* Bottom Trust Highlight */}
      <div className="relative z-10 mt-7 flex items-center gap-2 border-t border-black/[0.06] pt-4 text-xs font-semibold text-[#090B10]">
        <Sparkles className="h-3.5 w-3.5 text-[#090B10]" />
        <span>{highlight}</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative flex min-h-screen min-h-[100dvh] w-full flex-col justify-center overflow-hidden border-b border-black/10 bg-[#FBF9F5] py-20 lg:py-28"
    >
      {/* Aceternity Grid Background adapted for luxury cream white canvas */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0',
          '[background-size:40px_40px]',
          '[background-image:linear-gradient(to_right,rgba(9,11,16,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(9,11,16,0.06)_1px,transparent_1px)]'
        )}
      />

      {/* Radial vignette mask creating a subtle, faded spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[#FBF9F5] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      />

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-content flex-col justify-between px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#090B10] shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#090B10]" />
            Execution Protocol · Four Step Bento Grid
          </div>

          <h2 className="mt-6 font-display text-4xl font-black tracking-tight text-[#090B10] sm:text-5xl lg:text-6xl">
            Your Car. Your Keys.{' '}
            <span className="block text-[#090B10]/70">Our Chauffeur.</span>
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#3D4351] sm:text-lg">
            Veyro is not a taxi fleet or a rental service. We connect vehicle owners
            with certified, top-tier independent chauffeurs on-demand or scheduled
            around your calendar.
          </p>
        </div>

        {/* 4 Unsymmetric Bento Grid Cards with Hover Spotlight Effect */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Card 1: Span 7 cols */}
          <BentoCard
            className="lg:col-span-7"
            number="01"
            badge="Vehicle Pass"
            title="Your Car. Your Keys. Instant Pass."
            description="Register your vehicle profile once. Transmission, fuel type, and category match you with an elite pro certified for your specific car. Zero fleet markup, zero vehicle depreciation."
            icon={KeyRound}
            highlight="Zero fleet depreciation · Registered once"
            preview={
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 transition-colors group-hover:bg-white/90">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#090B10]">
                      KA 01 AB 1234 · Honda City ZX
                    </p>
                    <p className="text-[11px] text-[#3D4351]">Sedan · CVT Automatic · Petrol</p>
                  </div>
                </div>
                <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#090B10] shadow-sm">
                  Active Pass
                </span>
              </div>
            }
          />

          {/* Card 2: Span 5 cols */}
          <BentoCard
            className="lg:col-span-5"
            number="02"
            badge="Route Telemetry"
            title="Precision Multi-Stop Routing."
            description="Set pickup, destination, and up to 3 intermediate stops. Real-time road routing previews accurate road distances, estimated arrival, and upfront hourly pricing."
            icon={Route}
            highlight="Guaranteed upfront fare · No surge pricing"
            preview={
              <div className="rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 font-mono text-xs text-[#090B10] transition-colors group-hover:bg-white/90">
                <div className="flex justify-between border-b border-black/[0.06] pb-2 text-[11px] text-[#3D4351]">
                  <span>Route Distance: 34.2 km</span>
                  <span className="font-bold text-[#090B10]">₹699 Flat Base</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border border-black/20 bg-[#B8F23A]" />
                    Indiranagar → Airport T2
                  </span>
                  <span className="text-[#3D4351]">52m ETA</span>
                </div>
              </div>
            }
          />

          {/* Card 3: Span 5 cols */}
          <BentoCard
            className="lg:col-span-5"
            number="03"
            badge="Elite Chauffeur"
            title="Elite Chauffeur Match."
            description="Independent drivers with clean commercial endorsements, police background checks, and continuous 4.8+ customer ratings. Only top 5% talent admitted."
            icon={ShieldCheck}
            highlight="Background verified · Ratings monitored"
            preview={
              <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 transition-colors group-hover:bg-white/90">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#090B10] text-xs font-bold text-white shadow-sm">
                    VS
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[#090B10]">Vikram S.</p>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        4.96
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3D4351] mt-0.5">840+ trips · Police verified</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800">
                  Top 5%
                </span>
              </div>
            }
          />

          {/* Card 4: Span 7 cols */}
          <BentoCard
            className="lg:col-span-7"
            number="04"
            badge="Encrypted OTP"
            title="Secure Arrival & Cockpit."
            description="Your chauffeur arrives at your door. The trip only activates when you share your encrypted 4-digit arrival OTP. Track your trip in real time with private share links and demo SOS beacon."
            icon={CarFront}
            highlight="Dual-ended OTP handshake · Live GPS cockpit"
            preview={
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 transition-colors group-hover:bg-white/90">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-xs font-semibold text-[#3D4351]">
                    <LockKeyhole className="h-3.5 w-3.5 text-[#090B10]" /> Trip Start OTP:
                  </span>
                  <div className="flex gap-1.5 font-mono text-sm font-extrabold text-[#090B10]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 bg-white shadow-sm">
                      8
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 bg-white shadow-sm">
                      4
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 bg-white shadow-sm">
                      2
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 bg-white shadow-sm">
                      1
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Telemetry Linked
                </span>
              </div>
            }
          />
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-black/[0.08] bg-white/80 p-6 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#090B10] text-[#B8F23A]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-[#090B10]">
              All chauffeurs are background-screened, license-verified & ratings-monitored.
            </p>
          </div>
          <Link
            href="/auth?role=customer"
            className="inline-flex items-center gap-2 rounded-full bg-[#090B10] px-5 py-2.5 text-xs font-semibold tracking-wide text-white transition-all hover:bg-black hover:shadow-md active:scale-95"
          >
            Book Your Chauffeur Now <ArrowRight className="h-3.5 w-3.5 text-[#B8F23A]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
