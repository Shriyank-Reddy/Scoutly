import { useId, useState } from 'react';
import { cityKey, cityLabel, searchCities, type City } from '../shared/locations';
import { input } from './ui';

/** Typeahead over the bundled offline city list (no geocoding API). */
export function CityPicker({
  label,
  onPick,
  placeholder = 'Type a city, e.g. Tempe',
}: {
  label: string;
  onPick: (key: string, c: City) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const id = useId();
  const results = searchCities(q);
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        className={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-controls={`${id}-list`}
      />
      {results.length > 0 && (
        <ul
          id={`${id}-list`}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-line bg-surface-2 p-1"
        >
          {results.map((c) => (
            <li key={cityKey(c)}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/20"
                onClick={() => {
                  onPick(cityKey(c), c);
                  setQ('');
                }}
              >
                {cityLabel(c)}{' '}
                <span className="font-mono text-xs text-muted">
                  {c.pop >= 1000 ? `${Math.round(c.pop / 1000)}k` : c.pop}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
