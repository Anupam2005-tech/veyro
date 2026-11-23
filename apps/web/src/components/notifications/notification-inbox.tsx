'use client';
import * as React from 'react';
import { Bell } from 'lucide-react';
import { getNotifications, markNotificationRead, type NotificationRole } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session-provider';
import { usePolling } from '@/lib/hooks/use-polling';
import { disablePush, enablePush } from '@/lib/firebase/push';
import { isDemoDataMode } from '@/lib/env';
import { requestEmailVerification } from '@/lib/auth/auth';

export function NotificationInbox({ role }: { role: NotificationRole }) {
  const { user } = useSession();
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getNotifications>>>([]);
  const [pushNotice, setPushNotice] = React.useState<string | null>(null);
  const [pushBusy, setPushBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = React.useState(false);
  const [emailCheckDone, setEmailCheckDone] = React.useState(false);
  React.useEffect(() => {
    let active = true; setItems([]); setError(null); setEmailCheckDone(false);
    if (user && !isDemoDataMode) void getNotifications(user, role).then(v => { if (active) { setItems(v); setError(null); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Inbox unavailable.'); });
    const onPush = (event: MessageEvent) => {
      if (event.data?.type === 'VEYRO_INBOX_UPDATE' && event.data.audience === role && user) void getNotifications(user, role).then(v => { if (active) { setItems(v); setError(null); } }).catch(() => { if (active) setError('Inbox refresh failed; retry when online.'); });
    };
    navigator.serviceWorker?.addEventListener('message', onPush);
    return () => { active = false; navigator.serviceWorker?.removeEventListener('message', onPush); };
  }, [user, role]);
  usePolling(user && !isDemoDataMode ? user.uid + ':' + role : null, () => getNotifications(user!, role), v => { setItems(v); setError(null); },
    e => setError(e instanceof Error ? e.message : 'Inbox unavailable.'), 30000);
  if (!user || isDemoDataMode) return null;
  const unread = items.filter(i => !i.read).length;
  return <details className="relative" onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.open = false; }}>
    <summary className="flex h-10 cursor-pointer list-none items-center gap-1 rounded-control border border-studio-border px-2 text-studio-ink" aria-label={`Notifications, ${unread} unread`}>
      <Bell aria-hidden="true" className="h-4 w-4" /><span className="text-xs">{unread || ''}</span>
    </summary>
    <div className="absolute right-0 z-50 mt-2 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-panel border border-studio-border bg-white p-3 text-studio-ink shadow-xl">
      <h2 className="font-semibold">Notifications</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <button type="button" disabled={pushBusy} className="rounded-control border border-studio-border px-2 py-1" onClick={async () => { setPushBusy(true); try { setPushNotice(await enablePush(user, role)); } catch (e) { setPushNotice(e instanceof Error ? e.message : 'Push setup failed; inbox remains available.'); } finally { setPushBusy(false); } }}>Enable device push</button>
        <button type="button" disabled={pushBusy} className="rounded-control border border-studio-border px-2 py-1" onClick={async () => { setPushBusy(true); try { await disablePush(user); setPushNotice('Device push disabled. Your inbox remains available.'); } catch (e) { setPushNotice(e instanceof Error ? e.message : 'Could not remove device push.'); } finally { setPushBusy(false); } }}>Disable device push</button>
      </div>
      {user.email && user.emailVerified === false && !emailCheckDone ? (
        <button type="button" disabled={verifyingEmail} className="mt-2 rounded-control border border-studio-border px-2 py-1 text-xs"
          onClick={async () => {
            setVerifyingEmail(true);
            try {
              const sent = await requestEmailVerification();
              setEmailCheckDone(true);
              setPushNotice(sent ? 'Check your inbox for the verification link.' : 'Your email is verified.');
            } catch { setPushNotice('Could not send a verification link. Try again later.'); }
            finally { setVerifyingEmail(false); }
          }}>Verify email address</button>
      ) : null}
      {pushNotice ? <p role="status" className="mt-2 text-xs">{pushNotice}</p> : null}
      {error ? <p role="alert" className="mt-2 text-xs">{error}</p> : null}
      {items.length === 0 ? <p className="mt-3 text-xs text-studio-muted">No updates yet.</p> : <ul className="mt-2 space-y-1">{items.map(item => <li key={item.id}>
        <button type="button" className={`w-full rounded-control p-2 text-left text-xs hover:bg-studio-bg ${item.read ? 'text-studio-muted' : 'font-semibold'}`} onClick={async () => {
          try { await markNotificationRead(user, item.id, role); setItems(list => list.map(i => i.id === item.id ? { ...i, read: true } : i)); setError(null); }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not mark update read.'); }
        }}><span className="block">{item.title}</span><time className="mt-1 block font-normal" dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</time></button>
      </li>)}</ul>}
    </div>
  </details>;
}
