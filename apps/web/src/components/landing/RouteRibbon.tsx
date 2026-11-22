'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CarFront, Clock3, ShieldCheck } from 'lucide-react';

const routePath =
  'M34 292 C 122 292, 132 214, 220 214 S 344 258, 424 168 S 520 96, 606 74';

export function RouteRibbon() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/3] w-full max-w-xl sm:aspect-[16/10]"
    >
      <div className="absolute inset-6 rounded-full bg-theme-accent/10 blur-3xl" />
      <svg
        viewBox="0 0 640 360"
        className="relative h-full w-full overflow-visible"
        role="presentation"
      >
        <defs>
          <linearGradient id="veyro-route-glow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#AAB0C4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#B8F23A" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d={routePath}
          fill="none"
          stroke="url(#veyro-route-glow)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <motion.path
          d={routePath}
          fill="none"
          stroke="#B8F23A"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={reduceMotion ? undefined : 'veyro-route-line'}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
        <circle cx="34" cy="292" r="7" fill="#F2F4FA" />
        <circle cx="34" cy="292" r="13" fill="none" stroke="#AAB0C4" strokeOpacity="0.35" />
        <circle cx="606" cy="74" r="7" fill="#B8F23A" />
        <circle cx="606" cy="74" r="14" fill="none" stroke="#B8F23A" strokeOpacity="0.3" />
        <motion.g
          animate={reduceMotion ? undefined : { x: [120, 260, 420, 520], y: [236, 200, 150, 96] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx="0" cy="0" r="18" fill="#0B0E17" stroke="#B8F23A" strokeWidth="1.5" />
          <foreignObject x="-8" y="-8" width="16" height="16">
            <CarFront size={16} color="#B8F23A" />
          </foreignObject>
        </motion.g>
      </svg>

      <div className="absolute left-0 top-[12%] hidden rounded-panel border border-night-border bg-night-glass px-3 py-2 backdrop-blur sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-night-muted">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
          Verified chauffeur
        </p>
      </div>
      <div className="absolute bottom-[18%] right-0 hidden rounded-panel border border-night-border bg-night-glass px-3 py-2 backdrop-blur sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-night-muted">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
          Route preview · 12 min
        </p>
      </div>
      <div className="absolute left-[38%] top-0 rounded-panel border border-night-border bg-night-glass-strong px-3 py-2 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-widest text-night-accent">
          Live telemetry
        </p>
      </div>
    </div>
  );
}
