'use client';

import { useEffect, useState } from 'react';
import { Copy, Eye, Link2, Phone, ShieldAlert, Trash2 } from 'lucide-react';
import { api, apiWithMessage, errorMessage } from '@/lib/api';
import { countdown, dateTime, time } from '@/lib/format';
import { useAction, useNow } from '@/lib/hooks';
import type { LiveLocation } from '@/lib/types';
import { Alert, Button, Card, ErrorText, StatusBadge } from './ui';

/** OTP vault: the code lives only in component memory — never in URLs, storage or logs. */
export function OtpVaultCard({ tripId, kind, title, help }: { tripId: string; kind: 'start' | 'end'; title: string; help: string }) {
  const [otp, setOtp] = useState<{ code: string; expiresAt: string } | null>(null);
  const [hidden, setHidden] = useState(false);
  const { busy, error, run } = useAction();
  const now = useNow();
  const expired = otp ? new Date(otp.expiresAt).getTime() < now : false;

  return (
    <Card dark className="space-y-3">
      <p className="text-sm font-medium text-studio-muted">{title}</p>
      {otp && !expired ? (
        <>
          <p className="font-mono text-4xl font-semibold tracking-[0.2em] text-studio-ink" aria-live="polite">
            {hidden ? '••••••' : otp.code}
          </p>
          <p className="text-xs text-studio-muted">Valid for {countdown(otp.expiresAt, now)} · single use · say it to your driver in person</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setHidden((h) => !h)}>{hidden ? 'Show' : 'Hide'}</Button>
            <Button size="sm" variant="secondary" busy={busy} onClick={() => void run(async () => setOtp(await api(`/trips/${tripId}/${kind}-otp`, { method: 'POST' })))}>New code</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-studio-ink">{help}</p>
          <Button busy={busy} onClick={() => void run(async () => { setOtp(await api(`/trips/${tripId}/${kind}-otp`, { method: 'POST' })); setHidden(false); })}>
            <Eye className="h-4 w-4" aria-hidden /> {expired ? 'Generate a new code' : 'Reveal code'}
          </Button>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

export function LocationStatus({ location, label = 'Driver location' }: { location: LiveLocation | null; label?: string }) {
  if (!location) {
    return <Alert tone="warning" title={`${label} unavailable`}>The map will update as soon as a location is received.</Alert>;
  }
  if (location.stale) {
    return (
      <Alert tone="warning" title="Location not updated">
        Last updated at <span className="tabular-nums">{time(location.capturedAt)}</span>. The map will update when a new location is received.
      </Alert>
    );
  }
  return (
    <p className="text-xs text-studio-muted" role="status">
      {label} updated at <span className="tabular-nums">{time(location.capturedAt)}</span>
      {location.source === 'DEMO' ? ' (simulated)' : ''}
    </p>
  );
}

interface SosEvent {
  id: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  deliveryAttempts: { contactId: string; name: string; phone: string; status: string }[];
}

/** Demo SOS (DEC-09): records immediately, never claims an alert was sent. */
export function SosPanel({ tripId, contacts }: { tripId: string; contacts: { id: string; name: string; phone: string }[] }) {
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const { busy, error, run } = useAction();
  useEffect(() => {
    void api<SosEvent[]>(`/trips/${tripId}/sos`).then(setEvents).catch(() => undefined);
  }, [tripId]);
  const active = events.find((e) => e.status === 'ACTIVE');

  return (
    <Card className="space-y-3 border-red-200">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-semibold"><ShieldAlert className="h-5 w-5 text-red-700" aria-hidden /> Safety</p>
        <span className="text-xs font-semibold text-studio-muted">Test mode</span>
      </div>
      {!active ? (
        <Button
          variant="danger"
          size="lg"
          className="w-full"
          busy={busy}
          onClick={() =>
            void run(async () => {
              const r = await apiWithMessage<SosEvent>(`/trips/${tripId}/sos`, { method: 'POST' });
              setEvents((e) => [r.data, ...e]);
              setMessage(r.message);
            })
          }
        >
          SOS
        </Button>
      ) : (
        <div className="space-y-2">
          <Alert tone="danger" title={`SOS recorded at ${time(active.createdAt)}`}>{message ?? 'The Veyro team has been alerted. If you are in danger, call 112.'}</Alert>
          <ul className="space-y-1 text-sm">
            {active.deliveryAttempts.length ? active.deliveryAttempts.map((a) => (
              <li key={a.contactId} className="flex items-center justify-between gap-2">
                <span>{a.name}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold"><Phone className="h-3 w-3" aria-hidden /> Call</a>
                </span>
              </li>
            )) : <li className="text-studio-muted">No emergency contacts saved.</li>}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            busy={busy}
            onClick={() =>
              void run(async () => {
                const r = await api<SosEvent>(`/trips/${tripId}/sos/${active.id}/cancel`, { method: 'POST' });
                setEvents((e) => e.map((x) => (x.id === r.id ? r : x)));
              })
            }
          >
            Mark as false alarm
          </Button>
        </div>
      )}
      {!active && contacts.length ? (
        <div className="flex flex-wrap gap-2">
          {contacts.map((c) => (
            <a key={c.id} href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-studio-border px-2 py-1 text-xs font-semibold">
              <Phone className="h-3 w-3" aria-hidden /> {c.name}
            </a>
          ))}
        </div>
      ) : null}
      <a href="tel:112" className="block text-xs font-semibold underline">Call emergency services (112)</a>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

interface ShareLinkInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export function SharePanel({ tripId }: { tripId: string }) {
  const [links, setLinks] = useState<ShareLinkInfo[]>([]);
  const [fresh, setFresh] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { busy, error, run, setError } = useAction();
  useEffect(() => {
    void api<ShareLinkInfo[]>(`/trips/${tripId}/share-links`).then(setLinks).catch(() => undefined);
  }, [tripId]);

  return (
    <Card className="space-y-3">
      <p className="flex items-center gap-2 text-base font-semibold"><Link2 className="h-5 w-5" aria-hidden /> Share trip</p>
      <p className="text-xs text-studio-muted">People you share with need a Veyro account to view it. The link stops working when your trip ends or when you turn it off.</p>
      {fresh ? (
        <div className="space-y-2 rounded-xl bg-studio-tint p-3">
          <p className="break-all font-mono text-xs">{fresh.url}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fresh.url);
                setCopied(true);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            <Copy className="h-4 w-4" aria-hidden /> {copied ? 'Copied' : 'Copy link'}
          </Button>
          <p className="text-xs text-studio-muted">Copy the link now. For your security it will not be shown again.</p>
        </div>
      ) : null}
      <Button
        variant="dark"
        busy={busy}
        onClick={() =>
          void run(async () => {
            const r = await api<{ id: string; path: string; expiresAt: string }>(`/trips/${tripId}/share-links`, { method: 'POST' });
            setFresh({ id: r.id, url: `${window.location.origin}${r.path}` });
            setCopied(false);
            setLinks((l) => [{ id: r.id, createdAt: new Date().toISOString(), expiresAt: r.expiresAt }, ...l]);
          })
        }
      >
        Create share link
      </Button>
      {links.length ? (
        <ul className="space-y-1 text-sm">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between">
              <span className="text-studio-muted">Link created {dateTime(l.createdAt)}</span>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Revoke link"
                onClick={() =>
                  void run(async () => {
                    await api(`/trips/${tripId}/share-links/${l.id}`, { method: 'DELETE' });
                    setLinks((list) => list.filter((x) => x.id !== l.id));
                    if (fresh?.id === l.id) setFresh(null);
                  })
                }
              >
                <Trash2 className="h-4 w-4" /> Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
