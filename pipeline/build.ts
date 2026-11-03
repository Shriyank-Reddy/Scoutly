import {
  AGGREGATORS,
  type CompanySeed,
  type Listing,
  type Meta,
  type RawJob,
} from '../src/shared/types';
import { isInternship } from '../src/shared/internship';
import { normalise, dedupe } from '../src/shared/normalise';
import { parseGreenhouse } from './adapters/greenhouse';
import { parseLever } from './adapters/lever';
import { parseAshby } from './adapters/ashby';

export const PARSERS = {
  greenhouse: parseGreenhouse,
  lever: parseLever,
  ashby: parseAshby,
} as const;

/** Keep internship-like roles, normalise, dedupe. Pure function: easy to test. */
export function buildListings(raw: RawJob[]): Listing[] {
  return dedupeAcrossSources(
    dedupe(raw.filter((r) => isInternship(r.title, r.text)).map(normalise)),
  ).sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''));
}

export function buildMeta(
  listings: Listing[],
  boardsOk: number,
  failures: Meta['boardsFailed'],
  isSample: boolean,
  now = new Date(),
  aggregators?: Meta['aggregators'],
): Meta {
  const perSource: Record<string, number> = {};
  const perCountry: Record<string, number> = {};
  for (const l of listings) {
    perSource[l.source] = (perSource[l.source] ?? 0) + 1;
    for (const c of new Set(l.locations.map((p) => p.country ?? 'unknown')))
      perCountry[c] = (perCountry[c] ?? 0) + 1;
  }
  return {
    fetchedAt: now.toISOString(),
    isSample,
    totalListings: listings.length,
    perSource,
    perCountry,
    boardsOk,
    boardsFailed: failures,
    ...(aggregators ? { aggregators } : {}),
  };
}

export function parseBoard(seed: CompanySeed, json: unknown): RawJob[] {
  return PARSERS[seed.source](json, seed);
}

const normCompany = (c: string) =>
  c
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|gmbh|co|the|plc|pvt)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const normTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/\((m|f|w|d|x|\/)+\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Same company + title + city seen under several sources: keep one. A company's own ATS listing beats an aggregator copy;
 * among equals the first seen wins. A listing with no city is keyed "remote" so remote copies collapse too.
 */
export function dedupeAcrossSources(listings: Listing[]): Listing[] {
  const rank = (l: Listing) => (AGGREGATORS.includes(l.source) ? 1 : 0);
  const keysOf = (l: Listing) => {
    const base = `${normCompany(l.company)}|${normTitle(l.title)}|`;
    const cities = l.locations.map((p) => p.city?.toLowerCase()).filter((c): c is string => !!c);
    return (cities.length ? cities : ['remote']).map((c) => base + c);
  };
  const winner = new Map<string, Listing>();
  const dropped = new Set<Listing>();
  for (const l of [...listings].sort((a, b) => rank(a) - rank(b))) {
    const keys = keysOf(l);
    if (keys.some((k) => winner.has(k))) {
      dropped.add(l);
      continue;
    }
    for (const k of keys) winner.set(k, l);
  }
  return listings.filter((l) => !dropped.has(l));
}
