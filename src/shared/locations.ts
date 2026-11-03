import rows from '../data/cities.json';
import type { Place } from './types';
import { norm } from './text';

type Row = [string, string, string, number, number, number]; // name, country, admin, lat, lon, population
export interface City { name: string; country: string; admin: string; lat: number; lon: number; pop: number }

const CITIES: City[] = (rows as Row[]).map(([name, country, admin, lat, lon, pop]) => ({ name, country, admin, lat, lon, pop }));
const BY_NAME = new Map<string, City[]>();
for (const c of CITIES) {
  const k = norm(c.name);
  (BY_NAME.get(k) ?? BY_NAME.set(k, []).get(k)!).push(c); // already sorted by population desc
}

const ALIASES: Record<string, string> = {
  bangalore: 'bengaluru', nyc: 'new york city', 'new york': 'new york city', manhattan: 'new york city', brooklyn: 'new york city',
  sf: 'san francisco', 'bay area': 'san francisco', 'south san francisco': 'south san francisco', bombay: 'mumbai', gurugram: 'gurgaon',
  'washington dc': 'washington, d.c.', 'washington d.c.': 'washington, d.c.', dc: 'washington, d.c.', 'sao paulo': 'sao paulo',
  'la': 'los angeles', 'ho chi minh city': 'ho chi minh city', 'tel-aviv': 'tel aviv', 'new delhi': 'new delhi', 'münchen': 'munich',
  'silicon valley': 'san jose', 'research triangle': 'raleigh',
};

