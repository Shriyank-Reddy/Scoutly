import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import {
  applyFilters,
  DEFAULT_FILTERS,
  filtersToParams,
  paramsToFilters,
  type Filters,
} from '../lib/filters';
import { FilterPanel } from '../components/FilterPanel';
import { MapView, type Pin } from '../components/MapView';
import { COUNTRY_NAMES } from '../shared/locations';
import { ResultsList, useResultKeys } from '../components/ResultsList';
import { BottomSheet, Drawer } from '../components/Drawer';
import { ListingDetail } from '../components/ListingDetail';
import { btn, EmptyState, input, ListSkeleton } from '../components/ui';

export default function SearchPage() {
  const { listings, loading, error, profile, hasProfile, scores } = useApp();
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => paramsToFilters(params), [params]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);

  const set = useCallback(
    (patch: Partial<Filters>) => setParams(filtersToParams({ ...f, ...patch }), { replace: true }),
    [f, setParams],
  );

  const items = useMemo(() => {
    const out = applyFilters(listings, f, profile);
    if (f.sort === 'recent' || !hasProfile)
      return [...out].sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''));
    return [...out].sort((a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0));
  }, [listings, f, profile, hasProfile, scores]);

  const countryOptions = useMemo(() => {
    const n = new Map<string, number>();
    for (const l of listings)
      for (const cc of new Set(l.locations.map((p) => p.country)))
        if (cc && COUNTRY_NAMES[cc]) n.set(cc, (n.get(cc) ?? 0) + 1);
    return [...n.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cc]) => cc);
  }, [listings]);
  const pins = useMemo<Pin[]>(() => {
    if (f.view !== 'map') return [];
    const out: Pin[] = [];
    for (const l of items)
      for (const p of l.locations)
        if (p.latitude != null && p.longitude != null && out.length < 2000)
          out.push({
            id: l.id,
            lat: p.latitude,
            lon: p.longitude,
            title: l.title,
            company: l.company,
            mode: l.workMode,
          });
    return out;
  }, [items, f.view]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setDrawer(true);
  }, []);
  useResultKeys(items, selectedId, select);
  const selected =
    items.find((l) => l.id === selectedId) ?? listings.find((l) => l.id === selectedId);
  const flaggedCount = items.filter((l) =>
    l.authFlags.some((a) => ['no-sponsorship', 'citizenship', 'clearance'].includes(a.id)),
  ).length;
  const hasAvail = !!(profile.availableFrom && profile.availableTo);
  const panel = (
    <FilterPanel
      f={f}
      set={set}
      hasAvailability={hasAvail}
      count={items.length}
      countryOptions={countryOptions}
    />
  );

  return (
    <div className="mx-auto flex h-full max-w-[1400px]">
      <aside
        className="hidden w-72 shrink-0 overflow-y-auto border-r border-line p-4 lg:block"
        aria-label="Filters"
      >
        {panel}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Results">
        <div className="sticky top-0 z-10 space-y-2 border-b border-line bg-bg px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex h-6 items-center text-base font-semibold">
              {loading ? (
                <span className="skeleton block h-4 w-32" aria-label="Loading" />
              ) : (
                <>
                  <span className="font-mono">{items.length}</span>
                  &nbsp;internship{items.length === 1 ? '' : 's'}
                </>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex" role="group" aria-label="Results view">
                {(['list', 'map'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={f.view === v}
                    onClick={() => set({ view: v })}
                    className={`min-h-11 border px-3 text-sm first:rounded-l last:rounded-r md:min-h-9 ${f.view === v ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:text-ink'}`}
                  >
                    {v === 'list' ? 'List' : 'Map'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${btn.ghost} lg:hidden`}
                onClick={() => setSheet(true)}
              >
                Filters
              </button>
            </div>
          </div>
          <div className="lg:hidden">
            <label htmlFor="search-input-m" className="sr-only">
              Search internships
            </label>
            <input
              id="search-input-m"
              type="search"
              className={input}
              placeholder="Search title, company, skill"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </div>
          {!hasProfile && !loading && (
            <p className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-xs">
              Upload your resume to see match scores.{' '}
              <Link to="/" className="font-medium text-accent-soft underline">
                Add my resume
              </Link>
            </p>
          )}
          {profile.needsSponsorship && flaggedCount > 0 && !f.hideFlagged && (
            <p className="flex flex-wrap items-center gap-2 rounded border border-flag/40 px-3 py-2 text-xs">
              {flaggedCount} shown mention no sponsorship, citizenship or clearance (text match
              only).
              <button
                type="button"
                className="text-accent-soft underline"
                onClick={() => set({ hideFlagged: true })}
              >
                Hide them
              </button>
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1">
          {loading ? (
            <ListSkeleton />
          ) : error ? (
            <EmptyState title="No data yet">{error}</EmptyState>
          ) : items.length === 0 ? (
            <EmptyState
              title="No internships match these filters"
              action={
                <button
                  type="button"
                  className={btn.primary}
                  onClick={() => set({ ...DEFAULT_FILTERS })}
                >
                  Clear filters
                </button>
              }
            >
              Try removing a filter or widening the radius. Listings with dates not stated are never
              hidden by the availability filter.
            </EmptyState>
          ) : f.view === 'map' ? (
            <div className="h-full p-3">
              <MapView
                pins={pins}
                center={null}
                radiusKm={0}
                selectedId={selectedId}
                onSelect={select}
              />
            </div>
          ) : (
            <ResultsList
              items={items}
              scores={scores}
              selectedId={selectedId}
              onSelect={select}
              showScore={hasProfile}
            />
          )}
        </div>
      </section>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} label="Filters">
        {panel}
      </BottomSheet>
      <Drawer
        open={drawer && !!selected}
        onClose={() => setDrawer(false)}
        label="Internship details"
      >
        {selected && (
          <ListingDetail l={selected} match={scores.get(selected.id)} showScore={hasProfile} />
        )}
      </Drawer>
    </div>
  );
}
