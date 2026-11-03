// Usage: npm run fetch-jobs [-- --fixtures | --no-fallback | --verify]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { CompanySeed, Meta, RawJob } from '../src/shared/types';
import { buildListings, buildMeta, parseBoard } from './build';
import { getJson, HttpError } from './http';
import { fetchAggregators, fixtureAggregators, type AggResult } from './aggregators';
import { greenhouseUrl } from './adapters/greenhouse';
import { leverUrl } from './adapters/lever';
import { ashbyUrl } from './adapters/ashby';

const URLS = { greenhouse: greenhouseUrl, lever: leverUrl, ashby: ashbyUrl };
const args = new Set(process.argv.slice(2));
const readJson = async <T>(p: string) => JSON.parse(await readFile(p, 'utf8')) as T;

async function loadBoards(seeds: CompanySeed[], useFixtures: boolean) {
  const raw: RawJob[] = [];
  const failures: Meta['boardsFailed'] = [];
  let ok = 0;
  let netFails = 0; // consecutive network-level failures (no HTTP status): abort early instead of waiting on every board
  for (const seed of seeds) {
    if (netFails >= 3) {
      failures.push({
        company: seed.name,
        source: seed.source,
        slug: seed.slug,
        reason: 'skipped: network unreachable',
      });
      continue;
    }
    try {
      const json = useFixtures
        ? (await readJson<Record<string, unknown>>(`tests/fixtures/${seed.source}.json`))[seed.slug]
        : await getJson(URLS[seed.source](seed.slug));
      if (json === undefined) throw new Error('no fixture for slug');
      raw.push(...parseBoard(seed, json));
      ok++;
      netFails = 0;
    } catch (e) {
      netFails = e instanceof HttpError ? 0 : netFails + 1;
      failures.push({
        company: seed.name,
        source: seed.source,
        slug: seed.slug,
        reason: (e as Error).message,
      });
    }
  }
  return { raw, failures, ok };
}

async function write(listings: ReturnType<typeof buildListings>, meta: Meta) {
  await mkdir('public/data', { recursive: true });
  await writeFile('public/data/listings.json', JSON.stringify(listings));
  await writeFile('public/data/meta.json', JSON.stringify(meta, null, 2));
  console.log(
    `Wrote ${listings.length} listings (${meta.isSample ? 'SAMPLE data' : 'live data'}), ${meta.boardsOk} boards ok, ${meta.boardsFailed.length} failed.`,
  );
}

async function main() {
  const fixturesOnly = args.has('--fixtures');
  if (fixturesOnly) {
    const seeds = await readJson<CompanySeed[]>('data/companies.sample.json');
    const { raw, failures, ok } = await loadBoards(seeds, true);
    const agg = await fixtureAggregators();
    const listings = buildListings([...raw, ...agg.raw]);
    return write(listings, buildMeta(listings, ok, failures, true, new Date(), agg.status));
  }
  const seeds = await readJson<CompanySeed[]>('data/companies.json');
  const { raw, failures, ok } = await loadBoards(seeds, false);
  if (args.has('--verify')) {
    console.log(`Verified ${ok}/${seeds.length} boards. Failures:`);
    for (const f of failures) console.log(`  ${f.source}/${f.slug}: ${f.reason}`);
    await mkdir('data', { recursive: true });
    await writeFile(
      'data/slug-report.json',
      JSON.stringify({ checkedAt: new Date().toISOString(), ok, failures }, null, 2),
    );
    return;
  }
  if (ok === 0) {
    console.error(`No board could be fetched (${failures[0]?.reason ?? 'no boards'}).`);
    if (args.has('--no-fallback')) process.exit(1);
    console.error(
      'Falling back to bundled SAMPLE fixtures. The site will be labelled "Sample data".',
    );
    const sample = await readJson<CompanySeed[]>('data/companies.sample.json');
    const fx = await loadBoards(sample, true);
    const agg = await fixtureAggregators();
    const listings = buildListings([...fx.raw, ...agg.raw]);
    return write(listings, buildMeta(listings, fx.ok, failures, true, new Date(), agg.status));
  }
  // Aggregators are optional extras: a missing key or a failure is recorded in meta.json, never fatal.
  const agg: AggResult = await fetchAggregators().catch((e) => ({
    raw: [],
    status: [
      { name: 'aggregators', status: 'failed' as const, detail: (e as Error).message, raw: 0 },
    ],
  }));
  for (const st of agg.status)
    console.log(`aggregator ${st.name}: ${st.status} (${st.detail}), ${st.raw} raw`);
  const listings = buildListings([...raw, ...agg.raw]);
  await write(listings, buildMeta(listings, ok, failures, false, new Date(), agg.status));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
