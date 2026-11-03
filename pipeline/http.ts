import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';

export const USER_AGENT = 'Scoutly/0.1 (+https://github.com/shriyank-reddy/scoutly; student portfolio project, polite fetcher)';
const CACHE_DIR = 'data/cache';
const MIN_GAP_MS = 400; // rate limit: at most ~2.5 requests per second overall
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
async function rateLimit() {
  const wait = lastRequest + MIN_GAP_MS - Date.now();
  lastRequest = Math.max(Date.now(), lastRequest + MIN_GAP_MS);
  if (wait > 0) await sleep(wait);
}

/** Pure helper (tested): delay before retry number `attempt` (0-based): 1s, 2s, 4s... capped. */
export const backoffMs = (attempt: number) => Math.min(30_000, 1000 * 2 ** attempt);

interface Opts { retries?: number; cacheTtlMs?: number; fetchImpl?: typeof fetch; sleepImpl?: (ms: number) => Promise<void> }

/** GET JSON politely: cache on disk, rate-limit, retry 429/5xx/network errors with backoff. */
export async function getJson(url: string, opts: Opts = {}): Promise<unknown> {
  const { retries = 3, cacheTtlMs = 6 * 3600_000, fetchImpl = fetch, sleepImpl = sleep } = opts;
  const file = `${CACHE_DIR}/${createHash('sha1').update(url).digest('hex')}.json`;
  try {
    const s = await stat(file);
    if (Date.now() - s.mtimeMs < cacheTtlMs) return JSON.parse(await readFile(file, 'utf8'));
  } catch { /* cache miss */ }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await rateLimit();
      const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) throw new HttpError(404, 'board not found (404)', false);
      if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`, res.status === 429 || res.status >= 500);
      const json = await res.json();
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(json));
      return json;
    } catch (e) {
      lastErr = e;
      if (e instanceof HttpError && !e.retryable) break;
      if (attempt < retries) await sleepImpl(backoffMs(attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public retryable: boolean) { super(message); }
}
