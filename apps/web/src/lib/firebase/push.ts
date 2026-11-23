import type { AuthUser } from '../auth/types';
import { firebaseVapidKey, hasFirebaseConfig, isDemoDataMode } from '../env';
import { request } from '../api/transport';
import type { NotificationRole } from '../api/client';

let registered: { uid: string; token: string } | null = null;
let revision = 0;
const channelCache = 'veyro-push-channel';
const channelPath = '/__veyro_push_channel__';

export async function enablePush(user: AuthUser, role: NotificationRole = 'CUSTOMER'): Promise<string> {
  if (isDemoDataMode || !firebaseVapidKey) return 'Push is not configured. Your in-app inbox remains available.';
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') {
    return 'Push is unavailable here. Your in-app inbox remains available.';
  }
  const attempt = ++revision;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'Push permission was not granted. Your in-app inbox remains available.';
  if (attempt !== revision) return 'Push setup was cancelled.';
  const [{ getMessaging, getToken, isSupported }, { getClientFirebaseApp }] = await Promise.all([import('firebase/messaging'), import('./client')]);
  if (!await isSupported()) return 'This browser does not support push. Your in-app inbox remains available.';
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_r, reject) => setTimeout(() => reject(new Error('Push setup timed out. Your inbox remains available.')), 10000))]);
  const token = await getToken(getMessaging(getClientFirebaseApp()), { vapidKey: firebaseVapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('No push registration was issued. Your inbox remains available.');
  const authToken = await user.getIdToken();
  if (attempt !== revision) return 'Push setup was cancelled.';
  const { channel } = await request<{ channel: string }>('/notifications/device', {
    method: 'POST', body: JSON.stringify({ token, role }),
  }, authToken);
  if (attempt !== revision) return 'Push setup was cancelled.';
  const cache = await caches.open(channelCache);
  if (attempt !== revision) return 'Push setup was cancelled.';
  await cache.put(channelPath, Response.json({ channel, audience: role }));
  registered = { uid: user.uid, token };
  return 'Push enabled on this device. Your in-app inbox is also available.';
}
export async function disablePush(user: AuthUser): Promise<void> {
  revision++;
  if (isDemoDataMode || !hasFirebaseConfig || typeof window === 'undefined') return;
  if ('caches' in window) await caches.delete(channelCache);
  const previous = registered;
  registered = null;
  if (previous?.uid === user.uid) await request('/notifications/device/remove', { method: 'POST',
    signal: AbortSignal.timeout(3000), body: JSON.stringify({ token: previous.token }) }, await user.getIdToken()).catch(() => {});
  const [{ deleteToken, getMessaging, isSupported }, { getClientFirebaseApp }] = await Promise.all([import('firebase/messaging'), import('./client')]);
  if (!await isSupported()) return;
  await deleteToken(getMessaging(getClientFirebaseApp()));
}
