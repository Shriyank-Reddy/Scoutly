import type { Listing, Profile } from '../src/shared/types';
import { EMPTY_PROFILE } from '../src/lib/storage';

export const NOW = Date.parse('2026-11-01T00:00:00Z');
export function mk(over: Partial<Listing> & { id: string }): Listing {
  return {
    company: 'Co',
    title: 'Software Engineer Intern',
    url: 'https://example.com/' + over.id,
    locations: [],
    workMode: 'unknown',
    season: null,
    seasonYear: null,
    startDate: null,
    endDate: null,
    engagement: [],
    postedAt: '2026-10-25T00:00:00Z',
    paid: 'unknown',
    payText: null,
    snippet: 'Build things.',
    skills: [],
    authFlags: [],
    companySize: null,
    source: 'greenhouse',
    sourceId: over.id,
    ...over,
  };
}
export const profile = (over: Partial<Profile> = {}): Profile => ({ ...EMPTY_PROFILE, ...over });
export const place = (city: string, region: string, lat: number, lon: number) => ({
  city,
  region,
  country: 'US',
  latitude: lat,
  longitude: lon,
});
export const TEMPE = place('Tempe', 'AZ', 33.415, -111.909);
export const SF = place('San Francisco', 'CA', 37.775, -122.419);
