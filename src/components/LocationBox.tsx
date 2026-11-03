import { useId, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import {
  cityKey,
  cityLabel,
  COUNTRY_NAMES,
  findCityByKey,
  searchCities,
} from '../shared/locations';
import { input } from './ui';

type Option = { id: string; label: string; kind: 'city' | 'country'; value: string };

export interface LocationValue {
  cities: string[];
  countries: string[];
  remote: boolean;
}

/** One box: type a city or country, pick from the offline list; chips below for Remote / Anywhere / popular countries. */
export function LocationBox({
  value,
  radius,
  countryOptions,
  onChange,
  onRadius,
}: {
  value: LocationValue;
  radius: number;
  countryOptions: string[];
  onChange: (v: LocationValue) => void;
  onRadius: (r: number) => void;
}) {
  const id = useId();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const options: Option[] =
    q.trim().length < 2
      ? []
      : [
          ...Object.entries(COUNTRY_NAMES)
            .filter(
              ([cc, n]) =>
                !value.countries.includes(cc) && n.toLowerCase().startsWith(q.trim().toLowerCase()),
            )
            .slice(0, 2)
            .map(([cc, n]) => ({ id: `c-${cc}`, label: n, kind: 'country' as const, value: cc })),
          ...searchCities(q, 6)
            .filter((c) => !value.cities.includes(cityKey(c)))
            .map((c) => ({
              id: `t-${cityKey(c)}`,
              label: cityLabel(c),
              kind: 'city' as const,
              value: cityKey(c),
            })),
        ];
  const pick = (o: Option) => {
    onChange(
      o.kind === 'city'
        ? { ...value, cities: [...value.cities, o.value] }
        : { ...value, countries: [...value.countries, o.value] },
    );
    setQ('');
    setActive(0);
    setOpen(false);
  };
  const anywhere = !value.cities.length && !value.countries.length && !value.remote;
  const toggleCountry = (cc: string) =>
    onChange({
      ...value,
      countries: value.countries.includes(cc)
        ? value.countries.filter((x) => x !== cc)
        : [...value.countries, cc],
    });
  const chip = (on: boolean) =>
    `inline-flex h-8 items-center gap-1 rounded border px-2 text-xs ${on ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:border-muted hover:text-ink'}`;

  return (
    <div className="space-y-2">
      <div className="relative">
        <label htmlFor={`${id}-in`} className="mb-1 block text-xs text-muted">
          Location
        </label>
        <div className="relative">
          <MapPin
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={`${id}-in`}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined}
            className={`${input} pl-9`}
            placeholder="City or country, e.g. Tempe, India"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(options.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && options[active]) {
                e.preventDefault();
                pick(options[active]);
              } else if (e.key === 'Escape') setOpen(false);
            }}
          />
        </div>
        {open && options.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface-2 p-1"
          >
            {options.map((o, i) => (
              <li
                key={o.id}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-10 cursor-pointer items-center justify-between rounded px-3 text-sm ${i === active ? 'bg-accent/20' : ''}`}
              >
                <span>{o.label}</span>
                <span className="font-mono text-xs text-muted">{o.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick location filters">
        <button
          type="button"
          className={chip(anywhere)}
          aria-pressed={anywhere}
          onClick={() => onChange({ cities: [], countries: [], remote: false })}
        >
          Anywhere
        </button>
        <button
          type="button"
          className={chip(value.remote)}
          aria-pressed={value.remote}
          onClick={() => onChange({ ...value, remote: !value.remote })}
        >
          Remote
        </button>
        {[...new Set([...value.countries, ...countryOptions])].map((cc) => (
          <button
            key={cc}
            type="button"
            className={chip(value.countries.includes(cc))}
            aria-pressed={value.countries.includes(cc)}
            onClick={() => toggleCountry(cc)}
          >
            {COUNTRY_NAMES[cc] ?? cc}
          </button>
        ))}
      </div>

      {value.cities.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {value.cities.map((k) => {
              const c = findCityByKey(k);
              return (
                <li key={k}>
                  <button
                    type="button"
                    aria-label={`Remove ${c?.name ?? k}`}
                    onClick={() =>
                      onChange({ ...value, cities: value.cities.filter((x) => x !== k) })
                    }
                    className="inline-flex h-8 items-center gap-1 rounded border border-accent bg-accent/15 px-2 font-mono text-xs"
                  >
                    {c ? cityLabel(c) : k}
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div>
            <label htmlFor={`${id}-r`} className="block text-xs text-muted">
              Within <span className="font-mono">{radius} km</span> of each city
            </label>
            <input
              id={`${id}-r`}
              type="range"
              min={10}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => onRadius(+e.target.value)}
              className="h-6 w-full accent-[#2a62f5]"
            />
          </div>
        </>
      )}
    </div>
  );
}
