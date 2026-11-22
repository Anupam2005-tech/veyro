'use client';

import { CarFront, Clock3, ShieldCheck } from 'lucide-react';

const routePath =
  'M34 292 C 122 292, 132 214, 220 214 S 344 258, 424 168 S 520 96, 606 74';

export function RouteRibbon() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/3] w-full max-w-xl sm:aspect-[16/10]"
    >
      <svg
        viewBox="0 0 640 360"
        className="h-full w-full"
        role="presentation"
      >
        <path
          d={routePath}
          fill="none"
          stroke="#AAB0C4"
          strokeOpacity="0.28"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={routePath}
          fill="none"
          stroke="#B8F23A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="34" cy="292" r="7" fill="#F2F4FA" />
        <circle cx="34" cy="292" r="13" fill="none" stroke="#AAB0C4" strokeOpacity="0.35" />
        <circle cx="606" cy="74" r="7" fill="#B8F23A" />
        <circle cx="606" cy="74" r="14" fill="none" stroke="#B8F23A" strokeOpacity="0.3" />
        <g transform="translate(424 168)">
          <circle cx="0" cy="0" r="18" fill="#0B0E17" stroke="#B8F23A" strokeWidth="1.5" />
          <foreignObject x="-8" y="-8" width="16" height="16">
            <CarFront size={16} color="#B8F23A" />
          </foreignObject>
        </g>
      </svg>

      <div className="absolute left-0 top-[12%] hidden rounded-control border border-night-border bg-night-surface px-3 py-2 sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-night-muted">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
          Verified chauffeur
        </p>
      </div>
      <div className="absolute bottom-[18%] right-0 hidden rounded-control border border-night-border bg-night-surface px-3 py-2 sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-night-muted">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-night-accent" />
          Route preview · 12 min
        </p>
      </div>
      <div className="absolute left-[38%] top-0 rounded-control border border-night-border bg-night-surface px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-night-accent">
          Live telemetry
        </p>
      </div>
    </div>
  );
}
