'use client';
import * as React from 'react';
import { Bell, BellRing, CalendarCheck, CarFront, CreditCard, ShieldCheck } from 'lucide-react';
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
  const TriggerIcon = unread ? BellRing : Bell;
  return <details className="relative" onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.open = false; }}>
    <summary className="relative grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-studio-border bg-white text-studio-ink shadow-sm transition-colors hover:bg-studio-tint focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden" aria-label={`Notifications, ${unread} unread`}>
      <TriggerIcon aria-hidden="true" className="h-[18px] w-[18px]" />
      {unread ? <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-studio-lime px-1.5 py-0.5 text-[10px] font-bold ring-2 ring-white">{unread > 9 ? '9+' : unread}</span> : null}
    </summary>
    <div className="absolute -right-12 z-50 mt-3 max-h-[min(30rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-card border border-studio-border bg-white p-4 text-studio-ink shadow-xl sm:right-0">
      <header className="flex items-center justify-between gap-2 border-b border-studio-border pb-3">
        <h2 className="font-display text-lg font-bold">Notifications</h2>
        {unread ? <span className="rounded-full bg-studio-tint px-2 py-1 text-xs font-semibold">{unread} unread</span> : null}
      </header>
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
      {items.length === 0 ? <p className="rounded-panel bg-studio-bg p-5 text-center text-sm text-studio-muted">No updates yet.</p> : <ul className="mt-3 space-y-1">{items.map(item => {
        const Icon = item.type.includes('BOOKING') ? CalendarCheck : item.type.startsWith('PAYMENT_') ? CreditCard :
          /TRIP|ARRIVED|NO_SHOW/.test(item.type) ? CarFront : ShieldCheck;
        return <li key={item.id}>
        <button type="button" aria-label={item.read ? item.title : `Mark as read: ${item.title}`}
          className={`flex w-full items-center gap-3 rounded-panel p-2.5 text-left text-sm hover:bg-studio-bg ${item.read ? 'text-studio-muted' : 'bg-studio-tint/60 font-semibold'}`} onClick={async () => {
          if (item.read) return;
          try { await markNotificationRead(user, item.id, role); setItems(list => list.map(i => i.id === item.id ? { ...i, read: true } : i)); setError(null); }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not mark update read.'); }
        }}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-studio-border"><Icon aria-hidden="true" className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block">{item.title}</span><time className="block text-xs font-normal text-studio-muted" dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</time></span>
          {!item.read ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-emerald-600" /> : null}</button>
      </li>;
      })}</ul>}
    </div>
  </details>;
}
