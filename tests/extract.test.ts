import { describe, it, expect } from 'vitest';
import { parseLocation, parseLocations, haversineKm, searchCities, minDistanceKm } from '../src/shared/locations';
import { detectWorkMode } from '../src/shared/workmode';
import { extractTerm, dateFit } from '../src/shared/dates';
import { detectAuthFlags } from '../src/shared/authflags';
import { extractSkills } from '../src/shared/skills';

describe('parseLocation (messy real-world strings)', () => {
  it.each([
    ['San Francisco, CA', 'San Francisco', 'US'],
    ['Tempe, AZ, United States', 'Tempe', 'US'],
    ['Bengaluru, Karnataka, India', 'Bengaluru', 'IN'],
    ['Bangalore', 'Bengaluru', 'IN'],
    ['NYC', 'New York City', 'US'],
    ['Hybrid - Seattle, WA', 'Seattle', 'US'],
    ['Toronto, ON, Canada', 'Toronto', 'CA'],
    ['London, UK', 'London', 'GB'],
    ['Zürich, Switzerland', 'Zürich', 'CH'],
    ['Berlin, Germany', 'Berlin', 'DE'],
    ['Singapore', 'Singapore', 'SG'],
    ['Austin, Texas', 'Austin', 'US'],
  ])('%s', (raw, city, cc) => {
    const p = parseLocation(raw)[0];
    expect(p.city).toBe(city); expect(p.country).toBe(cc); expect(p.latitude).not.toBeNull();
  });
  it('picks the right Dublin and London by country/state', () => {
    expect(parseLocation('Dublin, Ireland')[0].country).toBe('IE');
    expect(parseLocation('Dublin, OH')[0].region).toBe('OH');
    expect(parseLocation('London, ON, Canada')[0].country).toBe('CA');
  });
  it('handles remote-with-country and multi-location strings', () => {
    expect(parseLocation('Remote - US')).toEqual([{ city: null, region: null, country: 'US', latitude: null, longitude: null }]);
    expect(parseLocation('Remote')).toEqual([]);
    expect(parseLocations(['San Francisco, CA; New York, NY | Austin, TX']).map((p) => p.city)).toEqual(['San Francisco', 'New York City', 'Austin']);
  });
  it('keeps unknown cities as text without inventing coordinates', () => {
    const p = parseLocation('Smallville, KS')[0];
    expect(p.city).toBe('Smallville'); expect(p.latitude).toBeNull();
  });
});

describe('geo', () => {
  it('computes distance and radius membership', () => {
    const tempe = parseLocation('Tempe, AZ')[0], phx = parseLocation('Phoenix, AZ')[0], sf = parseLocation('San Francisco, CA')[0];
    expect(haversineKm(tempe.latitude!, tempe.longitude!, phx.latitude!, phx.longitude!)).toBeLessThan(25);
    expect(minDistanceKm([sf, phx], tempe.latitude!, tempe.longitude!)!).toBeLessThan(25);
    expect(minDistanceKm([{ city: 'x', region: null, country: null, latitude: null, longitude: null }], 0, 0)).toBeNull();
  });
  it('typeahead returns biggest matches first', () => expect(searchCities('Tem')[0].name).toBeTruthy());
});

describe('work mode', () => {
  it('uses structured hints', () => expect(detectWorkMode(['Remote - US'], 'Intern', '', null)).toBe('remote'));
  it('detects hybrid in text', () => expect(detectWorkMode(['Austin, TX'], 'Intern', 'Hybrid role, 3 days a week in our office.', null)).toBe('hybrid'));
  it('detects on-site', () => expect(detectWorkMode(['Austin, TX'], 'Intern', 'This is an on-site internship.', null)).toBe('onsite'));
  it('stays unknown without evidence', () => expect(detectWorkMode([], 'Intern', 'Great team.', null)).toBe('unknown'));
});

describe('season and dates', () => {
  it('reads season and year from the title', () => {
    expect(extractTerm('Software Engineering Intern, Summer 2027', '')).toMatchObject({ season: 'summer', seasonYear: 2027 });
    expect(extractTerm('Intern (Fall \'27)', '')).toMatchObject({ season: 'fall', seasonYear: 2027 });
  });
  it('reads explicit ranges', () => {
    const t = extractTerm('Intern', 'The internship runs June 2027 - August 2027.');
    expect(t.startDate).toBe('2027-06-01'); expect(t.endDate).toBe('2027-08-31'); expect(t.season).toBe('summer');
  });
  it('reads start dates', () => expect(extractTerm('Co-op', 'Starting January 2027.')).toMatchObject({ startDate: '2027-01-01', engagement: ['co-op'] }));
  it('never guesses: no dates stated', () => expect(extractTerm('Product Intern', 'Join us!')).toEqual({ season: null, seasonYear: null, startDate: null, endDate: null, engagement: [] }));
  it('flags part-time', () => expect(extractTerm('Software Intern (Part-time)', '').engagement).toContain('part-time'));
  it('scores date fit', () => {
    const summer27 = { season: 'summer' as const, seasonYear: 2027, startDate: null, endDate: null };
    expect(dateFit(summer27, '2027-05-15', '2027-08-15')).toBeGreaterThan(0.8);
    expect(dateFit(summer27, '2027-09-15', '2027-12-15')).toBe(0);
    expect(dateFit({ season: null, seasonYear: null, startDate: null, endDate: null }, '2027-05-01', '2027-08-01')).toBeNull();
  });
});

describe('work-authorization flags (text matches only)', () => {
  const ids = (t: string) => detectAuthFlags(t).map((f) => f.id);
  it('finds each kind', () => {
    expect(ids('We will not provide visa sponsorship.')).toContain('no-sponsorship');
    expect(ids('Candidates must be U.S. citizens.')).toContain('citizenship');
    expect(ids('Ability to obtain a security clearance')).toContain('clearance');
    expect(ids('Students on CPT or OPT are welcome')).toContain('cpt-opt');
    expect(ids('Visa sponsorship is available for eligible students')).toContain('sponsorship-available');
  });
  it('is quiet on ordinary text and keeps the matched phrase', () => {
    expect(detectAuthFlags('Build cool things with React.')).toEqual([]);
    expect(detectAuthFlags('no sponsorship')[0].match.toLowerCase()).toBe('no sponsorship');
  });
});

describe('skills', () => {
  it('maps aliases to canonical names', () => {
    const s = extractSkills('Experience with JS, k8s, Postgres and Node.js; some C++ and C#.');
    expect(s).toEqual(expect.arrayContaining(['JavaScript', 'Kubernetes', 'SQL', 'Node.js', 'C++', 'C#']));
  });
  it('does not confuse Java and JavaScript or match stray letters', () => {
    expect(extractSkills('JavaScript only')).not.toContain('Java');
    expect(extractSkills('Plan A or plan R and go home')).not.toContain('R');
    expect(extractSkills('Written in Golang')).toContain('Go');
  });
});
