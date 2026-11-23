'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarClock,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wifi,
  Sparkles,
  Radio,
  Calendar,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicPolicy } from '@/lib/public-policy';

export function BookingModes() {
  const [mode, setMode] = React.useState<'instant' | 'scheduled'>('instant');

  return (
    <section
      id="booking-modes"
      className="relative overflow-hidden border-b border-black/10 bg-[#FAF9F5] py-20 lg:py-28"
    >
      {/* Subtle ambient light accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 h-[500px] w-[500px] rounded-full bg-black/[0.02] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-10 h-[450px] w-[450px] rounded-full bg-[#B8F23A]/15 blur-[130px]"
      />

      <div className="relative z-10 mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        {/* Main 60-40 Split Card with Vertical Hairline Separation */}
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl shadow-black/[0.04]">
          <div className="flex flex-col lg:flex-row">
            {/* ================= LEFT (60%): AWARD-WINNING LIGHT THEME IPHONE ================= */}
            <div className="relative flex w-full items-center justify-center bg-[#F6F4ED]/80 p-6 sm:p-10 lg:w-[60%] lg:p-14">
              {/* Radial ambient spotlight behind phone */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-[#B8F23A]/20 blur-[100px]"
              />

              {/* iPhone Hardware Chassis in Silver/White Titanium */}
              <div className="relative mx-auto w-[310px] sm:w-[350px] rounded-[52px] border-[8px] border-[#E8E6DF] bg-white p-3 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.14),0_0_40px_rgba(184,242,58,0.18)] ring-1 ring-black/5">
                {/* Physical Titanium Side Buttons */}
                <div className="absolute -left-[11px] top-28 h-8 w-[3px] rounded-l-sm bg-[#D5D2C8]" />
                <div className="absolute -left-[11px] top-40 h-12 w-[3px] rounded-l-sm bg-[#D5D2C8]" />
                <div className="absolute -left-[11px] top-56 h-12 w-[3px] rounded-l-sm bg-[#D5D2C8]" />
                <div className="absolute -right-[11px] top-36 h-16 w-[3px] rounded-r-sm bg-[#D5D2C8]" />

                {/* iPhone Screen (Crisp Luxury Light Theme) */}
                <div className="relative flex h-[590px] flex-col justify-between overflow-hidden rounded-[42px] border border-black/[0.06] bg-[#FFFFFF] text-[#090B10]">
                  {/* Top Status Bar & Dynamic Island */}
                  <div className="relative z-20 px-6 pt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#090B10]">
                      <span className="font-mono">9:41</span>
                      {/* Dynamic Island with active LED dot */}
                      <div className="flex h-5 w-24 items-center justify-between rounded-full bg-[#090B10] px-2.5 shadow-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#B8F23A] animate-pulse" />
                        <span className="h-2 w-2 rounded-full border border-white/20 bg-[#1A1D24]" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 stroke-[2.5]" />
                        <span className="font-mono text-[9px] font-bold">5G</span>
                      </div>
                    </div>
                  </div>

                  {/* Screen Content */}
                  <div className="relative z-10 flex flex-1 flex-col justify-between px-5 py-3.5">
                    <div>
                      {/* App Header: ONLY the official logo mark from assets, no extra text */}
                      <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                        <Image
          width={956}
          height={577}
                          src="/brand/veyro-light-logo-trimmed.png"
                          alt="Veyro"
                          className="h-6 w-auto object-contain"
                        />
                        <span className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#090B10]">
                          Vehicle Pass Active
                        </span>
                      </div>

                      {/* Headline inside phone */}
                      <h4 className="mt-3 font-display text-sm font-black leading-snug text-[#090B10]">
                        Instant or scheduled. Always your call.
                      </h4>

                      {/* Interactive Segmented Switch in Light Theme */}
                      <div className="mt-3 grid grid-cols-2 rounded-xl border border-black/[0.08] bg-[#F1EFEA] p-1">
                        <button
                          type="button"
                          onClick={() => setMode('instant')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all duration-200',
                            mode === 'instant'
                              ? 'bg-white text-[#090B10] shadow-sm'
                              : 'text-[#090B10]/60 hover:text-[#090B10]'
                          )}
                        >
                          <Zap className="h-3.5 w-3.5 text-[#090B10]" />
                          Instant
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('scheduled')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all duration-200',
                            mode === 'scheduled'
                              ? 'bg-white text-[#090B10] shadow-sm'
                              : 'text-[#090B10]/60 hover:text-[#090B10]'
                          )}
                        >
                          <CalendarClock className="h-3.5 w-3.5 text-[#090B10]" />
                          Scheduled
                        </button>
                      </div>

                      {/* Mode View Details */}
                      {mode === 'instant' ? (
                        <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
                          {/* Instant Explanation Box */}
                          <div className="rounded-2xl border border-black/[0.08] bg-[#F9F8F5] p-3.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-display text-xs font-black uppercase tracking-wider text-[#090B10]">
                                Instant
                              </span>
                              <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800">
                                <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
                                Live Radar
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#3D4351]">
                              See eligible online drivers near your pickup, compare their rates and
                              choose one. The selected driver gets a five-minute response window.
                            </p>
                          </div>

                          {/* 2 Metric Tiles */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-3 shadow-sm">
                              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#3D4351]">
                                Response window
                              </span>
                              <span className="mt-0.5 block font-mono text-base font-black text-[#090B10]">
                                {publicPolicy.instantResponseWindowMinutes} min
                              </span>
                            </div>
                            <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-3 shadow-sm">
                              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#3D4351]">
                                Initial search radius
                              </span>
                              <span className="mt-0.5 block font-mono text-base font-black text-[#090B10]">
                                {publicPolicy.initialSearchRadiusKm} km
                              </span>
                            </div>
                          </div>

                          {/* Nearby Driver Preview Card */}
                          <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-2.5 shadow-sm">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#090B10] text-[10px] font-bold text-[#B8F23A]">
                                  RK
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-[#090B10] text-[11px]">Rajesh K.</p>
                                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                      4.92
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#3D4351]">1.2 km away · Honda Certified</p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-black text-[#090B10]">₹280/hr</span>
                            </div>
                          </div>

                          {/* Policy callout */}
                          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#F0EEE6] px-3 py-2 text-[10.5px] font-medium text-[#090B10]">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>
                              You can expand the radius yourself — we never expand it silently.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
                          {/* Scheduled Explanation Box */}
                          <div className="rounded-2xl border border-black/[0.08] bg-[#F9F8F5] p-3.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-display text-xs font-black uppercase tracking-wider text-[#090B10]">
                                Scheduled
                              </span>
                              <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-[#090B10]">
                                <Calendar className="h-3 w-3" />
                                Advance Slot
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#3D4351]">
                              Plan up to 30 days ahead. Eligible drivers are notified in the defined
                              pre-pickup window, and the first to accept is assigned.
                            </p>
                          </div>

                          {/* 2 Metric Tiles */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-3 shadow-sm">
                              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#3D4351]">
                                Booking window
                              </span>
                              <span className="mt-0.5 block font-mono text-sm font-black text-[#090B10]">
                                4 h – 30 days
                              </span>
                            </div>
                            <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-3 shadow-sm">
                              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#3D4351]">
                                Driver notification
                              </span>
                              <span className="mt-0.5 block font-mono text-xs font-black leading-tight text-[#090B10]">
                                pickup − 12 h → − 2 h
                              </span>
                            </div>
                          </div>

                          {/* Advance Slot Ticket Card */}
                          <div className="rounded-xl border border-black/[0.08] bg-[#F9F8F5] p-2.5 shadow-sm">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-[#090B10] text-[11px]">Airport T2 Transfer</p>
                                <p className="text-[10px] text-[#3D4351]">Tomorrow, 06:00 AM · 3h Est.</p>
                              </div>
                              <span className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[9px] font-bold text-[#090B10]">
                                Awaiting Accept
                              </span>
                            </div>
                          </div>

                          {/* Policy callout */}
                          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#F0EEE6] px-3 py-2 text-[10.5px] font-medium text-[#090B10]">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#090B10]" />
                            <span>No driver is shown as assigned until they accept.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Home Indicator */}
                    <div className="pt-2 text-center">
                      <div className="h-1 w-24 rounded-full bg-black/20 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hairline Vertical Divider (Desktop) */}
            <div className="hidden w-[1px] self-stretch bg-black/10 lg:block" />

            {/* ================= RIGHT (40%): SHORT SASSY PARAGRAPH ONLY ================= */}
            <div className="flex w-full flex-col justify-center p-8 sm:p-12 lg:w-[40%] lg:p-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#090B10]">
                  <Sparkles className="h-3 w-3 text-[#090B10]" />
                  Two Ways to Ride
                </span>

                <h3 className="mt-6 font-display text-3xl font-black tracking-tight text-[#090B10] sm:text-4xl lg:text-5xl">
                  Instant or scheduled.{' '}
                  <span className="block text-[#090B10]/60">Always your call.</span>
                </h3>

                {/* Sassy, razor-sharp short paragraph */}
                <p className="mt-6 text-base leading-relaxed text-[#3D4351] sm:text-lg">
                  Whether you need an on-demand verified chauffeur at your door in five minutes or
                  want to schedule up to 30 days ahead for an early morning airport flight, Veyro
                  puts zero filters between you and independent drivers. No silent radius
                  expansion, no phantom assignments, and absolutely zero surge pricing. Your car,
                  your terms, pure peace of mind.
                </p>

                {/* Action CTA */}
                <div className="mt-8 pt-4">
                  <Link
                    href="/auth?role=customer"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#090B10] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-black hover:shadow-xl active:scale-95"
                  >
                    Launch Booking Studio <ArrowRight className="h-4 w-4 text-[#B8F23A]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BookingModes;
