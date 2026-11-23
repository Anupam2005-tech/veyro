'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorText, Field, Input, PageHeader, SectionTitle, Spinner } from '@/components/ui';
import { VehicleForm, VehiclePass } from '@/components/VehicleForm';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { useRequireRole, useSession } from '@/lib/session';
import type { Me, Vehicle } from '@/lib/types';

export default function CustomerOnboarding() {
  const me = useRequireRole('CUSTOMER');
  const { refresh } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [consent, setConsent] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  useEffect(() => {
    if (!me) return;
    if (me.name) setName(me.name);
    if (me.phone) setPhone(me.phone);
    if (me.consentAt) setConsent(true);
    if (me.onboarded) setSaved(true);
    void api<Vehicle[]>('/customers/vehicles').then(setVehicles).catch(() => undefined);
  }, [me]);

  if (!me) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Welcome to Veyro" subtitle="Add your details and your car to start booking." />
      <Card>
        <SectionTitle>Your details</SectionTitle>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => api<Me>('/me', { method: 'PATCH', body: { name, phone, consent } }));
            if (ok) {
              setSaved(true);
              await refresh();
            }
          }}
        >
          <Field label="Full name">{(id) => <Input id={id} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
          <Field label="Contact phone" hint="Include the country code, for example +919812345678. Your driver can see it only during a trip.">
            {(id) => <Input id={id} required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />}
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4" />
            <span>I agree to the Terms of Service and Privacy Policy. I understand that Veyro connects me with an independent driver and that I provide the vehicle.</span>
          </label>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" variant="dark" busy={busy}>{saved ? 'Update details' : 'Save and continue'}</Button>
        </form>
      </Card>

      <Card>
        <SectionTitle>Your car <span className="text-sm font-normal text-studio-muted">(optional now)</span></SectionTitle>
        {vehicles.length ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">{vehicles.map((v) => <VehiclePass key={v.id} vehicle={v} />)}</div>
        ) : null}
        <VehicleForm onSaved={(v) => setVehicles((list) => [...list, v])} submitLabel={vehicles.length ? 'Add another vehicle' : 'Add vehicle'} />
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!saved} onClick={() => router.push('/customer')}>
          Start booking
        </Button>
      </div>
    </div>
  );
}
