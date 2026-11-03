import { describe, it, expect } from 'vitest';
import { applyFirstSeen, dropDeadLinks, dropStale } from '../pipeline/freshness';
import { isNew } from '../src/shared/fresh';
import { mk } from './helpers';

const NOW = Date.parse('2026-11-01T00:00:00Z');

describe('dropStale', () => {
  it('drops postings older than ~9 months, keeps recent and undated ones', () => {
    const ls = [
      mk({ id: 'old', postedAt: '2026-01-01T00:00:00Z' }),
      mk({ id: 'new', postedAt: '2026-10-20T00:00:00Z' }),
      mk({ id: 'undated', postedAt: null }),
      mk({ id: 'edge', postedAt: '2026-02-05T00:00:00Z' }),
    ];
    const { kept, dropped } = dropStale(ls, NOW);
    expect(kept.map((l) => l.id)).toEqual(['new', 'undated', 'edge']);
    expect(dropped).toBe(1);
  });
});

describe('first seen and the New badge', () => {
  it('first run: everything shares the baseline time, so nothing is "New"', () => {
    const t0 = new Date('2026-11-01T00:00:00Z');
    const r = applyFirstSeen([mk({ id: 'a' }), mk({ id: 'b' })], null, t0);
    expect(r.listings.every((l) => l.firstSeen === t0.toISOString())).toBe(true);
    expect(
      r.listings.some((l) => isNew(l, { trackingSince: r.state.trackingSince }, t0.getTime())),
    ).toBe(false);
  });
  it('later run: only listings that appeared after tracking began are New, and only for 7 days', () => {
    const t0 = new Date('2026-11-01T00:00:00Z'),
      t1 = new Date('2026-11-03T00:00:00Z');
    const first = applyFirstSeen([mk({ id: 'a' })], null, t0);
    const second = applyFirstSeen([mk({ id: 'a' }), mk({ id: 'b' })], first.state, t1);
    const meta = { trackingSince: second.state.trackingSince };
    const byId = Object.fromEntries(second.listings.map((l) => [l.id, l]));
    expect(byId.a.firstSeen).toBe(t0.toISOString());
    expect(isNew(byId.a, meta, t1.getTime())).toBe(false);
    expect(isNew(byId.b, meta, t1.getTime())).toBe(true);
    expect(isNew(byId.b, meta, t1.getTime() + 8 * 864e5)).toBe(false);
  });
  it('forgets ids that disappeared, so the state stays small', () => {
    const first = applyFirstSeen(
      [mk({ id: 'a' }), mk({ id: 'b' })],
      null,
      new Date('2026-11-01T00:00:00Z'),
    );
    const second = applyFirstSeen([mk({ id: 'a' })], first.state, new Date('2026-11-02T00:00:00Z'));
    expect(Object.keys(second.state.firstSeen)).toEqual(['a']);
  });
  it('is false without data', () => {
    expect(isNew({ firstSeen: null }, { trackingSince: '2026-11-01T00:00:00Z' })).toBe(false);
    expect(isNew({ firstSeen: '2026-11-02T00:00:00Z' }, null)).toBe(false);
  });
});

describe('dropDeadLinks', () => {
  const ls = [
    mk({ id: 'ok', url: 'https://x.test/ok' }),
    mk({ id: 'gone', url: 'https://x.test/gone' }),
    mk({ id: 'blocked', url: 'https://x.test/blocked' }),
    mk({ id: 'flaky', url: 'https://x.test/flaky' }),
    mk({ id: 'az', source: 'adzuna', url: 'https://x.test/az' }),
  ];
  const calls: string[] = [];
  const fetchImpl = (async (u: string, init: RequestInit) => {
    calls.push(`${init.method} ${u}`);
    if (u.endsWith('/gone')) return new Response(null, { status: 404 });
    if (u.endsWith('/blocked')) return new Response(null, { status: 403 });
    if (u.endsWith('/flaky')) throw new Error('timeout');
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;

  it('removes only definite 404/410; keeps blocked, flaky and unchecked aggregator links', async () => {
    const r = await dropDeadLinks(ls, { fetchImpl, now: NOW });
    expect(r.kept.map((l) => l.id)).toEqual(['ok', 'blocked', 'flaky', 'az']);
    expect(r.dropped).toBe(1);
    expect(calls.every((c) => c.startsWith('HEAD'))).toBe(true);
    expect(calls.some((c) => c.includes('/az'))).toBe(false); // Adzuna redirects are never probed
  });
  it('uses the cache for a day and honours the per-run cap', async () => {
    calls.length = 0;
    const first = await dropDeadLinks(ls, { fetchImpl, now: NOW });
    const again = await dropDeadLinks(ls, { fetchImpl, now: NOW + 3600_000, cache: first.cache });
    expect(calls).toHaveLength(4); // second pass made no requests
    expect(again.dropped).toBe(1);
    calls.length = 0;
    const capped = await dropDeadLinks(ls, { fetchImpl, now: NOW, maxChecks: 2 });
    expect(capped.checked).toBe(2);
  });
});
