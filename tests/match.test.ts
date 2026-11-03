import { describe, it, expect } from 'vitest';
import { scoreListings, buildBm25, tokenize, recencyScore } from '../src/lib/match';
import { WEIGHTS } from '../src/config/weights';
import { mk, profile, NOW, TEMPE, SF } from './helpers';

const rank = (ls: ReturnType<typeof mk>[], p: ReturnType<typeof profile>) => {
  const s = scoreListings(ls, p, NOW);
  return [...ls].sort((a, b) => s.get(b.id)!.score - s.get(a.id)!.score).map((l) => l.id);
};

describe('weights', () =>
  it('sum to 1', () => expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1)));

describe('BM25', () => {
  it('ranks the doc containing the rare query term first', () => {
    const score = buildBm25([
      'machine learning research intern',
      'marketing intern',
      'sales intern',
    ]);
    const s = score(tokenize('machine learning'));
    expect(s[0]).toBeGreaterThan(s[1]);
    expect(s[1]).toBe(0);
  });
});

describe('ranking behaves sensibly', () => {
  const ml = mk({
    id: 'ml',
    title: 'Machine Learning Intern',
    snippet: 'Train models in Python with PyTorch',
    skills: ['Python', 'PyTorch', 'Machine Learning'],
    locations: [TEMPE],
    workMode: 'onsite',
  });
  const web = mk({
    id: 'web',
    title: 'Frontend Intern',
    snippet: 'React and CSS',
    skills: ['React', 'CSS', 'JavaScript'],
    locations: [TEMPE],
    workMode: 'onsite',
  });
  const far = mk({
    id: 'far',
    title: 'Machine Learning Intern',
    snippet: 'Train models in Python with PyTorch',
    skills: ['Python', 'PyTorch', 'Machine Learning'],
    locations: [SF],
    workMode: 'onsite',
  });
  const remote = mk({
    id: 'remote',
    title: 'Machine Learning Intern',
    snippet: 'Train models in Python',
    skills: ['Python', 'Machine Learning'],
    workMode: 'remote',
  });

  const me = profile({
    skills: ['Python', 'PyTorch', 'Machine Learning'],
    targetRoles: ['machine learning intern'],
    locations: ['Tempe|US|AZ'],
    radiusKm: 50,
  });

  it('puts the skill+role+city match on top', () => expect(rank([web, far, ml], me)[0]).toBe('ml'));
  it('prefers nearby over far with identical content', () =>
    expect(rank([far, ml], me)).toEqual(['ml', 'far']));
  it('rewards remote when remote is allowed, and penalises it when only on-site is wanted', () => {
    const allowRemote = scoreListings([remote, far], me, NOW);
    expect(allowRemote.get('remote')!.parts.location).toBe(1);
    const onsiteOnly = scoreListings([remote], { ...me, workModes: ['onsite'] }, NOW);
    expect(onsiteOnly.get('remote')!.parts.location).toBeLessThan(0.5);
  });
  it('explains the match with reasons', () => {
    const r = scoreListings([ml], me, NOW).get('ml')!;
    expect(r.matchedSkills).toEqual(['Python', 'PyTorch', 'Machine Learning']);
    expect(r.reasons.map((x) => x.text).join('|')).toMatch(
      /Skills: Python, PyTorch, Machine Learning/,
    );
    expect(r.reasons.some((x) => x.kind === 'location' && /Tempe/.test(x.text))).toBe(true);
  });
  it('keeps every part and the total within 0..1', () => {
    for (const r of scoreListings([ml, web, far, remote], me, NOW).values()) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      for (const v of Object.values(r.parts)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('dates', () => {
  const summer = mk({ id: 's', season: 'summer', seasonYear: 2027 });
  const fall = mk({ id: 'f', season: 'fall', seasonYear: 2027 });
  const unknown = mk({ id: 'u' });
  const me = profile({
    skills: ['Python'],
    availableFrom: '2027-05-10',
    availableTo: '2027-08-15',
  });
  it('ranks the overlapping season above the non-overlapping one', () =>
    expect(rank([fall, summer], me)[0]).toBe('s'));
  it('treats unknown dates as neutral and labels them', () => {
    const r = scoreListings([unknown, fall], me, NOW);
    expect(r.get('u')!.parts.date).toBe(0.5);
    expect(r.get('u')!.reasons.find((x) => x.kind === 'date')!.text).toBe('Dates not stated');
    expect(r.get('f')!.reasons.find((x) => x.kind === 'date')!.text).toBe(
      'Outside your availability',
    );
  });
});

describe('recency', () => {
  it('decays with age', () => {
    expect(recencyScore('2026-10-30T00:00:00Z', NOW)).toBe(1);
    expect(recencyScore('2026-07-01T00:00:00Z', NOW)).toBeLessThan(0.6);
    expect(recencyScore('2025-01-01T00:00:00Z', NOW)).toBe(0);
    expect(recencyScore(null, NOW)).toBe(0.3);
  });
});
