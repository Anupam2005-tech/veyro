'use client';

import { PlacesAutocomplete } from '@/maps/PlacesAutocomplete';

export default function CustomerPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Book a driver</h1>
      <p className="text-sm opacity-70">
        Your car, our pro. Search a route, compare eligible drivers, confirm —
        fares use Team 2 hourly quotes; availability comes from Team 3 presence.
      </p>
      <PlacesAutocomplete onSelect={() => undefined} />
    </main>
  );
}
