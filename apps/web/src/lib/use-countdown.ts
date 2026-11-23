'use client';

import * as React from 'react';

export function useCountdown(target: string | null | undefined): string | null {
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const difference = new Date(target).getTime() - Date.now();
      setRemaining(Math.max(0, difference));
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!target || remaining === null) {
    return null;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
