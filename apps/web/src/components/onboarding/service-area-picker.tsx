'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Field, Input } from '@veyro/ui';
import { getMapsProvider, type Coordinate, type PlaceSuggestion } from '@/lib/maps';
import { isDemoDataMode } from '@/lib/env';

export function serviceAreaNames(places: PlaceSuggestion[]) {
  return places.map(place => place.address || place.label).join('; ');
}

export function ServiceAreaPicker({ places, onChange, bias, error, pickupZone = false }: {
  places: PlaceSuggestion[];
  onChange: (value: PlaceSuggestion[]) => void;
  bias?: Coordinate | null;
  error?: string;
  pickupZone?: boolean;
}) {
  const id = pickupZone ? 'pickup-zone-centre' : 'driver-areas';
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<PlaceSuggestion[]>([]);
  const [active, setActive] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const input = React.useRef<HTMLInputElement>(null);
  const visible = open && query.trim().length >= 3;
  const choices = options.filter(option => !places.some(place => place.id === option.id));

  React.useEffect(() => {
    if (!visible) return;
    let current = true;
    const timer = window.setTimeout(async () => {
      try {
        const results = await getMapsProvider().searchPlaces(query.trim(), bias);
        if (current) setOptions(results);
      } catch {
        if (current) setNotice('Place suggestions are unavailable. Check your connection and try again.');
      } finally {
        if (current) setLoading(false);
      }
    }, 250);
    return () => { current = false; window.clearTimeout(timer); };
  }, [visible, query, bias]);

  function select(place: PlaceSuggestion) {
    const next = pickupZone ? [place] : [...places, place];
    if (next.length > 10) {
      setNotice('You can select up to 10 areas. Remove an area to add another.');
      return;
    }
    onChange(next);
    setQuery('');
    setOptions([]);
    setActive(-1);
    setNotice('');
    input.current?.focus();
  }

  return <div className="relative space-y-2">
    <Field id={id} label={pickupZone ? 'Pickup zone centre' : 'Service areas'} required error={error}
      hint={pickupZone ? 'Choose an address or locality as the centre of your pickup zone.' : 'Search for a locality and choose a suggestion. Add more areas one at a time.'}>
      <Input ref={input} id={id} placeholder={pickupZone ? 'Search for an address or locality' : 'Search for a locality'} autoComplete="off"
        value={query} invalid={Boolean(error)} role="combobox" aria-autocomplete="list"
        aria-expanded={visible && choices.length > 0}
        aria-controls={visible && choices.length ? id + '-suggestions' : undefined}
        aria-activedescendant={visible && choices[active] ? id + '-option-' + active : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1); }}
        onChange={event => {
          const value = event.currentTarget.value;
          setQuery(value);
          setOpen(true);
          setOptions([]);
          setActive(-1);
          setNotice('');
          setLoading(value.trim().length >= 3);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!choices.length) return;
            event.preventDefault();
            setOpen(true);
            setActive(index => event.key === 'ArrowDown' ? (index + 1) % choices.length :
              index <= 0 ? choices.length - 1 : index - 1);
          }
          if (event.key === 'Enter' && query.trim()) {
            event.preventDefault();
            if (visible && choices[active]) select(choices[active]);
          }
        }}
      />
    </Field>
    {visible && choices.length > 0 ? <ul id={id + '-suggestions'} role="listbox"
      aria-label={pickupZone ? 'Pickup zone suggestions' : 'Service area suggestions'} className="max-h-56 overflow-y-auto rounded-xl border border-studio-border bg-white shadow-lg">
      {choices.map((place, index) => <li key={place.id} id={id + '-option-' + index} role="option"
        aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => select(place)}
        className={`cursor-pointer px-3 py-2 text-sm hover:bg-studio-tint ${index === active ? 'bg-studio-tint' : ''}`}>
        <span className="block font-semibold">{place.label}</span>
        {place.address && place.address !== place.label ? <span className="block text-xs text-studio-muted">{place.address}</span> : null}
      </li>)}
    </ul> : null}
    {!isDemoDataMode && (visible && choices.length > 0 || places.length > 0) ? (
      <p translate="no" className="whitespace-nowrap text-right text-xs text-studio-muted">Google Maps</p>
    ) : null}
    {notice || visible && (loading || !choices.length) ? <p role="status" className="text-xs text-studio-muted">
      {notice || (loading ? 'Searching places…' : 'No matching areas. Try another locality or city.')}
    </p> : null}
    {places.length ? <ul aria-label={pickupZone ? 'Selected pickup zone centre' : 'Selected service areas'} className="flex flex-wrap gap-2">
      {places.map(place => <li key={place.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-studio-tint px-3 py-1 text-xs font-semibold text-studio-ink">
        <span className="break-words" title={place.address}>{place.label}</span>
        <button type="button" aria-label={'Remove ' + (place.address || place.label)} onClick={() => { onChange(places.filter(item => item.id !== place.id)); setNotice(''); input.current?.focus(); }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-studio-border">
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </li>)}
    </ul> : null}
  </div>;
}
