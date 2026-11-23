const CACHE_NAME = 'veyro-shell-v3';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/icons/veyro-dark-pwa-192.png',
  '/icons/veyro-dark-pwa-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('veyro-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === '/' && response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html')) || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(async () => (await caches.match(request)) || Response.error())
    );
  }
});

const workspaces = {
  DRIVER: { url: '/driver', title: 'Veyro Driver update' },
  CUSTOMER: { url: '/customer', title: 'Veyro Customer update' },
  ADMIN: { url: '/admin', title: 'Veyro Admin update' },
};
const isWorkspaceClient = (client, path) => {
  const url = new URL(client.url);
  return url.origin === self.location.origin && (url.pathname === path || url.pathname.startsWith(path + '/'));
};

// The browser holds only an opaque channel for the currently enrolled workspace.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json()?.data; } catch { return; }
    if (!payload?.channel || !Object.hasOwn(workspaces, payload.audience)) return;
    const binding = await caches.match('/__veyro_push_channel__', { cacheName: 'veyro-push-channel' }).then(response => response?.json());
    if (binding?.channel !== payload.channel || binding.audience !== payload.audience) return;
    const workspace = workspaces[payload.audience];
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .filter(client => isWorkspaceClient(client, workspace.url));
    windows.forEach(client => client.postMessage({ type: 'VEYRO_INBOX_UPDATE', audience: payload.audience }));
    if (windows.some(client => client.visibilityState === 'visible')) return;
    return self.registration.showNotification(workspace.title, {
      body: 'Open your inbox to read the update.', icon: '/icons/veyro-dark-pwa-192.png', tag: 'veyro-' + payload.channel,
      data: { audience: payload.audience, channel: payload.channel },
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const { audience, channel } = event.notification.data ?? {};
    const binding = await caches.match('/__veyro_push_channel__', { cacheName: 'veyro-push-channel' }).then(response => response?.json());
    if (!channel || binding?.channel !== channel || binding.audience !== audience || !Object.hasOwn(workspaces, audience)) return;
    const path = workspaces[audience].url;
    const existing = windows.find(client => isWorkspaceClient(client, path));
    return existing ? existing.focus() : self.clients.openWindow(path);
  }));
});
