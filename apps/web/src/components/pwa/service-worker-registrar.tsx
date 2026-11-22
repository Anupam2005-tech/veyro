'use client';

import * as React from 'react';

export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let registered = false;
    const register = () => {
      if (registered) {
        return;
      }
      registered = true;
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    };

    window.addEventListener('load', register);
    if (document.readyState === 'complete') {
      register();
    }

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
