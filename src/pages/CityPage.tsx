import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { ExternalSearch } from '../components/ExternalSearch';
import { CityPicker } from '../components/CityPicker';
import { MapView, type Pin } from '../components/MapView';
import { ListingCard } from '../components/ListingCard';
import { Drawer } from '../components/Drawer';
import { ListingDetail } from '../components/ListingDetail';
import { btn, Chip, EmptyState, ListSkeleton } from '../components/ui';
import { COUNTRY_NAMES, cityLabel, findCityByKey, haversineKm } from '../shared/locations';

export default function CityPage() {
  const { listings, loading, profile, hasProfile, scores } = useApp();
  const [params, setParams] = useSearchParams();
  const key = params.get('city') ?? profile.locations[0] ?? '';
  const radius = Math.min(500, Math.max(5, Number(params.get('r')) || 25));
  const remote = params.get('remote') !== '0';
  const city = key ? findCityByKey(key) : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const upd = (p: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(p)) {
      if (v === null) n.delete(k);
      else n.set(k, v);
    }
    setParams(n, { replace: true });
  };

  const { rows, pins, remoteOnly, counts } = useMemo(() => {
    const rows: { l: (typeof listings)[number]; km: number | null }[] = [];
    const pins: Pin[] = [];
    let remoteOnly = 0;
    const counts = { onsite: 0, hybrid: 0, remote: 0, unknown: 0 };
    if (!city) return { rows, pins, remoteOnly, counts };
    for (const l of listings) {
      let best: number | null = null;
      for (const p of l.locations) {
        if (p.latitude == null || p.longitude == null) continue;
        const km = haversineKm(city.lat, city.lon, p.latitude, p.longitude);
        if (km <= radius) {
          if (best === null || km < best) best = km;
          if (l.workMode !== 'remote')
            pins.push({
              id: l.id,
              lat: p.latitude,
              lon: p.longitude,
              title: l.title,
              company: l.company,
              mode: l.workMode,
            });
        }
      }
      if (best !== null) {
        rows.push({ l, km: best });
        counts[l.workMode]++;
      } else if (remote && l.workMode === 'remote') {
        rows.push({ l, km: null });
        remoteOnly++;
        counts.remote++;
      }
    }
    rows.sort((a, b) =>
      hasProfile
        ? (scores.get(b.l.id)?.score ?? 0) - (scores.get(a.l.id)?.score ?? 0)
        : (a.km ?? 1e9) - (b.km ?? 1e9),
    );
    return { rows, pins, remoteOnly, counts };
  }, [listings, city, radius, remote, hasProfile, scores]);

  const select = (id: string) => {
    setSelectedId(id);
    setDrawer(true);
  };
  const selected = listings.find((l) => l.id === selectedId);

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col">
      <div className="space-y-3 border-b border-line p-3">
        <h1 className="text-xl font-semibold">City view</h1>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] sm:items-end">
          <CityPicker
            label={city ? `City: ${cityLabel(city)}` : 'Pick a city'}
            onPick={(k) => upd({ city: k })}
          />
          <div>
            <label htmlFor="radius" className="mb-1 block text-xs font-medium text-muted">
              Radius <span className="font-mono">{radius} km</span>
            </label>
            <input
              id="radius"
              type="range"
              min={5}
              max={300}
              step={5}
              value={radius}
              onChange={(e) => upd({ r: e.target.value })}
              className="w-full accent-[#2a62f5]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#2a62f5]"
              checked={remote}
              onChange={(e) => upd({ remote: e.target.checked ? null : '0' })}
            />
            Include remote
          </label>
        </div>
        {city && !loading && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted" aria-live="polite">
            <span>
              {rows.length} within {radius} km of {city.name}:
            </span>
            <Chip tone="strong">{counts.onsite} in person</Chip>
            <Chip tone="strong">{counts.hybrid} hybrid</Chip>
            <Chip tone="strong">
              {counts.remote} remote{remoteOnly ? ` (${remoteOnly} anywhere)` : ''}
            </Chip>
            {counts.unknown > 0 && <Chip>{counts.unknown} mode not stated</Chip>}
          </p>
        )}
        {city && (
          <ExternalSearch
            keywords={profile.targetRoles[0] ?? profile.keywords[0] ?? ''}
            location={`${city.name}, ${city.country === 'US' || city.country === 'CA' ? city.admin : (COUNTRY_NAMES[city.country] ?? '')}`.replace(
              /, $/,
              '',
            )}
            country={city.country}
          />
        )}
        <div className="flex gap-2 lg:hidden" role="tablist" aria-label="View">
          {(['list', 'map'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={tab === t ? btn.primary : btn.ghost}
            >
              {t === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>
      {!city ? (
        <EmptyState title="Pick a city to see internships there">
          Choose a city and a radius to check where you could interview or work in person. Remote
          roles are marked separately.
        </EmptyState>
      ) : loading ? (
        <ListSkeleton />
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <div
            className={`min-h-0 space-y-3 overflow-y-auto p-3 ${tab === 'map' ? 'hidden lg:block' : ''}`}
            role="list"
            aria-label="Internships in this city"
          >
            {rows.length === 0 && (
              <EmptyState title={`No internships within ${radius} km of ${city.name}`}>
                Try a larger radius, or include remote roles. Only listings from the supported
                public job boards are covered.
              </EmptyState>
            )}
            {rows.map(({ l, km }) => (
              <div key={l.id} role="listitem">
                <ListingCard
                  l={l}
                  match={scores.get(l.id)}
                  selected={l.id === selectedId}
                  onSelect={() => select(l.id)}
                  showScore={hasProfile}
                />
                <p className="px-1 pt-1 font-mono text-xs text-muted">
                  {km === null ? 'Remote: any location' : `${Math.round(km)} km from ${city.name}`}
                </p>
              </div>
            ))}
          </div>
          <div className={`min-h-[360px] p-3 ${tab === 'list' ? 'hidden lg:block' : ''}`}>
            <MapView
              pins={pins}
              center={[city.lat, city.lon]}
              radiusKm={radius}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
        </div>
      )}
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
