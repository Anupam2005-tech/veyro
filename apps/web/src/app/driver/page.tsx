'use client';

import { useState } from 'react';
import { describePermission, type PermissionState } from '@/maps/trip-map-helpers';

export default function DriverPage() {
  const [online, setOnline] = useState(false);
  const [permission] = useState<PermissionState>('prompt');
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Driver dashboard</h1>
      <p className="text-sm opacity-70">{describePermission(permission)}</p>
      <button
        type="button"
        onClick={() => setOnline((v) => !v)}
        className="rounded border px-4 py-2"
        aria-pressed={online}
      >
        {online ? 'Go offline' : 'Go online'}
      </button>
      <p className="text-xs opacity-70">
        Online requires approval, no suspension, fresh GPS and no active trip
        (server check at PATCH /api/v1/drivers/availability).
      </p>
    </main>
  );
}
