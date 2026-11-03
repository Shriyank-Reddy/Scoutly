import type { Engagement, Listing, Profile, WorkMode } from '../shared/types';
import { findCityByKey, minDistanceKm } from '../shared/locations';
import { dateFit } from '../shared/dates';

export interface Filters {
  q: string;
  modes: WorkMode[];
  cities: string[]; // city keys ("Tempe|US|AZ"), any of them
  countries: string[]; // ISO codes, any of them
  remote: boolean; // location chip: include remote postings
  radius: number; // km around each selected city
  avail: boolean; // only listings that fit my availability (unknown dates are kept)
  paidOnly: boolean;
  engagement: Engagement | '';
  hideFlagged: boolean; // hide postings whose text mentions no-sponsorship / citizenship / clearance
  sort: 'match' | 'recent';
  view: 'list' | 'map';
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  modes: [],
  cities: [],
  countries: [],
  remote: false,
  radius: 50,
  avail: false,
  paidOnly: false,
  engagement: '',
  hideFlagged: false,
  sort: 'match',
  view: 'list',
};

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.modes.length) p.set('mode', f.modes.join(','));
  if (f.cities.length) p.set('city', f.cities.join(';'));
  if (f.countries.length) p.set('country', f.countries.join(','));
  if (f.remote) p.set('remote', '1');
  if (f.cities.length && f.radius !== DEFAULT_FILTERS.radius) p.set('r', String(f.radius));
  if (f.avail) p.set('avail', '1');
  if (f.paidOnly) p.set('paid', '1');
  if (f.engagement) p.set('type', f.engagement);
  if (f.hideFlagged) p.set('hideflags', '1');
  if (f.sort !== 'match') p.set('sort', f.sort);
  if (f.view === 'map') p.set('view', 'map');
  return p;
}

export function paramsToFilters(p: URLSearchParams): Filters {
  const modes = (p.get('mode') ?? '')
    .split(',')
    .filter((m): m is WorkMode => ['remote', 'hybrid', 'onsite'].includes(m));
  const r = Number(p.get('r'));
  const type = p.get('type');
  return {
    q: p.get('q') ?? '',
    modes,
    cities: (p.get('city') ?? '').split(';').filter((k) => k.split('|').length === 3),
    countries: (p.get('country') ?? '').split(',').filter((c) => /^[A-Z]{2}$/.test(c)),
    remote: p.get('remote') === '1',
    radius: r >= 5 && r <= 500 ? r : DEFAULT_FILTERS.radius,
    avail: p.get('avail') === '1',
    paidOnly: p.get('paid') === '1',
    engagement: type === 'co-op' || type === 'part-time' ? type : '',
    hideFlagged: p.get('hideflags') === '1',
    sort: p.get('sort') === 'recent' ? 'recent' : 'match',
    view: p.get('view') === 'map' ? 'map' : 'list',
  };
}

const haystack = (l: Listing) =>
  `${l.title} ${l.company} ${l.snippet} ${l.skills.join(' ')} ${l.locations.map((p) => `${p.city ?? ''} ${p.region ?? ''} ${p.country ?? ''}`).join(' ')}`.toLowerCase();

/** Within `radius` km of the city (any geocoded place of the listing). */
export function inCity(l: Listing, cityKey: string, radius: number): boolean {
  const c = findCityByKey(cityKey);
  if (!c) return false;
  const d = minDistanceKm(l.locations, c.lat, c.lon);
  return d !== null && d <= radius;
}

/** Location filter: any selected city (radius), any selected country, or remote when the Remote chip is on. Nothing selected = anywhere. */
export function matchesLocation(
  l: Listing,
  f: Pick<Filters, 'cities' | 'countries' | 'remote' | 'radius'>,
): boolean {
  if (!f.cities.length && !f.countries.length && !f.remote) return true;
  if (f.cities.some((c) => inCity(l, c, f.radius))) return true;
  if (f.countries.length && l.locations.some((p) => p.country && f.countries.includes(p.country)))
    return true;
  return f.remote && l.workMode === 'remote';
}

export function applyFilters(
  listings: Listing[],
  f: Filters,
  profile: Pick<Profile, 'availableFrom' | 'availableTo'>,
): Listing[] {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return listings.filter((l) => {
    if (terms.length && !terms.every((t) => haystack(l).includes(t))) return false;
    if (f.modes.length && !f.modes.includes(l.workMode as WorkMode)) return false;
    if (!matchesLocation(l, f)) return false;
    if (f.avail && profile.availableFrom && profile.availableTo) {
      if (dateFit(l, profile.availableFrom, profile.availableTo) === 0) return false; // unknown dates (null) stay visible
    }
    if (f.paidOnly && l.paid !== 'paid') return false;
    if (f.engagement && !l.engagement.includes(f.engagement)) return false;
    if (
      f.hideFlagged &&
      l.authFlags.some((a) => ['no-sponsorship', 'citizenship', 'clearance'].includes(a.id))
    )
      return false;
    return true;
  });
}
