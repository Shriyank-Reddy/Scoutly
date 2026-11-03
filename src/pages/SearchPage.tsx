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
import { ResultsList, useResultKeys } from '../components/ResultsList';
import { BottomSheet, Drawer } from '../components/Drawer';
import { ListingDetail } from '../components/ListingDetail';
import { btn, EmptyState, ListSkeleton } from '../components/ui';

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
  const panel = <FilterPanel f={f} set={set} hasAvailability={hasAvail} count={items.length} />;

  return (
    <div className="mx-auto flex h-full max-w-[1400px]">
      <aside
        className="hidden w-72 shrink-0 overflow-y-auto border-r border-line p-4 lg:block"
        aria-label="Filters"
      >
        {panel}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Results">
        <div className="space-y-2 border-b border-line px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">
              {loading ? 'Loading…' : `${items.length} internship${items.length === 1 ? '' : 's'}`}
            </h1>
            <button
              type="button"
              className={`${btn.ghost} lg:hidden`}
              onClick={() => setSheet(true)}
            >
              Filters
            </button>
          </div>
          {!hasProfile && !loading && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-accent-soft/30 bg-accent/10 px-3 py-2 text-sm">
              Upload your resume to see match scores.{' '}
              <Link to="/profile" className="font-medium text-accent-soft underline">
                Build my profile
              </Link>
            </p>
          )}
          {profile.needsSponsorship && flaggedCount > 0 && !f.hideFlagged && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-flag/40 bg-flag/5 px-3 py-2 text-sm">
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
