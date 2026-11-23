'use client';

import { MapPin, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Place } from '@/lib/types';
import { cx } from './ui';

/**
 * Accessible place search (combobox pattern). Searches the API's places
 * adapter (offline gazetteer + OpenStreetMap geocoder).
 */
export function PlaceInput({
  label,
  value,
  onChange,
  placeholder,
  marker,
}: {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder?: string;
  marker?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value]);

  function search(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const hits = await api<Place[]>(`/places/search?q=${encodeURIComponent(q.trim())}`);
        setResults(hits);
        setActive(0);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  function choose(p: Place) {
    onChange(p);
    setQuery(p.label);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
        {marker ? (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-studio-brand text-[11px] font-semibold text-white">{marker}</span>
        ) : null}
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-studio-muted" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder ?? 'Search a place in Kolkata'}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              choose(results[active]!);
            } else if (e.key === 'Escape') setOpen(false);
          }}
          className="w-full min-h-[44px] rounded-xl border border-studio-input-border bg-white py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-studio-ink"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-studio-muted hover:bg-studio-tint"
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-studio-border bg-white py-1 shadow-lg">
          {results.length ? (
            results.map((p, i) => (
              <li
                key={`${p.lat},${p.lng},${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                className={cx('cursor-pointer px-3 py-2 text-sm', i === active ? 'bg-studio-tint' : '')}
              >
                {p.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-studio-muted">No matches. Try another name or tap the map.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
