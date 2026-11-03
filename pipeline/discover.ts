// Usage: npm run discover [-- --dry-run --max-resolve=300 --max-verify=200]
// Finds new Greenhouse / Lever / Ashby boards in public, permissively-licensed internship lists, verifies each
// with one request, and appends them to data/companies.json (a weekly workflow opens a PR for human review).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { BoardSource, CompanySeed } from '../src/shared/types';
import { extractBoard } from '../src/shared/boards';
import { getJson, HttpError, USER_AGENT } from './http';
import { buildListings, parseBoard } from './build';
import { greenhouseUrl } from './adapters/greenhouse';
import { leverUrl } from './adapters/lever';
import { ashbyUrl } from './adapters/ashby';

const URLS = { greenhouse: greenhouseUrl, lever: leverUrl, ashby: ashbyUrl };
export { extractBoard };

/** Only reuse lists under a permissive licence. Returns the licence name or null (= skip the list). */
export function licenseAllows(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('permission is hereby granted, free of charge')) return 'MIT';
  if (t.includes('apache license') && t.includes('version 2.0')) return 'Apache-2.0';
  if (t.includes('redistribution and use in source and binary forms')) return 'BSD';
  if (t.includes('creative commons zero') || t.includes('cc0 1.0')) return 'CC0-1.0';
  if (t.includes('this is free and unencumbered software')) return 'Unlicense';
  return null;
}

type Fetcher = typeof fetch;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Follow redirects by hand (max 5 hops) until we land on an ATS board URL. One request per hop. */
export async function resolveToBoard(
  url: string,
  fetchImpl: Fetcher = fetch,
): Promise<{ source: BoardSource; slug: string } | null> {
  let cur = url;
  for (let hop = 0; hop < 5; hop++) {
    const direct = extractBoard(cur);
    if (direct) return direct;
    const res = await fetchImpl(cur, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
    const loc = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !loc) return null;
    cur = new URL(loc, cur).toString();
  }
  return extractBoard(cur);
}

interface SourceCfg {
  id: string;
  branch: string;
  listingsPath: string;
  licenseFiles: string[];
  resolveRedirects: boolean;
}
interface ListItem {
  url?: string;
  company_name?: string;
  active?: boolean;
  is_visible?: boolean;
}
export interface Report {
  checkedAt: string;
  sources: {
    id: string;
    license: string | null;
    skipped?: string;
    links: number;
    direct: number;
    resolved: number;
  }[];
  found: number;
  verified: {
    company: string;
    source: string;
    slug: string;
    internRoles: number;
    discoveredFrom: string;
  }[];
  rejected: { company: string; source?: string; slug?: string; reason: string }[];
}

