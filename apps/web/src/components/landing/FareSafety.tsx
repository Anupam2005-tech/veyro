'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Zap,
  Wallet,
  Timer,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Percent,
  Sparkles,
} from 'lucide-react';
import { publicPolicy } from '@/lib/public-policy';

const DURATION_PRESETS = [
  { hours: 2, label: '2 Hours', purpose: 'Airport / Quick Meeting', baseRate: 498 },
  { hours: 4, label: '4 Hours', purpose: 'Dinner & Social Return', baseRate: 996 },
  { hours: 8, label: '8 Hours', purpose: 'Full-Day Executive Day', baseRate: 1992 },
  { hours: 12, label: '12 Hours', purpose: 'Outstation / Full Dispatch', baseRate: 2988 },
];

export function FareSafety() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedHours, setSelectedHours] = React.useState<number>(4);

  // Hourly base tariff: ₹249/hr
  const hourlyRate = 249;
  const veyroBase = selectedHours * hourlyRate;
  const veyroFee = publicPolicy.customerPlatformFeeInr ?? 29;
  const veyroTotal = veyroBase + veyroFee;

  // Legacy aggregator comparison (estimated 2.8x surge multiplier on cab fleet)
  const legacySurgeMultiplier = 2.8;
  const legacyEstimated = Math.round(veyroBase * legacySurgeMultiplier + 320);
  const difference = legacyEstimated - veyroTotal;

  return (
    <section
      id="fares"
      className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-[#FAF9F5] text-[#090B10] py-24 sm:py-32 border-b border-[#EAE7DC]"
    >
      {/* Precision Micro Blueprint Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E2DBD0 1px, transparent 1px), linear-gradient(to bottom, #E2DBD0 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Subtle Warm Atmospheric Ambient Lighting */}
      <div className="pointer-events-none absolute -top-32 right-10 h-[500px] w-[500px] rounded-full bg-[#16A34A]/8 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-[500px] w-[500px] rounded-full bg-[#C9A86A]/10 blur-[150px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            HEADER: SASSY EDITORIAL NARRATIVE IN CREAM WHITE
            ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D5] bg-[#F4F1EA] px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.24em] font-bold text-[#090B10] shadow-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            <span>Economics &amp; Transparency Protocol</span>
          </motion.div>

          <motion.h2
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#090B10] leading-[1.04]"
          >
            No surge games.{' '}
            <span className="block mt-1 text-[#16A34A] underline decoration-[#16A34A]/30 decoration-4 underline-offset-8">
              Transparent by design.
            </span>
          </motion.h2>

          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-[#5A6070] leading-relaxed max-w-2xl mx-auto font-normal"
          >
            While legacy cab aggregators secretly inflate tariffs up to 400% when rain falls or flights land,
            Veyro operates strictly on transparent, server-frozen hourly economics. You pay for the pro, not algorithm greed.
          </motion.p>
        </div>

        {/* =========================================================================
            FULL-WIDTH ANTI-SURGE COMPARISON STRIP
            ========================================================================= */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 overflow-hidden rounded-2xl border border-[#EAE7DC] bg-white shadow-xs grid md:grid-cols-2"
        >
          {/* Legacy side */}
          <div className="p-5 sm:p-6 bg-[#FAF9F5] border-b md:border-b-0 md:border-r border-[#EAE7DC] flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#DC2626]">
                Legacy Cab Aggregators
              </p>
              <p className="mt-1 text-sm font-bold text-[#5A6070]">
                Dynamic Surge Multipliers (up to 3.8x)
              </p>
            </div>
            <span className="font-mono text-xs text-[#DC2626] bg-[#FEE2E2] px-3 py-1 rounded-full font-bold shrink-0">
              Hidden 30% Cuts
            </span>
          </div>

          {/* Veyro side */}
          <div className="p-5 sm:p-6 bg-white flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#16A34A]">
                Veyro Protocol
              </p>
              <p className="mt-1 text-sm font-bold text-[#090B10]">
                0% Surge Guaranteed · 100% Rate to Driver
              </p>
            </div>
            <span className="font-mono text-xs text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-full font-bold shrink-0">
              Flat ₹29 Platform Fee
            </span>
          </div>
        </motion.div>

        {/* =========================================================================
            INTERACTIVE FARE CALCULATOR BENTO CARD
            ========================================================================= */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-8 rounded-3xl border border-[#EAE7DC] bg-white p-6 sm:p-10 shadow-md shadow-black/[0.03]"
        >
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-center">
            {/* Left Controls & Slider */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#5A6070]">
                    Interactive Journey Simulator
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-black text-[#090B10]">
                    Select or Slide Duration: <span className="text-[#16A34A]">{selectedHours} Hours</span>
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-full">
                  ₹249 / hr flat
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DURATION_PRESETS.map((preset) => {
                  const isCurrent = selectedHours === preset.hours;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSelectedHours(preset.hours)}
                      className={`rounded-2xl p-3 text-left transition-all duration-200 border ${
                        isCurrent
                          ? 'border-[#090B10] bg-[#090B10] text-white shadow-sm'
                          : 'border-[#EAE7DC] bg-[#FAF9F5] text-[#5A6070] hover:border-[#090B10] hover:text-[#090B10]'
                      }`}
                    >
                      <p className={`font-display text-sm font-bold ${isCurrent ? 'text-white' : 'text-[#090B10]'}`}>
                        {preset.label}
                      </p>
                      <p className={`mt-0.5 text-[10px] font-mono truncate ${isCurrent ? 'text-white/70' : 'text-[#7A8090]'}`}>
                        {preset.purpose}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Slider for precision hours */}
              <div className="mt-6 pt-4 border-t border-[#F4F1EA]">
                <div className="flex justify-between text-xs text-[#7A8090] font-mono mb-2">
                  <span>1 Hour (Quick Hop)</span>
                  <span>16 Hours (Intercity Full Day)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="1"
                  value={selectedHours}
                  onChange={(e) => setSelectedHours(Number(e.target.value))}
                  className="w-full accent-[#090B10] h-2 bg-[#EAE7DC] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Right Cost Summary Breakdown Card */}
            <div className="rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] p-6 sm:p-7 space-y-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#5A6070]">
                Guaranteed Fare Snapshot
              </p>

              <div className="space-y-2.5 font-mono text-xs border-b border-[#EAE7DC] pb-4">
                <div className="flex justify-between items-center text-[#5A6070]">
                  <span>Pro Chauffeur ({selectedHours} hrs × ₹249)</span>
                  <span className="font-bold text-[#090B10]">₹{veyroBase}</span>
                </div>
                <div className="flex justify-between items-center text-[#5A6070]">
                  <span>Veyro Platform Fee</span>
                  <span className="font-bold text-[#090B10]">₹{veyroFee}</span>
                </div>
                <div className="flex justify-between items-center text-[#16A34A] font-bold">
                  <span>Surge Multiplier (Rains/Rush)</span>
                  <span className="uppercase">₹0.00 (Immune)</span>
                </div>
              </div>

              {/* Final Frozen Quote */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-xs text-[#7A8090]">Total Frozen Quote</p>
                  <p className="font-display text-3xl font-black text-[#090B10]">
                    ₹{veyroTotal}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                    <TrendingDown className="h-3 w-3" />
                    Save ₹{difference}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-[#7A8090] border-t border-[#EAE7DC]">
                * Fuel, tolls, and state taxes remain pass-through paid by car owner.
              </div>
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            BOTTOM 3 FLAGSHIP PILLARS (Cream White Cards)
            ========================================================================= */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: '0% Surge Engine',
              desc: 'Surge algorithms are physically excluded from our codebase. Whether it is torrential rain, peak airport rush, or midnight, your rate remains strictly frozen.',
            },
            {
              icon: Wallet,
              title: '100% Hourly Rate to Driver',
              desc: 'Chauffeurs retain 100% of their published hourly base rate. Zero predatory 30% aggregator cuts, creating respectful, dignified chauffeur relationships.',
            },
            {
              icon: Timer,
              title: '10 Min Complimentary Grace',
              desc: `${publicPolicy.freeWaitingMinutes} minutes of free waiting included upon chauffeur arrival. No countdown anxiety or doorstep panic meters.`,
            },
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.1 * idx }}
                className="rounded-3xl border border-[#EAE7DC] bg-white p-6 shadow-xs hover:border-[#090B10] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] text-[#090B10]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 font-display text-base sm:text-lg font-bold text-[#090B10]">
                    {pillar.title}
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-[#5A6070] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FareSafety;
