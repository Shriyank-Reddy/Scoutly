import { readFile } from 'node:fs/promises';
import type { Meta, RawJob } from '../src/shared/types';
import { getJson } from './http';
import {
  ADZUNA_COUNTRIES,
  adzunaUrl,
  arbeitnowUrl,
  parseAdzuna,
  parseArbeitnow,
  parseRemotive,
  remotiveUrl,
} from './adapters/aggregators';

type Status = NonNullable<Meta['aggregators']>[number];
export interface AggResult {
  raw: RawJob[];
  status: Status[];
}

const ADZUNA_PAGES = 2; // 9 countries x 2 pages = 18 requests/day, 2.5 s apart (free tier allows far more)

/** Adzuna needs ADZUNA_APP_ID and ADZUNA_APP_KEY. Missing keys = skipped and logged, never a failed run. */
export async function fetchAdzuna(
  env: Record<string, string | undefined>,
): Promise<{ raw: RawJob[]; status: Status }> {
  const id = env.ADZUNA_APP_ID,
    key = env.ADZUNA_APP_KEY;
  if (!id || !key)
    return {
      raw: [],
      status: {
        name: 'adzuna',
        status: 'skipped',
        detail: 'ADZUNA_APP_ID / ADZUNA_APP_KEY not set',
        raw: 0,
      },
    };
  const raw: RawJob[] = [];
  let failures = 0,
    firstErr = '';
  for (const c of ADZUNA_COUNTRIES)
    for (let page = 1; page <= ADZUNA_PAGES; page++) {
      try {
        raw.push(
          ...parseAdzuna(
            await getJson(adzunaUrl(c, page, id, key), { gapMs: 2500, retries: 2 }),
            c,
          ),
        );
      } catch (e) {
        failures++;
        firstErr ||= (e as Error).message;
        break;
      } // next country; message never contains the key
    }
  return {
    raw,
    status: {
      name: 'adzuna',
      status: raw.length ? 'ok' : 'failed',
      detail: failures
        ? `${failures} request(s) failed: ${firstErr}`
        : `${ADZUNA_COUNTRIES.length} countries`,
      raw: raw.length,
    },
  };
}

async function remotive(): Promise<{ raw: RawJob[]; status: Status }> {
  try {
    const raw = parseRemotive(
      await getJson(remotiveUrl(), { gapMs: 3000, cacheTtlMs: 20 * 3600_000 }),
    );
    return {
      raw,
      status: { name: 'remotive', status: 'ok', detail: '1 request', raw: raw.length },
    };
  } catch (e) {
    return {
      raw: [],
      status: { name: 'remotive', status: 'failed', detail: (e as Error).message, raw: 0 },
    };
  }
}

async function arbeitnow(): Promise<{ raw: RawJob[]; status: Status }> {
  const raw: RawJob[] = [];
  try {
    for (let p = 1; p <= 3; p++)
      raw.push(...parseArbeitnow(await getJson(arbeitnowUrl(p), { gapMs: 1500 })));
    return { raw, status: { name: 'arbeitnow', status: 'ok', detail: '3 pages', raw: raw.length } };
  } catch (e) {
    return {
      raw,
      status: {
        name: 'arbeitnow',
        status: raw.length ? 'ok' : 'failed',
        detail: (e as Error).message,
        raw: raw.length,
      },
    };
  }
}

export async function fetchAggregators(
  env: Record<string, string | undefined> = process.env,
): Promise<AggResult> {
  const parts = [await fetchAdzuna(env), await remotive(), await arbeitnow()];
  return { raw: parts.flatMap((p) => p.raw), status: parts.map((p) => p.status) };
}

/** Offline: recorded-shape fixtures for the same three adapters. */
export async function fixtureAggregators(): Promise<AggResult> {
  const read = async (n: string) => JSON.parse(await readFile(`tests/fixtures/${n}.json`, 'utf8'));
  const az = await read('adzuna'),
    rm = await read('remotive'),
    an = await read('arbeitnow');
  const raw = [
    ...Object.entries(az).flatMap(([c, j]) => parseAdzuna(j, c)),
    ...parseRemotive(rm),
    ...parseArbeitnow(an),
  ];
  const n = (s: string) => raw.filter((r) => r.source === s).length;
  return {
    raw,
    status: (['adzuna', 'remotive', 'arbeitnow'] as const).map((name) => ({
      name,
      status: 'ok' as const,
      detail: 'fixture',
      raw: n(name),
    })),
  };
}
