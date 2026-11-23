'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapView } from '@/components/MapView';
import { PlaceInput } from '@/components/PlaceInput';
import { Button, Card, ChipToggle, ErrorText, Field, Input, PageHeader, SectionTitle, Spinner, StatusBadge, Textarea } from '@/components/ui';
import { CATEGORIES, TRANSMISSIONS } from '@/components/VehicleForm';
import { apiWithMessage } from '@/lib/api';
import { dateTime, humanize, inr, shortId } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import { useRequireRole, useSession } from '@/lib/session';
import type { DriverSelf, Place, Trip } from '@/lib/types';

export default function DriverProfilePage() {
  const me = useRequireRole('DRIVER');
  const { refresh } = useSession();
  const trips = useApi<Trip[]>(me ? '/drivers/trips' : null);
  const [rate, setRate] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [trans, setTrans] = useState<string[]>([]);
  const [langs, setLangs] = useState('');
  const [bio, setBio] = useState('');
  const [area, setArea] = useState<Place | null>(null);
  const [radius, setRadius] = useState('15');
  const [saved, setSaved] = useState<string | null>(null);
  const save = useAction();

  useEffect(() => {
    const d = me?.driver;
    if (!d) return;
    setRate(String(d.hourlyRateInr));
    setCats(d.categories);
    setTrans(d.transmissions);
    setLangs(d.languages.join(', '));
    setBio(d.bio);
    setArea({ label: d.serviceArea.label, lat: d.serviceArea.lat, lng: d.serviceArea.lng });
    setRadius(String(d.serviceArea.radiusKm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.driver?.id]);

  if (!me || !me.driver) return <Spinner />;
  const toggle = (list: string[], set: (l: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const history = trips.data?.filter((t) => !['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'NOT_STARTED'].includes(t.status)) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle={me.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Rates and vehicles</SectionTitle>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await save.run(() =>
                apiWithMessage<DriverSelf>('/drivers/me', {
                  method: 'PATCH',
                  body: {
                    hourlyRateInr: Number(rate),
                    categories: cats,
                    transmissions: trans,
                    languages: langs.split(',').map((l) => l.trim()).filter(Boolean),
                    bio,
                    ...(area ? { serviceArea: { ...area, radiusKm: Number(radius) } } : {}),
                  },
                }),
              );
              if (r) {
                setSaved(r.message);
                void refresh();
              }
            }}
          >
            <Field label="Hourly rate (₹)" hint="Changes apply to new bookings only.">
              {(id) => <Input id={id} type="number" min={0} max={100000} required value={rate} onChange={(e) => setRate(e.target.value)} />}
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Vehicle categories</legend>
              <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <ChipToggle key={c} selected={cats.includes(c)} onClick={() => toggle(cats, setCats, c)}>{humanize(c)}</ChipToggle>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Transmissions</legend>
              <div className="flex flex-wrap gap-2">{TRANSMISSIONS.map((c) => <ChipToggle key={c} selected={trans.includes(c)} onClick={() => toggle(trans, setTrans, c)}>{humanize(c)}</ChipToggle>)}</div>
            </fieldset>
            <Field label="Languages" hint="Separate languages with commas">{(id) => <Input id={id} value={langs} onChange={(e) => setLangs(e.target.value)} />}</Field>
            <Field label="Short bio">{(id) => <Textarea id={id} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} />}</Field>
            <PlaceInput label="Service area centre" value={area} onChange={setArea} />
            <Field label="Service radius (km)">{(id) => <Input id={id} type="number" min={2} max={60} value={radius} onChange={(e) => setRadius(e.target.value)} />}</Field>
            {area ? <MapView className="h-48" markers={[{ id: 'area', ...area, kind: 'area' }]} circle={{ lat: area.lat, lng: area.lng, radiusKm: Number(radius) || 0 }} fitKey={`${area.lat},${area.lng},${radius}`} /> : null}
            <ErrorText>{save.error}</ErrorText>
            {saved ? <p className="text-sm text-emerald-800" role="status">{saved}</p> : null}
            <Button type="submit" variant="dark" busy={save.busy} disabled={!cats.length || !trans.length}>Save profile</Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Trip history</SectionTitle>
          {history.length ? (
            <ul className="divide-y divide-studio-border text-sm">
              {history.map((t) => (
                <li key={t.id}>
                  <Link href={`/driver/trips/${t.id}`} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      <span className="block font-medium">{t.booking?.pickup.label.split(',')[0]} → {t.booking?.destination.label.split(',')[0]}</span>
                      <span className="text-xs text-studio-muted">#{shortId(t.id)} · {dateTime(t.endedAt ?? t.booking?.pickupAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={t.status} />
                      {t.fare ? <span className="font-semibold tabular-nums">{inr(t.fare.totalInr)}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-studio-muted">No finished trips yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
