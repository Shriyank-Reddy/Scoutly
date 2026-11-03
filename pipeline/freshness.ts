import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { AGGREGATORS, type Listing } from '../src/shared/types';
import { USER_AGENT } from './http';

export const MAX_AGE_DAYS = 270; // about 9 months
const DAY = 864e5;
const STATE_FILE = 'data/cache/state.json';
const LINK_CACHE = 'data/cache/linkcheck.json';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drop postings whose stated posted date is older than ~9 months. Unknown dates are kept (never guessed). */
export function dropStale(listings: Listing[], now = Date.now(), maxAgeDays = MAX_AGE_DAYS) {
  const kept = listings.filter(
    (l) => !l.postedAt || now - Date.parse(l.postedAt) <= maxAgeDays * DAY,
  );
  return { kept, dropped: listings.length - kept.length };
}

export interface State {
  trackingSince: string;
  firstSeen: Record<string, string>;
}

/** Remember when each listing id was first seen. State is persisted between runs by the workflow's cache. */
export function applyFirstSeen(
  listings: Listing[],
  prev: State | null,
  now = new Date(),
): { listings: Listing[]; state: State } {
  const iso = now.toISOString();
  const state: State = { trackingSince: prev?.trackingSince ?? iso, firstSeen: {} };
  const out = listings.map((l) => {
    const seen = prev?.firstSeen[l.id] ?? iso;
    state.firstSeen[l.id] = seen; // ids that disappeared are not carried over, so the file stays small
    return { ...l, firstSeen: seen };
  });
  return { listings: out, state };
}
export async function loadState(): Promise<State | null> {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}
export async function saveState(s: State) {
  await mkdir('data/cache', { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(s));
}

type Cache = Record<string, { t: number; status: number }>;
interface LinkOpts {
  fetchImpl?: typeof fetch;
  maxChecks?: number;
  gapMs?: number;
  ttlMs?: number;
  now?: number;
  cache?: Cache;
}

/**
 * Rate-limited HEAD check of apply URLs. Only a definite 404/410 removes a listing: timeouts, 403 (bot walls), 405 and 5xx
 * are "unknown" and keep it. Adzuna links are tracking redirects, so they are not probed. Results are cached for a day.
 */
export async function dropDeadLinks(
  listings: Listing[],
  opts: LinkOpts = {},
): Promise<{ kept: Listing[]; dropped: number; checked: number; cache: Cache }> {
  const { fetchImpl = fetch, maxChecks = 1500, gapMs = 400, ttlMs = DAY, now = Date.now() } = opts;
  const cache: Cache = opts.cache ?? {};
  let checks = 0;
  const dead = new Set<string>();
  for (const l of listings) {
    if (l.source === 'adzuna') continue;
    const hit = cache[l.url];
    if (hit && now - hit.t < ttlMs) {
      if (hit.status === 404 || hit.status === 410) dead.add(l.id);
      continue;
    }
    if (checks >= maxChecks) continue;
    checks++;
    let status: number;
    try {
      const res = await fetchImpl(l.url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
      status = res.status;
    } catch {
      status = 0;
    }
    cache[l.url] = { t: now, status };
    if (status === 404 || status === 410) dead.add(l.id);
    await sleep(opts.fetchImpl ? 0 : gapMs);
  }
  return {
    kept: listings.filter((l) => !dead.has(l.id)),
    dropped: dead.size,
    checked: checks,
    cache,
  };
}
export async function loadLinkCache(): Promise<Cache> {
  try {
    return JSON.parse(await readFile(LINK_CACHE, 'utf8'));
  } catch {
    return {};
  }
}
export async function saveLinkCache(c: Cache) {
  await mkdir('data/cache', { recursive: true });
  await writeFile(LINK_CACHE, JSON.stringify(c));
}
export const isAggregator = (l: Listing) => AGGREGATORS.includes(l.source);
