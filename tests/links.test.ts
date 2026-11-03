import { describe, it, expect } from 'vitest';
import { externalSearchLinks, withIntern, EXTERNAL_SITES } from '../src/config/externalSearch';
import { detectSite, newManualItem, parseJobLink } from '../src/lib/tracker';
import { extractBoard } from '../src/shared/boards';

describe('external search links', () => {
  const links = (o: Parameters<typeof externalSearchLinks>[0]) =>
    Object.fromEntries(externalSearchLinks(o).map((l) => [l.id, l.url]));
  it('pre-fills role and location on every site, URL-encoded', () => {
    const l = links({ keywords: 'machine learning', location: 'Tempe, AZ', country: 'US' });
    expect(l.linkedin).toBe(
      'https://www.linkedin.com/jobs/search/?keywords=machine%20learning%20internship&location=Tempe%2C%20AZ',
    );
    expect(l.indeed).toBe(
      'https://www.indeed.com/jobs?q=machine%20learning%20internship&l=Tempe%2C%20AZ',
    );
    expect(l.internshala).toBe(
      'https://internshala.com/internships/machine-learning-internship-internship-in-tempe-az',
    );
    expect(l.handshake).toContain('query=machine%20learning%20internship');
  });
  it('uses country-specific Indeed domains and works without a location', () => {
    expect(
      links({ keywords: 'data intern', location: 'Bengaluru, India', country: 'IN' }).indeed,
    ).toMatch(/^https:\/\/in\.indeed\.com\//);
    const none = links({ keywords: '' });
    expect(none.linkedin).toBe(
      'https://www.linkedin.com/jobs/search/?keywords=software%20internship',
    );
    expect(none.internshala).toBe(
      'https://internshala.com/internships/keywords-software-internship',
    );
  });
  it('does not double up "internship" and has one template per site in the config', () => {
    expect(withIntern('Data Intern')).toBe('Data Intern');
    expect(withIntern('co-op')).toBe('co-op');
    expect(EXTERNAL_SITES.map((s) => s.id)).toEqual([
      'linkedin',
      'internshala',
      'handshake',
      'indeed',
    ]);
  });
  it('neutralises hostile input in the query', () => {
    expect(links({ keywords: 'a&b=c"><script>', location: 'x' }).linkedin).not.toMatch(/[<>"]/);
  });
});

describe('tracker: add from link', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/123', 'LinkedIn'],
    ['https://uk.indeed.com/viewjob?jk=1', 'Indeed'],
    ['https://app.joinhandshake.com/stu/jobs/1', 'Handshake'],
    ['https://internshala.com/internship/detail/x', 'Internshala'],
    ['https://boards.greenhouse.io/stripe/jobs/1', 'Greenhouse'],
    ['https://careers.example.com/jobs/1', 'careers.example.com'],
  ])('detects %s -> %s', (url, site) => expect(detectSite(url)).toBe(site));
  it('rejects non-http(s) links', () => {
    for (const u of ['javascript:alert(1)', 'ftp://x.com/a', 'not a url', '']) {
      expect(parseJobLink(u)).toBeNull();
      expect(detectSite(u)).toBeNull();
    }
  });
  it('builds a tracked item from user-typed title and company, with a stable id per link', () => {
    const a = newManualItem({
      url: 'https://www.linkedin.com/jobs/view/123',
      title: ' SWE Intern ',
      company: 'Acme',
    })!;
    expect(a).toMatchObject({
      title: 'SWE Intern',
      company: 'Acme',
      stage: 'Saved',
      site: 'LinkedIn',
      location: 'Location not stated',
    });
    expect(
      newManualItem({ url: 'https://www.linkedin.com/jobs/view/123', title: 'x', company: 'y' })!
        .listingId,
    ).toBe(a.listingId);
    expect(
      newManualItem({ url: 'https://www.linkedin.com/jobs/view/123', title: '', company: 'Acme' }),
    ).toBeNull();
    expect(newManualItem({ url: 'javascript:alert(1)', title: 'x', company: 'y' })).toBeNull();
  });
  it('guesses a company from an ATS board link', () =>
    expect(extractBoard('https://jobs.lever.co/palantir/abc')?.slug).toBe('palantir'));
});
