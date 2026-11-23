'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@veyro/ui';
import { landingFaq } from '@/lib/public-policy';

export function Faq() {
  return (
    <section
      id="faq"
      className="relative flex min-h-screen min-h-[100dvh] w-full flex-col justify-center overflow-hidden border-b border-[#EAE7DC] bg-[#FAF9F5] text-[#090B10] py-16 sm:py-20 lg:py-0"
    >
      {/* Light Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E2DBD0 1px, transparent 1px), linear-gradient(to bottom, #E2DBD0 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#B8F23A]/15 blur-[90px]" />

      <div className="relative z-10 mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* Left: Editorial Header & CTAs */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D5] bg-[#F4F1EA] px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.22em] font-semibold text-[#090B10] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
              <span>Questions &amp; Clarity</span>
            </div>

            <h2 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.06] text-[#090B10]">
              Good questions.{' '}
              <span className="underline decoration-[#B8F23A] decoration-4 underline-offset-8">
                Complete clarity.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-relaxed text-[#5A6070] sm:text-lg">
              Still wondering how private-vehicle chauffeuring works? We publish all policies, cancellation tiers, and vehicle criteria upfront before you confirm.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth?role=customer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#090B10] text-white hover:bg-black font-bold text-sm shadow-md transition-all active:scale-[0.99] group"
              >
                <span>Book Your Chauffeur</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/driver"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-[#DCD8CC] text-[#090B10] hover:bg-[#F4F1EA] font-semibold text-sm transition-all"
              >
                <span>Drive With Veyro</span>
              </Link>
            </div>

            <div className="mt-10 pt-6 border-t border-[#EAE7DC] space-y-2 text-xs text-[#6A7080]">
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
                All drivers background &amp; police verified
              </p>
              <p className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#090B10]" />
                No surge multipliers · Immutable server quotes
              </p>
            </div>
          </div>

          {/* Right: Luxury Accordion Container */}
          <div className="rounded-3xl border border-[#DCD8CC] bg-white p-5 sm:p-7 shadow-xl">
            <Accordion type="single" collapsible className="space-y-3">
              {landingFaq.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`faq-${index}`}
                  className="rounded-2xl border border-[#EAE7DC] bg-[#FAF9F5] px-4 py-1 transition-colors hover:border-[#090B10]"
                >
                  <AccordionTrigger className="text-left font-display text-sm sm:text-base font-bold text-[#090B10] hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm leading-relaxed text-[#5A6070] pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Faq;