const US_STATES: Record<string, string> = { alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',connecticut:'CT',delaware:'DE',florida:'FL',georgia:'GA',hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',michigan:'MI',minnesota:'MN',mississippi:'MS',missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',ohio:'OH',oklahoma:'OK',oregon:'OR',pennsylvania:'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',virginia:'VA',washington:'WA','west virginia':'WV',wisconsin:'WI',wyoming:'WY','district of columbia':'DC' };
const US_CODES = new Set(Object.values(US_STATES));
const CA_PROV: Record<string, string> = { ON:'08', BC:'02', QC:'10', AB:'01', MB:'03', NS:'07', NB:'04', SK:'11' };

export const COUNTRIES: Record<string, string> = {
  'united states':'US','united states of america':'US',usa:'US',us:'US',america:'US','u.s.':'US','u.s.a.':'US',
  'united kingdom':'GB',uk:'GB','great britain':'GB',england:'GB',scotland:'GB',wales:'GB','northern ireland':'GB',
  canada:'CA',india:'IN',germany:'DE',deutschland:'DE',france:'FR',ireland:'IE',netherlands:'NL','the netherlands':'NL',spain:'ES',italy:'IT',
  switzerland:'CH',sweden:'SE',norway:'NO',denmark:'DK',finland:'FI',poland:'PL',portugal:'PT',austria:'AT',belgium:'BE',czechia:'CZ','czech republic':'CZ',
  israel:'IL',singapore:'SG',japan:'JP','south korea':'KR',korea:'KR',china:'CN','hong kong':'HK',taiwan:'TW',australia:'AU','new zealand':'NZ',
  brazil:'BR',brasil:'BR',mexico:'MX',argentina:'AR',colombia:'CO',chile:'CL','united arab emirates':'AE',uae:'AE','saudi arabia':'SA',turkey:'TR',
  egypt:'EG',nigeria:'NG',kenya:'KE','south africa':'ZA',indonesia:'ID',philippines:'PH',vietnam:'VN',thailand:'TH',malaysia:'MY',pakistan:'PK',
  bangladesh:'BD','sri lanka':'LK',romania:'RO',ukraine:'UA',greece:'GR',hungary:'HU',bulgaria:'BG',estonia:'EE',lithuania:'LT',latvia:'LV',serbia:'RS',croatia:'HR',
};
export const COUNTRY_NAMES: Record<string, string> = {};
for (const [name, cc] of Object.entries(COUNTRIES)) if (!COUNTRY_NAMES[cc] && name.length > 3) COUNTRY_NAMES[cc] = name.replace(/\b\w/g, (c) => c.toUpperCase());
Object.assign(COUNTRY_NAMES, { US: 'United States', GB: 'United Kingdom', AE: 'UAE', KR: 'South Korea', CZ: 'Czechia', NL: 'Netherlands', BR: 'Brazil' });

const NOISE = /^(remote|hybrid|on-?site|in[- ]office|in[- ]person|multiple locations?|various|flexible|anywhere|global|worldwide|n\/a|tbd)$/i;

function lookup(cityRaw: string, cc: string | null, region: string | null): City | null {
  const k0 = norm(cityRaw.replace(/\b(greater|metropolitan area|metro area|area)\b/gi, '').replace(/\s+/g, ' '));
  const k = region === 'DC' && k0 === 'washington' ? 'washington, d.c.' : (ALIASES[k0] ?? k0);
  let cands = BY_NAME.get(norm(k)) ?? [];
  if (!cands.length && k.includes(',')) cands = BY_NAME.get(norm(k)) ?? [];
  if (cc) { const f = cands.filter((c) => c.country === cc); if (f.length) cands = f; else if (cands.length) return null; }
  if (region && (cc === 'US' || !cc) && US_CODES.has(region)) { const f = cands.filter((c) => c.country === 'US' && c.admin === region); if (f.length) cands = f; }
  if (region && cc === 'CA' && CA_PROV[region]) { const f = cands.filter((c) => c.admin === CA_PROV[region]); if (f.length) cands = f; }
  return cands[0] ?? null;
}

/** Parse ONE location string like "San Francisco, CA" or "Bengaluru, Karnataka, India" into places. */
export function parseLocation(raw: string): Place[] {
  const places: Place[] = [];
  const parts = raw.split(/;|\||\s\/\s|\s+or\s+|\sand\s(?=[A-Z])/).map((p) => p.trim()).filter(Boolean);
  for (let part of parts) {
    part = part.replace(/\(.*?\)/g, ' ').replace(/^(remote|hybrid|onsite|on-site|in[- ]office)\s*[-–:,]+\s*/i, '').replace(/\s*[-–]\s*(remote|hybrid|onsite|on-site)$/i, '').replace(/^based in\s+/i, '').trim();
    if (!part) continue;
    const toks = part.split(',').map((t) => t.trim()).filter(Boolean);
    if (!toks.length) continue;
    let cc: string | null = null; let region: string | null = null;
    // peel country from the end, then region
    const last = norm(toks[toks.length - 1]);
    if (COUNTRIES[last] && (toks.length > 1 || !BY_NAME.has(last) || last === 'us' || last === 'uk')) { cc = COUNTRIES[last]; toks.pop(); }
    if (toks.length > 1) {
      const r = toks[toks.length - 1]; const rn = norm(r);
      if (US_STATES[rn]) { region = US_STATES[rn]; cc = cc ?? 'US'; toks.pop(); }
      else if (/^[A-Z]{2}$/.test(r) && US_CODES.has(r) && (!cc || cc === 'US')) { region = r; cc = 'US'; toks.pop(); }
      else if (/^[A-Z]{2}$/.test(r) && CA_PROV[r] && (!cc || cc === 'CA')) { region = r; cc = 'CA'; toks.pop(); }
      else if (cc) { region = r; toks.pop(); }
    }
    const cityText = toks[0] ?? '';
    if (!cityText || NOISE.test(cityText)) {
      if (cc) places.push({ city: null, region, country: cc, latitude: null, longitude: null });
      continue;
    }
    const hit = lookup(cityText, cc, region);
    if (hit) places.push({ city: hit.name, region: cc === 'US' || hit.country === 'US' ? hit.admin : region, country: hit.country, latitude: hit.lat, longitude: hit.lon });
    else if (COUNTRIES[norm(cityText)] && !cc) places.push({ city: null, region: null, country: COUNTRIES[norm(cityText)], latitude: null, longitude: null });
    else places.push({ city: cityText, region, country: cc, latitude: null, longitude: null });
  }
  return places;
}

export function parseLocations(raws: string[]): Place[] {
  const seen = new Set<string>(); const out: Place[] = [];
  for (const r of raws) for (const p of parseLocation(r)) {
    const key = `${p.city}|${p.region}|${p.country}`;
    if (!seen.has(key)) { seen.add(key); out.push(p); }
  }
  return out;
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Typeahead for the city picker: prefix matches first, biggest cities first. */
export function searchCities(query: string, limit = 8): City[] {
  const q = norm(query.split(',')[0]);
  if (q.length < 2) return [];
  const out: City[] = [];
  for (const c of CITIES) { if (norm(c.name).startsWith(q)) { out.push(c); if (out.length >= limit * 3) break; } }
  return out.slice(0, limit);
}

export const cityKey = (c: Pick<City, 'name' | 'country' | 'admin'>) => `${c.name}|${c.country}|${c.admin}`;
export function cityLabel(c: Pick<City, 'name' | 'country' | 'admin'>) {
  return c.country === 'US' || c.country === 'CA' ? `${c.name}, ${c.admin}, ${c.country}` : `${c.name}, ${c.country}`;
}
export function findCityByKey(key: string): City | undefined {
  const [name, country, admin] = key.split('|');
  return CITIES.find((c) => c.name === name && c.country === country && c.admin === admin);
}

/** Minimum distance from a point to any geocoded place of a listing; null if none geocoded. */
export function minDistanceKm(places: Place[], lat: number, lon: number): number | null {
  let best: number | null = null;
  for (const p of places) if (p.latitude != null && p.longitude != null) {
    const d = haversineKm(lat, lon, p.latitude, p.longitude);
    if (best === null || d < best) best = d;
  }
  return best;
}
