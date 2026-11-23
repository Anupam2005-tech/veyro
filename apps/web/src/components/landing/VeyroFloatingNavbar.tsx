'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  CarFront,
  ChevronDown,
  HelpCircle,
  Menu,
  Percent,
  ShieldCheck,
  X,
} from 'lucide-react';

const PROTOCOL_ITEMS = [
  {
    label: 'Vehicles',
    href: '#vehicle',
    desc: 'Customer-Owned Asset Protocol',
    icon: CarFront,
  },
  {
    label: 'Fares',
    href: '#fares',
    desc: 'Zero-Surge Transparent Economics',
    icon: Percent,
  },
  {
    label: 'Safety',
    href: '#safety',
    desc: 'Dual-Ended Verification & Telemetry',
    icon: ShieldCheck,
  },
  {
    label: 'FAQ',
    href: '#faq',
    desc: 'Protocols, Waiting & Logistics',
    icon: HelpCircle,
  },
];

export function VeyroFloatingNavbar() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="pointer-events-auto relative w-full max-w-4xl">
        {/* Main Navbar Pill in Luxury Light Theme */}
        <nav
          aria-label="Main Navigation"
          className="relative flex items-center justify-between rounded-full border border-[#EAE7DC] bg-white/90 px-4 sm:px-6 py-2 backdrop-blur-xl backdrop-saturate-150 shadow-[0_10px_35px_rgba(0,0,0,0.07)] transition-all"
        >
          {/* Subtle specular top light highlight */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
          />

          {/* Left: Brand Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-0.5 hover:opacity-85 transition-opacity"
            aria-label="Veyro Home"
          >
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={105}
              height={30}
              className="h-6 sm:h-6.5 w-auto object-contain"
              priority
            />
          </Link>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#how-it-works"
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#5A6070] hover:text-[#090B10] hover:bg-[#FAF9F5] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#booking-modes"
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#5A6070] hover:text-[#090B10] hover:bg-[#FAF9F5] transition-colors"
            >
              Booking
            </a>

            {/* Interactive Protocol Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                onMouseEnter={() => setDropdownOpen(true)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  dropdownOpen
                    ? 'text-[#090B10] bg-[#FAF9F5]'
                    : 'text-[#5A6070] hover:text-[#090B10] hover:bg-[#FAF9F5]'
                }`}
              >
                <span>Protocol</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-[#090B10]' : 'text-[#8A90A0]'
                  }`}
                />
              </button>

              {/* Spring Animated Dropdown Card (Light Theme) */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    onMouseLeave={() => setDropdownOpen(false)}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-2xl border border-[#EAE7DC] bg-white/95 p-2 shadow-2xl shadow-black/10 backdrop-blur-2xl z-50 text-[#090B10]"
                  >
                    <div className="px-3 py-2 border-b border-[#F4F1EA]">
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#8A90A0]">
                        Architecture &amp; Rules
                      </p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {PROTOCOL_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[#FAF9F5]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#EAE7DC] bg-[#FAF9F5] text-[#090B10] group-hover:border-[#090B10] transition-colors">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#090B10]">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-[#6A7080] truncate">
                                {item.desc}
                              </p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Sharp High-Contrast Sign In Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="group relative overflow-hidden rounded-full bg-[#090B10] px-5 py-2 text-xs font-black uppercase tracking-wider text-white transition-all duration-300 hover:bg-[#1E222D] hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
              {/* Shimmer Light Sweep */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
              />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#090B10] md:hidden hover:bg-[#FAF9F5] transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Drawer (Light Theme) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="mt-2 rounded-3xl border border-[#EAE7DC] bg-white/95 p-4 shadow-2xl backdrop-blur-2xl md:hidden text-[#090B10]"
            >
              <div className="flex flex-col gap-1 pb-3 border-b border-[#F4F1EA]">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-semibold text-[#5A6070] hover:text-[#090B10] rounded-xl hover:bg-[#FAF9F5] transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#booking-modes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-semibold text-[#5A6070] hover:text-[#090B10] rounded-xl hover:bg-[#FAF9F5] transition-colors"
                >
                  Booking
                </a>
              </div>

              <div className="pt-3 pb-2 space-y-1">
                <p className="px-3 text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#8A90A0]">
                  Protocol
                </p>
                {PROTOCOL_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#090B10] hover:bg-[#FAF9F5] transition-colors"
                    >
                      <Icon className="h-4 w-4 text-[#5A6070]" />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#F4F1EA]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/auth');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#090B10] px-4 py-3 text-sm font-bold text-white shadow-sm"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default VeyroFloatingNavbar;
