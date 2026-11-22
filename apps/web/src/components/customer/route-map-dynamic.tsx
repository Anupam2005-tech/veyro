'use client';

import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('./route-map'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-[420px] items-center justify-center rounded-card border border-studio-border bg-studio-tint text-sm font-medium text-studio-muted lg:h-full lg:min-h-[620px]"
    >
      Loading map…
    </div>
  ),
});

export default RouteMap;
