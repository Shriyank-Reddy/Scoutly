import type { Listing } from '../shared/types';

export const STAGES = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const;
export type Stage = (typeof STAGES)[number];

export interface TrackedItem {
  listingId: string;
  company: string;
  title: string;
  url: string;
  location: string;
  stage: Stage;
  notes: string;
  followUp: string; // ISO date or ''
  savedAt: string;
}

export const placeLabel = (l: Listing) =>
  l.workMode === 'remote' && !l.locations.length ? 'Remote' : l.locations.map((p) => [p.city, p.region, p.country].filter(Boolean).join(', ')).filter(Boolean).slice(0, 3).join(' / ') || 'Location not stated';

export function newItem(l: Listing, now = new Date()): TrackedItem {
  return { listingId: l.id, company: l.company, title: l.title, url: l.url, location: placeLabel(l), stage: 'Saved', notes: '', followUp: '', savedAt: now.toISOString() };
}

const csvCell = (v: string) => {
  // Prefix formula-looking cells so spreadsheets do not execute them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(items: TrackedItem[]): string {
  const head = ['Company', 'Title', 'Location', 'Stage', 'Follow-up', 'Notes', 'URL', 'Saved'];
  const rows = items.map((i) => [i.company, i.title, i.location, i.stage, i.followUp, i.notes, i.url, i.savedAt.slice(0, 10)]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
