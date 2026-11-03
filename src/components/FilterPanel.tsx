import { useId } from 'react';
import type { WorkMode } from '../shared/types';
import { DEFAULT_FILTERS, type Filters } from '../lib/filters';
import { cityLabel, findCityByKey } from '../shared/locations';
import { btn, input } from './ui';
import { CityPicker } from './CityPicker';

const MODES: { id: WorkMode; label: string }[] = [
  { id: 'onsite', label: 'In person' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'remote', label: 'Remote' },
];

function Check({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#2a62f5]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function FilterPanel({
  f,
  set,
  hasAvailability,
  count,
}: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  hasAvailability: boolean;
  count: number;
}) {
  const id = useId();
  const city = f.city ? findCityByKey(f.city) : null;
  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
      <div>
        <label htmlFor="search-input" className="mb-1 block text-xs font-medium text-muted">
          Search <kbd className="rounded border border-line px-1 font-mono text-[10px]">/</kbd>
        </label>
        <input
          id="search-input"
          type="search"
          className={input}
          placeholder="Title, company, skill…"
          value={f.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-muted">Work mode</legend>
        {MODES.map((m) => (
          <Check
            key={m.id}
            checked={f.modes.includes(m.id)}
            onChange={(v) =>
              set({ modes: v ? [...f.modes, m.id] : f.modes.filter((x) => x !== m.id) })
            }
          >
            {m.label}
          </Check>
        ))}
      </fieldset>

      <div className="space-y-2">
        <CityPicker label="Near city" onPick={(key) => set({ city: key })} />
        {city && (
          <div className="rounded-lg border border-line p-2 text-sm">
            <div className="flex items-center justify-between">
              <span>{cityLabel(city)}</span>
              <button
                type="button"
                className="text-xs text-accent-soft"
                onClick={() => set({ city: '' })}
              >
                Clear
              </button>
            </div>
            <label htmlFor={`${id}-r`} className="mt-2 block text-xs text-muted">
              Within <span className="font-mono">{f.radius} km</span>
            </label>
            <input
              id={`${id}-r`}
              type="range"
              min={10}
              max={500}
              step={10}
              value={f.radius}
              onChange={(e) => set({ radius: +e.target.value })}
              className="w-full accent-[#2a62f5]"
            />
          </div>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-muted">Availability</legend>
        <Check checked={f.avail} disabled={!hasAvailability} onChange={(v) => set({ avail: v })}>
          Fits my availability window
        </Check>
        <p className="text-xs text-muted">
          {hasAvailability
            ? 'Listings with dates not stated stay visible.'
            : 'Set your availability on the Profile page to use this.'}
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-muted">More</legend>
        <Check checked={f.paidOnly} onChange={(v) => set({ paidOnly: v })}>
          Pay stated in posting
        </Check>
        <Check checked={f.hideFlagged} onChange={(v) => set({ hideFlagged: v })}>
          Hide postings mentioning no sponsorship, citizenship or clearance
        </Check>
        <div>
          <label htmlFor={`${id}-t`} className="mb-1 block text-xs text-muted">
            Type
          </label>
          <select
            id={`${id}-t`}
            className={input}
            value={f.engagement}
            onChange={(e) => set({ engagement: e.target.value as Filters['engagement'] })}
          >
            <option value="">Any</option>
            <option value="co-op">Co-op</option>
            <option value="part-time">Part-time</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-s`} className="mb-1 block text-xs text-muted">
            Sort by
          </label>
          <select
            id={`${id}-s`}
            className={input}
            value={f.sort}
            onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}
          >
            <option value="match">Best match</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted" aria-live="polite">
          {count} shown
        </span>
        <button type="button" className={btn.ghost} onClick={() => set({ ...DEFAULT_FILTERS })}>
          Reset
        </button>
      </div>
    </form>
  );
}