export async function discover(
  opts: {
    dryRun?: boolean;
    maxResolve?: number;
    maxVerify?: number;
    fetchImpl?: Fetcher;
    verifyImpl?: (s: BoardSource, slug: string) => Promise<unknown>;
  } = {},
): Promise<Report> {
  const { dryRun = false, maxResolve = 300, maxVerify = 200, fetchImpl = fetch } = opts;
  const verifyImpl =
    opts.verifyImpl ??
    ((s: BoardSource, slug: string) => getJson(URLS[s](slug), { retries: 1, fetchImpl }));
  const sources: SourceCfg[] = JSON.parse(await readFile('data/discovery-sources.json', 'utf8'));
  const companies: CompanySeed[] = JSON.parse(await readFile('data/companies.json', 'utf8'));
  const known = new Set(companies.map((c) => `${c.source}:${c.slug.toLowerCase()}`));
  const report: Report = {
    checkedAt: new Date().toISOString(),
    sources: [],
    found: 0,
    verified: [],
    rejected: [],
  };
  let redirectCache: Record<string, { source: BoardSource; slug: string } | null> = {};
  try {
    redirectCache = JSON.parse(await readFile('data/cache/redirects.json', 'utf8'));
  } catch {
    /* first run */
  }
  const candidates = new Map<
    string,
    { source: BoardSource; slug: string; name: string; from: string }
  >();
  let resolveBudget = maxResolve;

  for (const src of sources) {
    const base = `https://raw.githubusercontent.com/${src.id}/${src.branch}`;
    let license: string | null = null;
    for (const f of src.licenseFiles) {
      const r = await fetchImpl(`${base}/${f}`, { headers: { 'User-Agent': USER_AGENT } }).catch(
        () => null,
      );
      if (r?.ok) {
        license = licenseAllows(await r.text());
        if (license) break;
      }
    }
    if (!license) {
      report.sources.push({
        id: src.id,
        license: null,
        skipped: 'no permissive licence found',
        links: 0,
        direct: 0,
        resolved: 0,
      });
      continue;
    }
    const res = await fetchImpl(`${base}/${src.listingsPath}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      report.sources.push({
        id: src.id,
        license,
        skipped: `listings HTTP ${res.status}`,
        links: 0,
        direct: 0,
        resolved: 0,
      });
      continue;
    }
    const items = (await res.json()) as ListItem[];
    const stat = { id: src.id, license, links: 0, direct: 0, resolved: 0 };
    for (const it of items) {
      if (!it.url || it.active === false || it.is_visible === false) continue;
      stat.links++;
      let board = extractBoard(it.url);
      if (board) stat.direct++;
      else if (src.resolveRedirects) {
        if (it.url in redirectCache) board = redirectCache[it.url];
        else if (resolveBudget > 0) {
          resolveBudget--;
          try {
            board = await resolveToBoard(it.url, fetchImpl);
          } catch {
            board = null;
          }
          redirectCache[it.url] = board;
          await sleep(opts.fetchImpl ? 0 : 1000);
        }
        if (board) stat.resolved++;
      }
      if (!board) continue;
      const key = `${board.source}:${board.slug.toLowerCase()}`;
      if (known.has(key) || candidates.has(key)) continue;
      candidates.set(key, { ...board, name: it.company_name?.trim() || board.slug, from: src.id });
    }
    report.sources.push(stat);
  }
  if (!dryRun) {
    await mkdir('data/cache', { recursive: true });
    await writeFile('data/cache/redirects.json', JSON.stringify(redirectCache));
  }

  report.found = candidates.size;
  let budget = maxVerify;
  for (const c of candidates.values()) {
    if (budget-- <= 0) {
      report.rejected.push({
        company: c.name,
        source: c.source,
        slug: c.slug,
        reason: 'not verified this run (verify cap reached)',
      });
      continue;
    }
    try {
      const json = await verifyImpl(c.source, c.slug);
      const seed: CompanySeed = {
        name: c.name,
        source: c.source,
        slug: c.slug,
        category: 'discovered',
        discoveredFrom: c.from,
      };
      const interns = buildListings(parseBoard(seed, json)).length;
      companies.push(seed);
      report.verified.push({
        company: c.name,
        source: c.source,
        slug: c.slug,
        internRoles: interns,
        discoveredFrom: c.from,
      });
    } catch (e) {
      report.rejected.push({
        company: c.name,
        source: c.source,
        slug: c.slug,
        reason:
          e instanceof HttpError && e.status === 404
            ? 'board not found (404)'
            : `verify failed: ${(e as Error).message}`,
      });
    }
  }
  if (!dryRun) {
    await writeFile(
      'data/companies.json',
      '[\n' + companies.map((c) => ' ' + JSON.stringify(c)).join(',\n') + '\n]\n',
    );
    await writeFile('data/discovery-report.json', JSON.stringify(report, null, 2));
    await writeFile('data/discovery-report.md', reportMarkdown(report));
  }
  return report;
}

export function reportMarkdown(r: Report): string {
  const lines = [`# Discovery report`, '', `Run: ${r.checkedAt}`, '', '## Sources', ''];
  for (const s of r.sources)
    lines.push(
      `- \`${s.id}\`: licence ${s.license ?? 'NOT PERMISSIVE'}${s.skipped ? ` (skipped: ${s.skipped})` : ''}; ${s.links} links, ${s.direct} direct ATS links, ${s.resolved} found by resolving redirects`,
    );
  lines.push(
    '',
    `## Summary`,
    '',
    `- New boards found: ${r.found}`,
    `- Verified and added: ${r.verified.length}`,
    `- Rejected: ${r.rejected.length}`,
    '',
    '## Added',
    '',
  );
  for (const v of r.verified)
    lines.push(
      `- ${v.company} (${v.source}/${v.slug}): ${v.internRoles} internship-like roles now, from ${v.discoveredFrom}`,
    );
  lines.push('', '## Rejected', '');
  for (const v of r.rejected)
    lines.push(`- ${v.company}${v.slug ? ` (${v.source}/${v.slug})` : ''}: ${v.reason}`);
  return lines.join('\n') + '\n';
}

if (process.argv[1]?.endsWith('discover.ts')) {
  const args = process.argv.slice(2);
  const num = (n: string, d: number) =>
    Number(args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d);
  discover({
    dryRun: args.includes('--dry-run'),
    maxResolve: num('max-resolve', 300),
    maxVerify: num('max-verify', 200),
  })
    .then((r) =>
      console.log(
        `found ${r.found}, verified ${r.verified.length}, rejected ${r.rejected.length}; sources: ${r.sources.map((s) => `${s.id} ${s.license ?? 'skipped'}`).join(', ')}`,
      ),
    )
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
