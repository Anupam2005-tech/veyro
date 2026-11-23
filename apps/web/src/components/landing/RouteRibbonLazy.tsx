'use client';

import dynamic from 'next/dynamic';

const RouteRibbon = dynamic(
  () => import('./RouteRibbon').then((module) => module.RouteRibbon),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="relative mx-auto aspect-[4/3] w-full max-w-xl sm:aspect-[16/10]"
      >
        <svg viewBox="0 0 640 360" className="h-full w-full" role="presentation">
          <path
            d="M34 292 C 122 292, 132 214, 220 214 S 344 258, 424 168 S 520 96, 606 74"
            fill="none"
            stroke="#AAB0C4"
            strokeOpacity="0.35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="34" cy="292" r="7" fill="#F2F4FA" />
          <circle cx="606" cy="74" r="7" fill="#B8F23A" />
        </svg>
      </div>
    ),
  }
);

export function RouteRibbonLazy() {
  return <RouteRibbon />;
}
