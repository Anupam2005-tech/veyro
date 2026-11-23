'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PayPanel } from '@/components/PayPanel';
import { Button, Card, ErrorText, Field, Input, PageHeader, SectionTitle, Spinner, StatusBadge } from '@/components/ui';
import { VehicleForm, VehiclePass } from '@/components/VehicleForm';
import { api } from '@/lib/api';
import { dateTime, humanize, inr } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole, useSession } from '@/lib/session';
import type { LedgerEntry, Me, Vehicle } from '@/lib/types';

export default function CustomerProfile() {
  const me = useRequireRole('CUSTOMER');
  const { refresh } = useSession();
  const vehicles = useApi<Vehicle[]>(me ? '/customers/vehicles' : null);
  const payments = useApi<{ ledger: LedgerEntry[]; mode: string }>(me ? '/payments' : null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const profile = useAction();
  const ec = useAction();
  const veh = useAction();
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setPhone(me.phone);
    setContacts(me.emergencyContacts.map(({ name: n, phone: p }) => ({ name: n, phone: p })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  if (!me) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Account" subtitle={me.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Your details</SectionTitle>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await profile.run(() => api<Me>('/me', { method: 'PATCH', body: { name, phone } }));
              if (r) {
                setSaved('Details saved.');
                void refresh();
              }
            }}
          >
            <Field label="Full name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="Phone">{(id) => <Input id={id} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />}</Field>
            <ErrorText>{profile.error}</ErrorText>
            {saved ? <p className="text-sm text-emerald-800" role="status">{saved}</p> : null}
            <Button type="submit" variant="dark" busy={profile.busy}>Save</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-studio-muted">
            <span>Account: <StatusBadge status={me.status} /></span>
            <span>Qualifying cancellations: {me.customerCancellationCount} / 5</span>
          </div>
        </Card>

        <Card>
          <SectionTitle>Emergency contacts</SectionTitle>
          <p className="mb-3 text-xs text-studio-muted">Add up to three people you can call quickly from your trip screen.</p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await ec.run(() => api<Me>('/me/emergency-contacts', { method: 'PUT', body: { contacts } }));
              if (r) {
                setSaved('Emergency contacts saved.');
                void refresh();
              }
            }}
          >
            {contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr,1fr,auto] items-end gap-2">
                <Field label={`Name ${i + 1}`}>{(id) => <Input id={id} value={c.name} onChange={(e) => setContacts((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />}</Field>
                <Field label="Phone">{(id) => <Input id={id} value={c.phone} onChange={(e) => setContacts((l) => l.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} placeholder="+91…" />}</Field>
                <Button variant="ghost" aria-label={`Remove contact ${i + 1}`} onClick={() => setContacts((l) => l.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="flex gap-2">
              {contacts.length < 3 ? <Button variant="secondary" onClick={() => setContacts((l) => [...l, { name: '', phone: '+91' }])}>Add contact</Button> : null}
              <Button type="submit" variant="dark" busy={ec.busy}>Save contacts</Button>
            </div>
            <ErrorText>{ec.error}</ErrorText>
          </form>
        </Card>
      </div>

      <section id="vehicles">
        <Card>
          <SectionTitle>Vehicles</SectionTitle>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.data?.map((v) => (
              <div key={v.id} className="space-y-2">
                <VehiclePass vehicle={v} />
                <div className="flex items-center gap-2">
                  {v.isDefault ? (
                    <StatusBadge status="ACTIVE" label="Default" />
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void veh.run(async () => { await api(`/customers/vehicles/${v.id}`, { method: 'PATCH', body: { isDefault: true } }); await vehicles.reload(); })}>
                      Make default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void veh.run(async () => { await api(`/customers/vehicles/${v.id}`, { method: 'DELETE' }); await vehicles.reload(); })}>
                    <Trash2 className="h-4 w-4" aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ErrorText>{veh.error}</ErrorText>
          <h3 className="mb-2 text-sm font-semibold">Add a vehicle</h3>
          <VehicleForm onSaved={() => void vehicles.reload()} />
        </Card>
      </section>

      <section id="payments" className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <PayPanel onPaid={() => void payments.reload()} />
        <Card>
          <SectionTitle>Payments</SectionTitle>
          {payments.data?.ledger.length ? (
            <ul className="divide-y divide-studio-border text-sm">
              {payments.data.ledger.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{humanize(e.type)}</p>
                    <p className="text-xs text-studio-muted">{e.reason} · {dateTime(e.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.disputeStatus !== 'NONE' ? <StatusBadge status={e.disputeStatus} label={`Dispute: ${humanize(e.disputeStatus)}`} /> : null}
                    <StatusBadge status={e.status} />
                    <span className="font-semibold tabular-nums">{inr(e.amountInr)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-studio-muted">No charges yet.</p>
          )}
          <p className="mt-3 text-xs text-studio-muted">Payment mode: {payments.data?.mode === 'RAZORPAY_TEST' ? 'Razorpay (test mode)' : 'Test payments'}</p>
        </Card>
      </section>
    </div>
  );
}
