import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseGreenhouse } from '../pipeline/adapters/greenhouse';
import { parseLever } from '../pipeline/adapters/lever';
import { parseAshby } from '../pipeline/adapters/ashby';
import { buildListings, buildMeta } from '../pipeline/build';
import { backoffMs, getJson, HttpError } from '../pipeline/http';
import { isInternship } from '../src/shared/internship';
import { htmlToText } from '../src/shared/text';
import type { CompanySeed } from '../src/shared/types';

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}.json`, 'utf8'));
const seed = (source: CompanySeed['source'], slug: string, name: string): CompanySeed => ({
  name,
  source,
  slug,
  category: 'test',
});

describe('adapters (recorded-shape fixtures)', () => {
  it('parses Greenhouse and decodes escaped HTML content', () => {
    const jobs = parseGreenhouse(
      fx('greenhouse').orbitrobotics,
      seed('greenhouse', 'orbitrobotics', 'Orbit'),
    );
    expect(jobs).toHaveLength(4);
    expect(jobs[0].text).toContain('PyTorch');
    expect(jobs[0].text).not.toContain('<p>');
    expect(jobs[0].url).toMatch(/^https:\/\//);
  });
  it('parses Lever, using allLocations and workplaceType', () => {
    const jobs = parseLever(fx('lever').cipherlabs, seed('lever', 'cipherlabs', 'Cipher'));
    expect(jobs.length).toBeGreaterThan(2);
    expect(jobs[0].locationTexts).toEqual(['Washington, DC']);
    expect(jobs[0].postedAt).toMatch(/^20\d\d-/);
  });
  it('parses Ashby, marking remote from workplaceType', () => {
    const jobs = parseAshby(fx('ashby').tesserapay, seed('ashby', 'tesserapay', 'Tessera'));
    expect(jobs.find((j) => j.title.startsWith('Data Engineering'))?.remoteHint).toBe(true);
  });
  it('throws a clear error on an unexpected shape', () => {
    expect(() => parseGreenhouse({ oops: 1 }, seed('greenhouse', 'x', 'X'))).toThrow(/unexpected/);
    expect(() => parseLever({}, seed('lever', 'x', 'X'))).toThrow(/unexpected/);
    expect(() => parseAshby(null, seed('ashby', 'x', 'X'))).toThrow(/unexpected/);
  });
});

describe('internship filter', () => {
  it.each([
    ['Software Engineering Intern, Summer 2027', true],
    ['Machine Learning Internship', true],
    ['Embedded Systems Co-op (January 2027)', true],
    ['Werkstudent Data Engineering', true],
    ['Apprentice Electrician', true],
    ['Senior Software Engineer', false],
    ['Intern Program Manager', false],
    ['Staff Engineer, Interns Platform', false],
    ['Student Loan Specialist', false],
    ['Internal Tools Engineer', false],
  ])('%s -> %s', (title, expected) => expect(isInternship(title)).toBe(expected));
  it('accepts "Student Researcher" style titles', () =>
    expect(isInternship('Student Researcher', 'university program')).toBe(true));
});

describe('buildListings', () => {
  const raw = [
    ...parseGreenhouse(
      fx('greenhouse').orbitrobotics,
      seed('greenhouse', 'orbitrobotics', 'Orbit'),
    ),
    ...parseGreenhouse(
      fx('greenhouse').lumencloudindia,
      seed('greenhouse', 'lumencloudindia', 'Lumen'),
    ),
    ...parseLever(fx('lever').cipherlabs, seed('lever', 'cipherlabs', 'Cipher')),
  ];
  const listings = buildListings(raw);
  it('drops non-internships (senior, manager, student loan)', () => {
    expect(listings.some((l) => /Senior|Manager|Loan/.test(l.title))).toBe(false);
    expect(listings.length).toBeGreaterThan(3);
  });
  it('dedupes the same job posted under several locations', () => {
    const sec = listings.filter((l) => l.title === 'Security Engineering Intern');
    expect(sec).toHaveLength(1);
    expect(sec[0].locations.map((p) => p.city).sort()).toEqual(['Austin', 'Washington, D.C.']);
    const sdi = listings.filter((l) => l.title === 'Software Development Intern');
    expect(sdi).toHaveLength(1);
    expect(sdi[0].locations).toHaveLength(2);
  });
  it('keeps a short snippet, never the full description', () => {
    for (const l of listings) expect(l.snippet.length).toBeLessThanOrEqual(285);
  });
  it('builds meta from real output', () => {
    const meta = buildMeta(listings, 3, [], true, new Date('2026-01-01T00:00:00Z'));
    expect(meta.totalListings).toBe(listings.length);
    expect(meta.perSource.greenhouse + meta.perSource.lever).toBe(listings.length);
    expect(meta.perCountry.US).toBeGreaterThan(0);
    expect(meta.fetchedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('http', () => {
  it('uses exponential backoff', () => {
    expect([0, 1, 2, 3].map(backoffMs)).toEqual([1000, 2000, 4000, 8000]);
    expect(backoffMs(20)).toBe(30000);
  });
  it('retries 5xx then succeeds, sending a User-Agent without an email', async () => {
    let calls = 0;
    const delays: number[] = [];
    let ua = '';
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      ua = (init.headers as Record<string, string>)['User-Agent'];
      return ++calls < 3
        ? new Response('x', { status: 503 })
        : new Response('{"ok":true}', { status: 200 });
    }) as unknown as typeof fetch;
    const out = await getJson(`https://example.test/retry-${Math.random()}`, {
      fetchImpl,
      sleepImpl: async (ms) => {
        delays.push(ms);
      },
    });
    expect(out).toEqual({ ok: true });
    expect(delays).toEqual([1000, 2000]);
    expect(ua).toContain('github.com');
    expect(ua).not.toContain('@');
  });
  it('does not retry a 404', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;
    await expect(
      getJson(`https://example.test/nf-${Math.random()}`, { fetchImpl, sleepImpl: async () => {} }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(calls).toBe(1);
  });
});

describe('htmlToText', () => {
  it('strips tags and decodes entities', () => {
    expect(htmlToText('<p>R&amp;D &lt;intern&gt;</p><ul><li>One</li><li>Two</li></ul>')).toBe(
      'R&D <intern>\nOne\nTwo',
    );
  });
});
