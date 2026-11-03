import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractBoard, licenseAllows, resolveToBoard, discover } from '../pipeline/discover';

describe('extractBoard', () => {
  it.each([
    ['https://boards.greenhouse.io/stripe/jobs/12345', 'greenhouse', 'stripe'],
    ['https://job-boards.greenhouse.io/anthropic/jobs/999?gh_src=x', 'greenhouse', 'anthropic'],
    ['https://boards.greenhouse.io/embed/job_app?for=figma&token=1', 'greenhouse', 'figma'],
    ['https://jobs.lever.co/palantir/abc-123/apply', 'lever', 'palantir'],
    ['https://jobs.ashbyhq.com/ramp/uuid-1', 'ashby', 'ramp'],
  ])('%s', (url, source, slug) => expect(extractBoard(url)).toEqual({ source, slug }));
  it('ignores other sites, reserved words and junk', () => {
    for (const u of [
      'https://www.linkedin.com/jobs/view/1',
      'https://boards.greenhouse.io/embed/job_board',
      'https://jobs.lever.co/',
      'not a url',
      'https://go.vansh.nyc/j',
    ])
      expect(extractBoard(u)).toBeNull();
  });
});

describe('licenseAllows', () => {
  it('accepts permissive licences and rejects missing/unknown text', () => {
    expect(
      licenseAllows(
        'The MIT License (MIT)\n\nPermission is hereby granted, free of charge, to any person',
      ),
    ).toBe('MIT');
    expect(licenseAllows('Apache License\nVersion 2.0, January 2004')).toBe('Apache-2.0');
    expect(licenseAllows('All rights reserved.')).toBeNull();
    expect(licenseAllows('')).toBeNull();
  });
});

describe('resolveToBoard', () => {
  it('follows redirects until an ATS URL appears', async () => {
    const hops: Record<string, string> = {
      'https://go.example/a': 'https://tracker.example/b',
      'https://tracker.example/b': 'https://boards.greenhouse.io/acme/jobs/1',
    };
    const f = (async (u: string) =>
      hops[u]
        ? new Response(null, { status: 302, headers: { location: hops[u] } })
        : new Response('x', { status: 200 })) as unknown as typeof fetch;
    expect(await resolveToBoard('https://go.example/a', f)).toEqual({
      source: 'greenhouse',
      slug: 'acme',
    });
    expect(await resolveToBoard('https://plain.example/', f)).toBeNull();
  });
});

describe('discover (offline, fake network)', () => {
  it('adds verified new boards, rejects 404s, skips unlicensed lists, and never duplicates known boards', async () => {
    mkdirSync('data', { recursive: true });
    const backup = {
      c: readFileSync('data/companies.json', 'utf8'),
      s: readFileSync('data/discovery-sources.json', 'utf8'),
    };
    try {
      writeFileSync(
        'data/companies.json',
        JSON.stringify([{ name: 'Known', source: 'greenhouse', slug: 'known', category: 'x' }]),
      );
      writeFileSync(
        'data/discovery-sources.json',
        JSON.stringify([
          {
            id: 'a/open',
            branch: 'main',
            listingsPath: 'l.json',
            licenseFiles: ['LICENSE'],
            resolveRedirects: false,
          },
          {
            id: 'b/closed',
            branch: 'main',
            listingsPath: 'l.json',
            licenseFiles: ['LICENSE'],
            resolveRedirects: false,
          },
        ]),
      );
      const listings = [
        { url: 'https://boards.greenhouse.io/known/jobs/1', company_name: 'Known' },
        { url: 'https://jobs.lever.co/newco/1', company_name: 'NewCo' },
        { url: 'https://jobs.lever.co/ghost/1', company_name: 'Ghost' },
        { url: 'https://jobs.lever.co/old/1', company_name: 'Old', active: false },
      ];
      const fetchImpl = (async (u: string) => {
        if (u.includes('a/open') && u.endsWith('LICENSE'))
          return new Response('Permission is hereby granted, free of charge, to any person');
        if (u.includes('b/closed') && u.endsWith('LICENSE'))
          return new Response('All rights reserved');
        if (u.endsWith('l.json')) return new Response(JSON.stringify(listings));
        return new Response('', { status: 404 });
      }) as unknown as typeof fetch;
      const board = [
        {
          id: 'x',
          text: 'Software Engineer Intern',
          hostedUrl: 'https://jobs.lever.co/newco/x',
          categories: { location: 'Austin, TX' },
          descriptionPlain: 'Intern',
        },
      ];
      const verifyImpl = async (_s: string, slug: string) => {
        if (slug === 'ghost')
          throw Object.assign(new Error('board not found (404)'), { status: 404 });
        return board;
      };
      const r = await discover({ dryRun: true, fetchImpl, verifyImpl });
      expect(r.sources.map((s) => [s.id, s.license])).toEqual([
        ['a/open', 'MIT'],
        ['b/closed', null],
      ]);
      expect(r.found).toBe(2);
      expect(r.verified.map((v) => v.slug)).toEqual(['newco']);
      expect(r.verified[0]).toMatchObject({ discoveredFrom: 'a/open', internRoles: 1 });
      expect(r.rejected.map((x) => x.slug)).toEqual(['ghost']);
    } finally {
      writeFileSync('data/companies.json', backup.c);
      writeFileSync('data/discovery-sources.json', backup.s);
    }
  });
});
