import { describe, it, expect } from 'vitest';
import { parseGreenhouse } from '../pipeline/adapters/greenhouse';
import { readFileSync } from 'node:fs';
import {
  parseAdzuna,
  parseRemotive,
  parseArbeitnow,
  adzunaUrl,
} from '../pipeline/adapters/aggregators';
import { fetchAdzuna } from '../pipeline/aggregators';
import { buildListings, buildMeta, dedupeAcrossSources } from '../pipeline/build';
import { isInternship } from '../src/shared/internship';
import { mk, place } from './helpers';

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}.json`, 'utf8'));
const all = () => [
  ...Object.entries(fx('adzuna')).flatMap(([c, j]) => parseAdzuna(j, c)),
  ...parseRemotive(fx('remotive')),
  ...parseArbeitnow(fx('arbeitnow')),
];

describe('aggregator adapters', () => {
  it('Adzuna: attribution, country-aware location, and predicted salary is NOT pay stated', () => {
    const jobs = parseAdzuna(fx('adzuna').us, 'us');
    expect(jobs[0]).toMatchObject({
      via: 'Adzuna',
      source: 'adzuna',
      locationTexts: ['Tempe, Maricopa County, United States'],
    });
    expect(jobs[0].text).not.toMatch(/Salary/); // predicted_salary = "1"
    expect(jobs[1].text).toMatch(/Salary: \$45760 per year/); // stated (predicted = "0")
    const l = buildListings(all()).find((x) => x.title === 'Data Analyst Intern')!;
    expect(l.paid).toBe('paid');
    expect(l.locations[0]).toMatchObject({ city: 'Phoenix', country: 'US' });
  });
  it('Remotive: remote, with the location requirement kept as text', () => {
    const l = buildListings(all()).find((x) => x.company.startsWith('Polar Stack'))!;
    expect(l).toMatchObject({
      via: 'Remotive',
      workMode: 'remote',
      title: 'Backend Engineering Intern',
    });
  });
  it('Arbeitnow: German internship titles are recognised and geocoded', () => {
    const ls = buildListings(all()).filter((x) => x.source === 'arbeitnow');
    expect(ls.map((x) => x.title).sort()).toEqual([
      'Praktikum Softwareentwicklung (m/w/d)',
      'Werkstudent Marketing',
    ]);
    expect(ls[0].locations[0].country).toBe('DE');
    expect(isInternship('Praktikant (m/w/d) Vertrieb')).toBe(true);
  });
  it('rejects unexpected response shapes clearly', () => {
    expect(() => parseAdzuna({}, 'us')).toThrow(/unexpected/);
    expect(() => parseRemotive({})).toThrow(/unexpected/);
    expect(() => parseArbeitnow(null)).toThrow(/unexpected/);
  });
  it('Adzuna keys only ever travel in the request URL built from arguments (never hard-coded)', () => {
    expect(adzunaUrl('us', 1, 'ID', 'KEY')).toContain('app_id=ID&app_key=KEY');
    expect(readFileSync('pipeline/adapters/aggregators.ts', 'utf8')).not.toMatch(
      /app_key=[A-Za-z0-9]{8,}/,
    );
  });
});

describe('fetchAggregators without keys', () => {
  it('skips Adzuna and logs it instead of failing', async () => {
    const { raw, status: az } = await fetchAdzuna({});
    expect(raw).toEqual([]);
    expect(az).toMatchObject({ status: 'skipped' });
    expect(az.detail).toMatch(/ADZUNA_APP_ID/);
  });
});

describe('cross-source dedupe', () => {
  const ats = mk({
    id: 'g',
    source: 'greenhouse',
    company: 'Orbit Robotics (sample)',
    title: 'ML Intern',
    locations: [place('Tempe', 'AZ', 33.4, -111.9)],
  });
  const agg = mk({
    id: 'a',
    source: 'adzuna',
    via: 'Adzuna',
    company: 'Orbit Robotics, Inc.',
    title: 'ML  Intern!',
    locations: [place('Tempe', 'AZ', 33.4, -111.9)],
  });
  it('prefers the company ATS copy regardless of input order', () => {
    expect(dedupeAcrossSources([agg, ats]).map((l) => l.id)).toEqual(['g']);
    expect(dedupeAcrossSources([ats, agg]).map((l) => l.id)).toEqual(['g']);
  });
  it('keeps same title in a different city, and different titles', () => {
    const other = mk({ ...agg, id: 'b', locations: [place('Austin', 'TX', 30.3, -97.7)] });
    expect(
      dedupeAcrossSources([ats, other])
        .map((l) => l.id)
        .sort(),
    ).toEqual(['b', 'g']);
    expect(dedupeAcrossSources([ats, mk({ ...agg, id: 'c', title: 'Data Intern' })])).toHaveLength(
      2,
    );
  });
  it('collapses remote copies (no city) of the same job', () => {
    const r1 = mk({ id: 'r1', source: 'ashby', company: 'X', title: 'Intern', workMode: 'remote' });
    const r2 = mk({
      id: 'r2',
      source: 'remotive',
      via: 'Remotive',
      company: 'X',
      title: 'Intern',
      workMode: 'remote',
    });
    expect(dedupeAcrossSources([r2, r1]).map((l) => l.id)).toEqual(['r1']);
  });
  it('fixture run: the Adzuna copy of an ATS listing is dropped, per-source counts come from real output', () => {
    const orbit = parseGreenhouse(fx('greenhouse').orbitrobotics, {
      name: 'Orbit Robotics (sample)',
      source: 'greenhouse',
      slug: 'orbitrobotics',
      category: 't',
    });
    const ls = buildListings([...all(), ...orbit]);
    expect(
      ls.some((l) => l.source === 'greenhouse' && l.title.startsWith('Machine Learning Intern')),
    ).toBe(true);
    expect(ls.filter((l) => l.source === 'adzuna').map((l) => l.sourceId)).toEqual(
      expect.not.arrayContaining(['4400001']),
    );
    const meta = buildMeta(ls, 0, [], true);
    expect(meta.perSource.arbeitnow).toBe(2);
    expect(meta.perCountry.DE).toBeGreaterThanOrEqual(2);
  });
});
