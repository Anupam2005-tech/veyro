'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Fingerprint,
  Radio,
  Share2,
  Key,
  Car,
  CheckCircle2,
} from 'lucide-react';

const CUBIC_EASE = [0.16, 1, 0.3, 1] as const;

export function TripVerification() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="safety"
      className="relative w-full bg-[#000000] text-white border-b border-white/10"
    >
      {/* Precision Micro Laser Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Global Section Header */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-20 text-center">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.24em] font-bold text-[#38BDF8] shadow-xs backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          <span>Trip Verification &amp; Safety Protocol</span>
        </motion.div>

        <motion.h2
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1, ease: CUBIC_EASE }}
          className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.04]"
        >
          Dual-ended verification.{' '}
          <span className="block mt-1 bg-gradient-to-r from-[#38BDF8] via-[#BAE6FD] to-white bg-clip-text text-transparent">
            At every handoff.
          </span>
        </motion.h2>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[#9EA3B0] leading-relaxed font-light"
        >
          A journey can neither initiate nor conclude without bidirectional cryptographic confirmation.
          Your vehicle stays under verified telemetry every single metre it moves.
        </motion.p>
      </div>

      {/* =========================================================================
          STICKY OVERLAPPING CARDS CONTAINER (Scroll-Linked Stacking)
          ========================================================================= */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-32 sm:pb-48 space-y-12 sm:space-y-16">
        {/* =========================================================================
            CARD 01 / ACT 01 (Sticky Top - 10vh, z-10)
            Image Left 50% / Text Right 50%
            ========================================================================= */}
        <div className="sticky top-[9vh] sm:top-[11vh] z-10">
          <div className="rounded-3xl border border-white/15 bg-[#090B10] p-6 sm:p-10 lg:p-14 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
              {/* Image Left 50% */}
              <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div
                  className="relative h-full w-full"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                    maskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                  }}
                >
                  <Image
                    src="/img1.jpg"
                    alt="Pre-Handoff Chauffeur Verification"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center filter contrast-[1.18] brightness-[0.88] saturate-[0.7]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 opacity-60" />
                </div>

                <div className="absolute top-4 left-4 z-20">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#E5D7B7] bg-black/80 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md">
                    ACT // 01 · PRE-HANDOFF
                  </span>
                </div>
              </div>

              {/* Text Right 50% */}
              <div>
                <div className="flex items-center gap-3 font-mono text-xs text-[#38BDF8] tracking-widest uppercase">
                  <span className="font-bold">01 / 03</span>
                  <span className="h-px w-8 bg-[#38BDF8]/40" />
                  <span>CHAUFFEUR VERIFICATION</span>
                </div>

                <h3 className="mt-4 font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
                  Chauffeur Identity &amp; <br />
                  <span className="text-[#38BDF8]">Gearbox Matching.</span>
                </h3>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#9EA3B0] leading-relaxed font-light">
                  Before your door ever unlocks, our protocol validates the chauffeur&apos;s government credentials,
                  driving history, and transmission competence. Whether your machine is a 9-speed dual-clutch,
                  standard manual, or instant-torque EV, the driver is certified for your exact powertrain.
                </p>

                <div className="mt-6 sm:mt-8 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-mono font-medium text-white">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Aadhaar &amp; Licence Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-mono font-medium text-white">
                    <Car className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Powertrain Competence Matched
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 02 / ACT 02 (Sticky Top - 12vh, z-20 — OVERLAPS CARD 01)
            Text Left 50% / Image Right 50% (REVERSED)
            ========================================================================= */}
        <div className="sticky top-[11vh] sm:top-[13vh] z-20">
          <div className="rounded-3xl border border-white/20 bg-[#090B10] p-6 sm:p-10 lg:p-14 shadow-[0_-25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
              {/* Text Left 50% */}
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-3 font-mono text-xs text-[#10B981] tracking-widest uppercase">
                  <span className="font-bold">02 / 03</span>
                  <span className="h-px w-8 bg-[#10B981]/40" />
                  <span>CRYPTOGRAPHIC CUSTODY</span>
                </div>

                <h3 className="mt-4 font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
                  Dual-Ended <br />
                  <span className="text-[#10B981]">OTP Handshake.</span>
                </h3>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#9EA3B0] leading-relaxed font-light">
                  Custody begins and terminates with cryptographic confirmation. On chauffeur arrival, your phone
                  generates a single-use Start OTP. Only when authenticated in person does the trip telemetry activate.
                  At journey&apos;s end, a separate completion OTP releases custody and freezes the receipt.
                </p>

                {/* Tactile Token Card */}
                <div className="mt-6 sm:mt-8 rounded-2xl border border-white/15 bg-white/[0.025] p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#9EA3B0] flex items-center gap-1.5">
                      <Fingerprint className="h-4 w-4 text-[#10B981]" /> Dual Cryptographic Codes
                    </span>
                    <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full font-bold">
                      ACTIVE LOCK
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                      <p className="text-[10px] text-[#7A8090] uppercase">Start OTP</p>
                      <p className="text-base sm:text-lg font-bold text-white tracking-wider mt-0.5">
                        482 913
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                      <p className="text-[10px] text-[#7A8090] uppercase">End OTP</p>
                      <p className="text-base sm:text-lg font-bold text-white tracking-wider mt-0.5">
                        713 064
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Right 50% */}
              <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden rounded-2xl border border-white/10 bg-black order-1 lg:order-2">
                <div
                  className="relative h-full w-full"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                    maskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                  }}
                >
                  <Image
                    src="/img2.jpg"
                    alt="Dual-Ended OTP Handshake Protocol"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center filter contrast-[1.18] brightness-[0.88] saturate-[0.7]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 opacity-60" />
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#10B981] bg-black/80 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md">
                    ACT // 02 · OTP HANDSHAKE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 03 / ACT 03 (Sticky Top - 14vh, z-30 — OVERLAPS CARD 02)
            Image Left 50% / Text Right 50% (ALTERNATED BACK)
            ========================================================================= */}
        <div className="sticky top-[13vh] sm:top-[15vh] z-30">
          <div className="rounded-3xl border border-white/20 bg-[#090B10] p-6 sm:p-10 lg:p-14 shadow-[0_-30px_70px_rgba(0,0,0,0.98)] backdrop-blur-2xl">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
              {/* Image Left 50% */}
              <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div
                  className="relative h-full w-full"
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                    maskImage:
                      'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)',
                  }}
                >
                  <Image
                    src="/img4.webp"
                    alt="Live Telemetry and Zero-Drift Return"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center filter contrast-[1.18] brightness-[0.88] saturate-[0.7]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 opacity-60" />
                </div>

                <div className="absolute top-4 left-4 z-20">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#C9A86A] bg-black/80 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md">
                    ACT // 03 · ZERO-DRIFT RETURN
                  </span>
                </div>
              </div>

              {/* Text Right 50% */}
              <div>
                <div className="flex items-center gap-3 font-mono text-xs text-[#C9A86A] tracking-widest uppercase">
                  <span className="font-bold">03 / 03</span>
                  <span className="h-px w-8 bg-[#C9A86A]/40" />
                  <span>LIVE PROTOCOL TELEMETRY</span>
                </div>

                <h3 className="mt-4 font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
                  Live Telemetry &amp; <br />
                  <span className="text-[#C9A86A]">Zero-Drift Return.</span>
                </h3>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#9EA3B0] leading-relaxed font-light">
                  From departure to return parking, your car&apos;s trajectory is logged via high-frequency GPS telemetry
                  with speed and boundary surveillance. Share live tracking with emergency contacts in one tap. Your vehicle
                  stays strictly on your desired itinerary until keys are safely back in your hand.
                </p>

                <div className="mt-6 sm:mt-8 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-mono font-medium text-white">
                    <Radio className="h-3.5 w-3.5 text-[#C9A86A] animate-pulse" />
                    Continuous Route Telemetry
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-mono font-medium text-white">
                    <Share2 className="h-3.5 w-3.5 text-[#C9A86A]" />
                    1-Click Family Live Link
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-mono font-medium text-white">
                    <Key className="h-3.5 w-3.5 text-[#C9A86A]" />
                    Guaranteed Key Handback Lock
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TripVerification;
