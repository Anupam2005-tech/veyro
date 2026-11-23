'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Zap,
  ArrowRight,
  Gauge,
  Sliders,
  Check,
} from 'lucide-react';

const PILLARS = [
  {
    index: '01',
    title: 'Keys Stay Yours',
    subtitle: 'Owner Retained',
    body: 'You remain the sole owner. Chauffeurs operate strictly within your authorized trip bounds.',
    icon: KeyRound,
    accent: '#C9A86A',
  },
  {
    index: '02',
    title: 'Transmission Lock',
    subtitle: 'Dual OTP · Exact Gearbox Match',
    body: 'Protected by a dual OTP handshake. Drivers are strictly vetted and matched to your exact drivetrain: Automatic, DCT, EV, or Manual.',
    icon: LockKeyhole,
    accent: '#38BDF8',
  },
  {
    index: '03',
    title: 'Asset Security',
    subtitle: 'Full Transit Cover',
    body: 'Zero fleet markup. End-to-end telemetry logging and comprehensive transit coverage throughout the entire trip duration.',
    icon: ShieldCheck,
    accent: '#10B981',
  },
];

export function VehicleExplainer() {
  const shouldReduceMotion = useReducedMotion();
  const [activePillar, setActivePillar] = React.useState<number>(0);

  return (
    <section
      id="vehicle"
      className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-[#000000] text-white py-24 sm:py-32 border-b border-white/10"
    >
      {/* =========================================================================
          ARCHITECTURAL RETICLES, LASER GRIDS & AMBIENT DEPTH
          ========================================================================= */}
      {/* Precision Micro Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Ambient Gradient Lighting */}
      <div className="pointer-events-none absolute -left-48 top-1/4 h-[600px] w-[600px] rounded-full bg-[#C9A86A]/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-48 bottom-1/4 h-[600px] w-[600px] rounded-full bg-[#38BDF8]/10 blur-[160px]" />

      {/* Hairline Architectural Geometry Accents */}
      <div className="pointer-events-none absolute top-12 right-12 hidden lg:flex items-center gap-3 font-mono text-[10px] tracking-[0.25em] text-[#555A68] uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A86A]" />
        <span>SEC_02 // ASSET_PROTOCOL // CHASSIS_ISOLATION</span>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 xl:gap-20">
          {/* =========================================================================
              LEFT COLUMN: SASSY HIGH-FASHION EDITORIAL HEADLINE & PILLARS
              ========================================================================= */}
          <div>
            {/* Architectural Eyebrow Pill */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.24em] font-bold text-[#E5D7B7] shadow-sm backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A86A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A86A]" />
              </span>
              <span>Customer-Owned Asset Protocol</span>
            </motion.div>

            {/* Display Headline */}
            <motion.h2
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 font-display text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[0.98] text-white"
            >
              The car stays yours.{' '}
              <span className="block mt-2 bg-gradient-to-r from-[#C9A86A] via-[#F4E9CD] to-white bg-clip-text text-transparent">
                Always.
              </span>
            </motion.h2>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-base sm:text-lg text-[#9EA3B0] leading-relaxed font-light"
            >
              Legacy cab aggregators force you into worn-out stranger fleets. Veyro inverts the architecture:
              you keep your sanctuary, your sound system, and your vehicle, steered by vetted executive chauffeurs.
            </motion.p>

            {/* Upgraded Protocol Pillars (01 - 03) */}
            <div className="mt-10 sm:mt-12 space-y-3">
              {PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;
                const isSelected = activePillar === index;
                return (
                  <motion.div
                    key={pillar.index}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    onMouseEnter={() => setActivePillar(index)}
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-5 sm:p-6 cursor-pointer ${
                      isSelected
                        ? 'border-white/25 bg-white/[0.05] shadow-[0_0_30px_rgba(201,168,106,0.12)]'
                        : 'border-white/10 bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Left active accent beam */}
                    {isSelected && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: pillar.accent }}
                      />
                    )}

                    <div className="flex items-start gap-4 sm:gap-5">
                      <span
                        className="font-mono text-xs sm:text-sm font-bold tracking-widest transition-colors duration-300"
                        style={{ color: isSelected ? pillar.accent : '#555A68' }}
                      >
                        {pillar.index}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <span>{pillar.title}</span>
                            <span className="text-[11px] font-mono font-medium text-[#C9A86A] uppercase tracking-wider">
                              ({pillar.subtitle})
                            </span>
                          </h3>
                          <Icon
                            className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110"
                            style={{ color: pillar.accent }}
                          />
                        </div>

                        <p className="mt-2 text-xs sm:text-sm text-[#8E94A2] leading-relaxed">
                          {pillar.body}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: HIGH-CONTRAST EDITORIAL CENTERPIECE (/img4.webp)
              ========================================================================= */}
          <div className="relative flex justify-center items-center">
            {/* Ambient Radial Backlight */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-[#C9A86A]/20 via-[#38BDF8]/15 to-transparent blur-[120px]" />
            </div>

            {/* Geometric Framing Reticle */}
            <div className="pointer-events-none absolute inset-0 hidden sm:block">
              <svg className="w-full h-full opacity-20" viewBox="0 0 500 500" fill="none">
                <circle cx="250" cy="250" r="230" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6 10" />
                <circle cx="250" cy="250" r="160" stroke="rgba(201,168,106,0.3)" strokeWidth="1" />
                <line x1="20" y1="250" x2="480" y2="250" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1="250" y1="20" x2="250" y2="480" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              </svg>
            </div>

            {/* The Visual Container with Soft Radial Vignette Melt */}
            <div className="relative z-10 w-full max-w-[540px] aspect-square flex items-center justify-center">
              <div
                className="relative w-full h-full overflow-hidden"
                style={{
                  WebkitMaskImage:
                    'radial-gradient(ellipse at center, rgba(0,0,0,1) 48%, rgba(0,0,0,0) 78%)',
                  maskImage:
                    'radial-gradient(ellipse at center, rgba(0,0,0,1) 48%, rgba(0,0,0,0) 78%)',
                }}
              >
                <Image
                  src="/img4.webp"
                  alt="Veyro Customer-Owned Asset Protocol Vehicle"
                  fill
                  sizes="(max-width: 768px) 100vw, 540px"
                  className="object-cover object-center filter contrast-[1.12] brightness-[0.92] scale-[1.04] transition-transform duration-700 hover:scale-[1.08]"
                  priority
                />

                {/* Dark Obsidian Edge Blending Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-60" />
              </div>

              {/* High-Tech Editorial Floating Telemetry Tags */}
              <div className="absolute top-6 left-2 sm:left-4 z-20 pointer-events-none">
                <div className="rounded-xl border border-white/15 bg-black/80 px-3 py-1.5 backdrop-blur-md shadow-2xl">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#C9A86A] flex items-center gap-1.5 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    AUTONOMY : OWNER
                  </p>
                  <p className="text-[11px] font-medium text-[#C5CAD8]">Zero Fleet Markup</p>
                </div>
              </div>

              <div className="absolute bottom-6 right-2 sm:right-4 z-20 pointer-events-none">
                <div className="rounded-xl border border-white/15 bg-black/80 px-3.5 py-2 backdrop-blur-md shadow-2xl text-right">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#38BDF8] font-bold">
                    TRANSMISSION SYNC
                  </p>
                  <p className="text-[11px] font-medium text-white">Manual · Auto · EV · DCT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VehicleExplainer;
