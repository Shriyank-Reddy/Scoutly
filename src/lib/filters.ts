import type { Engagement, Listing, Profile, WorkMode } from '../shared/types';
import { findCityByKey, minDistanceKm } from '../shared/locations';
import { dateFit } from '../shared/dates';

export interface Filters {
  q: string;
  modes: WorkMode[];
  city: string; // city key or ''
  radius: number; // km
  avail: boolean; // only listings that fit my availability (unknown dates are kept)
  paidOnly: boolean;
  engagement: Engagement | '';
  hideFlagged: boolean; // hide postings whose text mentions no-sponsorship / citizenship / clearance
  sort: 'match' | 'recent';
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  modes: [],
  city: '',
  radius: 50,
  avail: false,
  paidOnly: false,
  engagement: '',
  hideFlagged: false,
  sort: 'match',
};

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.modes.length) p.set('mode', f.modes.join(','));
  if (f.city) p.set('city', f.city);
  if (f.city && f.radius !== DEFAULT_FILTERS.radius) p.set('r', String(f.radius));
  if (f.avail) p.set('avail', '1');
  if (f.paidOnly) p.set('paid', '1');
  if (f.engagement) p.set('type', f.engagement);
  if (f.hideFlagged) p.set('hideflags', '1');
  if (f.sort !== 'match') p.set('sort', f.sort);
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
    city: p.get('city') ?? '',
    radius: r >= 5 && r <= 500 ? r : DEFAULT_FILTERS.radius,
    avail: p.get('avail') === '1',
    paidOnly: p.get('paid') === '1',
    engagement: type === 'co-op' || type === 'part-time' ? type : '',
    hideFlagged: p.get('hideflags') === '1',
    sort: p.get('sort') === 'recent' ? 'recent' : 'match',
  };
}

const haystack = (l: Listing) =>
  `${l.title} ${l.company} ${l.snippet} ${l.skills.join(' ')} ${l.locations.map((p) => `${p.city ?? ''} ${p.region ?? ''} ${p.country ?? ''}`).join(' ')}`.toLowerCase();

/** City membership: any geocoded place within radius, or (when `includeRemote`) remote postings. */
export function inCity(
  l: Listing,
  cityKey: string,
  radius: number,
  includeRemote = false,
): boolean {
  const c = findCityByKey(cityKey);
  if (!c) return true;
  const d = minDistanceKm(l.locations, c.lat, c.lon);
  if (d !== null && d <= radius) return true;
  return includeRemote && l.workMode === 'remote';
}

export function applyFilters(
  listings: Listing[],
  f: Filters,
  profile: Pick<Profile, 'availableFrom' | 'availableTo'>,
): Listing[] {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return listings.filter((l) => {
    if (terms.length && !terms.every((t) => haystack(l).includes(t))) return false;
    if (f.modes.length && l.workMode !== 'unknown' && !f.modes.includes(l.workMode)) return false;
    if (f.modes.length && l.workMode === 'unknown') return false;
    if (f.city && !inCity(l, f.city, f.radius, f.modes.includes('remote'))) return false;
    if (f.avail && profile.availableFrom && profile.availableTo) {
      const fit = dateFit(l, profile.availableFrom, profile.availableTo);
      if (fit === 0) return false; // known window that does not overlap; unknown (null) stays visible
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
