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
  site?: string; // where a manually added link points (LinkedIn, Indeed, ...)
}

export const placeLabel = (l: Listing) =>
  l.workMode === 'remote' && !l.locations.length
    ? 'Remote'
    : l.locations
        .map((p) => [p.city, p.region, p.country].filter(Boolean).join(', '))
        .filter(Boolean)
        .slice(0, 3)
        .join(' / ') || 'Location not stated';

export function newItem(l: Listing, now = new Date()): TrackedItem {
  return {
    listingId: l.id,
    company: l.company,
    title: l.title,
    url: l.url,
    location: placeLabel(l),
    stage: 'Saved',
    notes: '',
    followUp: '',
    savedAt: now.toISOString(),
  };
}

const csvCell = (v: string) => {
  // Prefix formula-looking cells so spreadsheets do not execute them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const SITES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)indeed\.[a-z.]+$/, 'Indeed'],
  [/(^|\.)joinhandshake\.com$/, 'Handshake'],
  [/(^|\.)internshala\.com$/, 'Internshala'],
  [/(^|\.)greenhouse\.io$/, 'Greenhouse'],
  [/(^|\.)lever\.co$/, 'Lever'],
  [/(^|\.)ashbyhq\.com$/, 'Ashby'],
  [/(^|\.)myworkdayjobs\.com$/, 'Workday'],
  [/(^|\.)glassdoor\.[a-z.]+$/, 'Glassdoor'],
  [/(^|\.)adzuna\.[a-z.]+$/, 'Adzuna'],
  [/(^|\.)remotive\.com$/, 'Remotive'],
  [/(^|\.)arbeitnow\.com$/, 'Arbeitnow'],
];

/** A pasted link: only http(s) is accepted (no javascript: etc.). */
export function parseJobLink(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}
/** Site name from the domain; falls back to the bare domain. Never fetches the page. */
export function detectSite(raw: string): string | null {
  const u = parseJobLink(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  return SITES.find(([re]) => re.test(host))?.[1] ?? host;
}

const hash = (s: string) => {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};
/** A tracked item for a link the user pasted. Title and company are typed by the user, never scraped. */
export function newManualItem(
  i: { url: string; title: string; company: string; location?: string },
  now = new Date(),
): TrackedItem | null {
  const u = parseJobLink(i.url);
  if (!u || !i.title.trim() || !i.company.trim()) return null;
  return {
    listingId: `manual:${hash(u.toString())}`,
    company: i.company.trim(),
    title: i.title.trim(),
    url: u.toString(),
    location: i.location?.trim() || 'Location not stated',
    stage: 'Saved',
    notes: '',
    followUp: '',
    savedAt: now.toISOString(),
    site: detectSite(u.toString()) ?? undefined,
  };
}

export function toCsv(items: TrackedItem[]): string {
  const head = [
    'Company',
    'Title',
    'Location',
    'Stage',
    'Follow-up',
    'Notes',
    'Site',
    'URL',
    'Saved',
  ];
  const rows = items.map((i) => [
    i.company,
    i.title,
    i.location,
    i.stage,
    i.followUp,
    i.notes,
    i.site ?? '',
    i.url,
    i.savedAt.slice(0, 10),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
