import type { CompanySeed, Listing, Meta, RawJob } from '../src/shared/types';
import { isInternship } from '../src/shared/internship';
import { normalise, dedupe } from '../src/shared/normalise';
import { parseGreenhouse } from './adapters/greenhouse';
import { parseLever } from './adapters/lever';
import { parseAshby } from './adapters/ashby';

export const PARSERS = { greenhouse: parseGreenhouse, lever: parseLever, ashby: parseAshby } as const;

/** Keep internship-like roles, normalise, dedupe. Pure function: easy to test. */
export function buildListings(raw: RawJob[]): Listing[] {
  return dedupe(raw.filter((r) => isInternship(r.title, r.text)).map(normalise)).sort(
    (a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''),
  );
}

export function buildMeta(listings: Listing[], boardsOk: number, failures: Meta['boardsFailed'], isSample: boolean, now = new Date()): Meta {
  const perSource: Record<string, number> = {};
  const perCountry: Record<string, number> = {};
  for (const l of listings) {
    perSource[l.source] = (perSource[l.source] ?? 0) + 1;
    for (const c of new Set(l.locations.map((p) => p.country ?? 'unknown'))) perCountry[c] = (perCountry[c] ?? 0) + 1;
  }
  return { fetchedAt: now.toISOString(), isSample, totalListings: listings.length, perSource, perCountry, boardsOk, boardsFailed: failures };
}

export function parseBoard(seed: CompanySeed, json: unknown): RawJob[] {
  return PARSERS[seed.source](json, seed);
}
