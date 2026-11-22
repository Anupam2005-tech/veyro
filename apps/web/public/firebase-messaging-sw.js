/* Firebase Cloud Messaging service worker (Team 3 + Team 1).
 * Placeholder for Release 1: shows in-app fallback when permission or token
 * is missing, and never claims SENT without a confirmed channel.
 * Team 1 wires registration with the VAPID key; Team 3 owns delivery logic.
 * Configure NEXT_PUBLIC_FIREBASE_VAPID_KEY and the web push certificate
 * in App Hosting before enabling background push.
 */
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return {};
    }
  })();
  const title = typeof data.title === 'string' ? data.title : 'Veyro update';
  const body =
    typeof data.body === 'string' ? data.body : 'Open Veyro to view details.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url: typeof data.url === 'string' ? data.url : '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : '/';
  event.waitUntil(clients.openWindow(url));
});
