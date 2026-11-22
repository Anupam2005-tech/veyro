'use client';

import { useMemo, useState } from 'react';
import {
  createStubMapsAdapter,
  isValidLatLng,
  type DriverMarker,
  type LatLng,
  type MapsAdapter,
} from './maps-adapter';

interface PlacesAutocompleteProps {
  readonly adapter?: MapsAdapter;
  readonly onSelect?: (point: LatLng, label: string) => void;
}

/**
 * FE-035 — Places autocomplete field (Team 3).
 * Works offline against the stub adapter; when Team 1 wires the Google
 * Places loader with a valid browser key, pass a Google-backed adapter.
 * No key is read or bundled here.
 */
export function PlacesAutocomplete({ adapter, onSelect }: PlacesAutocompleteProps) {
  const active = useMemo(() => adapter ?? createStubMapsAdapter(), [adapter]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly LatLng[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function search(next: string): Promise<void> {
    setQuery(next);
    if (!next.trim()) {
      setResults([]);
      setNotice(null);
      return;
    }
    try {
      const hits = await active.geocode(next.trim());
      setResults(hits.filter(isValidLatLng).slice(0, 5));
      setNotice(
        active.provider === 'stub'
          ? 'Offline preview — connect Maps key for live places.'
          : null,
      );
    } catch {
      setResults([]);
      setNotice('Place lookup failed. Try again.');
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => void search(e.target.value)}
        placeholder="Search pickup or destination"
        aria-label="Search places"
        className="w-full rounded-md border px-3 py-2"
      />
      {notice ? <p role="status" className="text-xs">{notice}</p> : null}
      <ul className="space-y-1">
        {results.map((point, index) => (
          <li key={`${point.lat},${point.lng},${index}`}>
            <button
              type="button"
              onClick={() => onSelect?.(point, query)}
              className="w-full text-left rounded border px-3 py-2"
            >
              {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DriverMarkersList({ markers }: { readonly markers: readonly DriverMarker[] }) {
  if (!markers.length) {
    return <p role="status">No drivers in view. Expand the search radius.</p>;
  }
  return (
    <ul className="space-y-1">
      {markers.filter((m) => isValidLatLng(m)).map((m) => (
        <li key={m.driverId} className="rounded border px-3 py-2">
          <span className="font-mono text-xs">{m.driverId}</span>
          {m.stale ? (
            <span> — stale, {m.lastUpdatedAt}</span>
          ) : (
            <span>
              {' '}— {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
