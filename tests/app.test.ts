import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  DEFAULT_FILTERS,
  filtersToParams,
  paramsToFilters,
} from '../src/lib/filters';
import { parseResumeText, validateResumeFile } from '../src/lib/resume';
import { toCsv, newItem } from '../src/lib/tracker';
import { mk, profile, TEMPE, SF } from './helpers';

const none = profile();
describe('filters', () => {
  const ls = [
    mk({
      id: 'a',
      title: 'ML Intern',
      locations: [TEMPE],
      workMode: 'onsite',
      season: 'summer',
      seasonYear: 2027,
      paid: 'paid',
    }),
    mk({
      id: 'b',
      title: 'Web Intern',
      locations: [SF],
      workMode: 'hybrid',
      season: 'fall',
      seasonYear: 2027,
      authFlags: [{ id: 'no-sponsorship', label: 'no sponsorship', match: 'no sponsorship' }],
    }),
    mk({ id: 'c', title: 'Data Intern', workMode: 'remote' }),
    mk({ id: 'd', title: 'Ops Intern', engagement: ['co-op'] }),
  ];
  const ids = (f: Partial<typeof DEFAULT_FILTERS>, p = none) =>
    applyFilters(ls, { ...DEFAULT_FILTERS, ...f }, p).map((l) => l.id);
  it('searches text', () => expect(ids({ q: 'web' })).toEqual(['b']));
  it('filters by work mode (unknown mode is excluded when a mode is chosen)', () => {
    expect(ids({ modes: ['remote'] })).toEqual(['c']);
    expect(ids({ modes: ['onsite', 'hybrid'] })).toEqual(['a', 'b']);
  });
  it('filters by city radius and keeps remote only when remote is selected', () => {
    expect(ids({ city: 'Tempe|US|AZ', radius: 50 })).toEqual(['a']);
    expect(ids({ city: 'Tempe|US|AZ', radius: 50, modes: ['remote', 'onsite'] })).toEqual([
      'a',
      'c',
    ]);
    expect(ids({ city: 'Tempe|US|AZ', radius: 3000 })).toEqual(['a', 'b']);
  });
  it('availability filter hides known non-overlaps but never hides unknown dates', () => {
    const me = profile({ availableFrom: '2027-05-10', availableTo: '2027-08-15' });
    expect(ids({ avail: true }, me)).toEqual(['a', 'c', 'd']);
  });
  it('paid, co-op and flagged filters', () => {
    expect(ids({ paidOnly: true })).toEqual(['a']);
    expect(ids({ engagement: 'co-op' })).toEqual(['d']);
    expect(ids({ hideFlagged: true })).toEqual(['a', 'c', 'd']);
  });
  it('round-trips through URL params', () => {
    const f = {
      ...DEFAULT_FILTERS,
      q: 'ml',
      modes: ['remote' as const],
      city: 'Tempe|US|AZ',
      radius: 120,
      avail: true,
      sort: 'recent' as const,
    };
    expect(paramsToFilters(filtersToParams(f))).toEqual(f);
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
  });
});

const RESUME = `Shriyank Singireddy
Tempe, AZ | github.com/example | https://www.linkedin.com/in/example
EDUCATION
Arizona State University
B.S. in Computer Science, Expected May 2027
SKILLS
Python, JS, React, Postgres, Docker, k8s, Git
`;
describe('resume parsing', () => {
  const r = parseResumeText(RESUME);
  it('finds name, skills, links', () => {
    expect(r.name).toBe('Shriyank Singireddy');
    expect(r.skills).toEqual(
      expect.arrayContaining([
        'Python',
        'JavaScript',
        'React',
        'SQL',
        'Docker',
        'Kubernetes',
        'Git',
      ]),
    );
    expect(r.links.some((l) => l.includes('github.com/example'))).toBe(true);
    expect(r.links.some((l) => l.includes('linkedin.com/in/example'))).toBe(true);
  });
  it('finds education and graduation year', () => {
    expect(r.education[0].school).toMatch(/Arizona State University/);
    expect(r.education[0].gradYear).toBe(2027);
  });
  it('returns empties for junk without crashing', () => {
    const e = parseResumeText('');
    expect(e.skills).toEqual([]);
    expect(e.education).toEqual([]);
    expect(e.name).toBe('');
  });
});

describe('tracker csv', () => {
  it('escapes quotes/commas and neutralises formulas', () => {
    const it = {
      ...newItem(mk({ id: 'x', company: '=HYPERLINK("evil")', title: 'A, "B"' })),
      notes: 'line1\nline2',
    };
    const csv = toCsv([it]);
    expect(csv.split('\r\n')[0]).toBe('Company,Title,Location,Stage,Follow-up,Notes,URL,Saved');
    expect(csv).toContain(`"'=HYPERLINK(""evil"")"`);
    expect(csv).toContain('"A, ""B"""');
    expect(csv).toContain('"line1\nline2"');
  });
});

describe('resume file validation', () => {
  it('accepts pdf/docx and rejects others, big and empty files', () => {
    expect(validateResumeFile({ name: 'cv.PDF', size: 1000 })).toBeNull();
    expect(validateResumeFile({ name: 'cv.docx', size: 1000 })).toBeNull();
    expect(validateResumeFile({ name: 'cv.exe', size: 1000 })).toMatch(/PDF or DOCX/);
    expect(validateResumeFile({ name: 'cv.pdf', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validateResumeFile({ name: 'cv.pdf', size: 0 })).toMatch(/empty/);
  });
});

import { monthStart, monthEnd, isoToMonth } from '../src/lib/months';
import { interestHit } from '../src/shared/interests';
describe('months and interests', () => {
  it('converts month pickers to inclusive date ranges', () => {
    expect(monthStart('2027-05')).toBe('2027-05-01');
    expect(monthEnd('2027-08')).toBe('2027-08-31');
    expect(monthEnd('2028-02')).toBe('2028-02-29');
    expect(monthStart('')).toBeNull();
    expect(monthEnd('2027-13')).toBeNull();
    expect(isoToMonth('2027-05-01')).toBe('2027-05');
  });
  it('matches interest keywords on whole words only', () => {
    expect(interestHit('ai-ml', 'AI Research Intern', '')).toBe(1);
    expect(interestHit('ai-ml', 'Intern', 'fair hiring')).toBe(0); // "ai" inside "fair" must not match
    expect(interestHit('security', 'Intern', 'work on threat detection')).toBe(0.6);
  });
});
