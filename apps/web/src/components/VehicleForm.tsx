'use client';

import { useState } from 'react';
import { Car } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import type { Vehicle } from '@/lib/types';
import { Button, ErrorText, Field, Input, Select } from './ui';

export const CATEGORIES = ['HATCHBACK', 'SEDAN', 'SUV', 'MUV'];
export const TRANSMISSIONS = ['MANUAL', 'AUTOMATIC'];
export const FUELS = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'];

export function VehicleForm({ onSaved, submitLabel = 'Save vehicle' }: { onSaved: (v: Vehicle) => void; submitLabel?: string }) {
  const [v, setV] = useState({ make: '', model: '', plate: '', category: 'HATCHBACK', transmission: 'MANUAL', fuelType: 'PETROL' });
  const { busy, error, run } = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const saved = await run(() => api<Vehicle>('/customers/vehicles', { body: v }));
        if (saved) {
          onSaved(saved);
          setV({ ...v, make: '', model: '', plate: '' });
        }
      }}
    >
      <Field label="Make">{(id) => <Input id={id} required value={v.make} onChange={set('make')} placeholder="Maruti Suzuki" />}</Field>
      <Field label="Model">{(id) => <Input id={id} required value={v.model} onChange={set('model')} placeholder="Swift" />}</Field>
      <Field label="Registration (optional)">{(id) => <Input id={id} value={v.plate} onChange={set('plate')} placeholder="WB 02 AB 1234" />}</Field>
      <Field label="Category" hint="Used for driver matching">
        {(id) => (
          <Select id={id} value={v.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Transmission" hint="Used for driver matching">
        {(id) => (
          <Select id={id} value={v.transmission} onChange={set('transmission')}>
            {TRANSMISSIONS.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Fuel type" hint="Shown to your driver">
        {(id) => (
          <Select id={id} value={v.fuelType} onChange={set('fuelType')}>
            {FUELS.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </Select>
        )}
      </Field>
      <div className="sm:col-span-2 space-y-2">
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="dark" busy={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function VehiclePass({ vehicle, compact }: { vehicle: Vehicle; compact?: boolean }) {
  const tag = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
  return (
    <div className="rounded-xl border border-studio-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{vehicle.make} {vehicle.model}</p>
          {!compact && vehicle.plate ? <p className="mt-0.5 font-mono text-sm text-studio-muted">{vehicle.plate}</p> : null}
        </div>
        <Car className="h-5 w-5 text-studio-muted" aria-hidden />
      </div>
      <p className="mt-3 text-sm text-studio-muted">
        {tag(vehicle.category)} · {tag(vehicle.transmission)} · {tag(vehicle.fuelType)}
      </p>
    </div>
  );
}
