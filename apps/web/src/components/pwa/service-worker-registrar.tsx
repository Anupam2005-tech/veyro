'use client';

import * as React from 'react';

export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // A production worker can control this origin after switching to next dev.
      void navigator.serviceWorker.getRegistrations().then(async registrations => {
        for (const registration of registrations) {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          if (worker && new URL(worker.scriptURL).pathname === '/sw.js') {
            await registration.unregister();
          }
        }
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('veyro-shell-')).map(key => caches.delete(key)));
      }).catch(() => undefined);
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
