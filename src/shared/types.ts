// Types shared by the data pipeline (Node) and the website (browser).
export type BoardSource = 'greenhouse' | 'lever' | 'ashby'; // company ATS boards we read one slug at a time
export type SourceName = 'greenhouse' | 'lever' | 'ashby' | 'adzuna' | 'remotive' | 'arbeitnow';
/** Company ATS boards are first-party; aggregators are second-hand copies and lose when the same job appears in both. */
export const AGGREGATORS: SourceName[] = ['adzuna', 'remotive', 'arbeitnow'];
export const SOURCE_LABEL: Record<SourceName, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  adzuna: 'Adzuna',
  remotive: 'Remotive',
  arbeitnow: 'Arbeitnow',
};
export type WorkMode = 'onsite' | 'hybrid' | 'remote' | 'unknown';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Engagement = 'co-op' | 'part-time';
export type PaidStatus = 'paid' | 'unpaid' | 'unknown';
export type CompanySize = 'startup' | 'mid' | 'large';

export interface Place {
  city: string | null;
  region: string | null; // US state code etc.
  country: string | null; // ISO-3166 alpha-2
  latitude: number | null;
  longitude: number | null;
}

export interface AuthFlag {
  id: 'citizenship' | 'no-sponsorship' | 'clearance' | 'cpt-opt' | 'sponsorship-available';
  label: string; // human label, shown as "Mentions: <label>"
  match: string; // the exact phrase found in the posting
}

export interface Listing {
  id: string;
  company: string;
  title: string;
  url: string; // the original posting: always where "Apply" goes
  locations: Place[];
  workMode: WorkMode;
  season: Season | null;
  seasonYear: number | null;
  startDate: string | null; // ISO date, only when the posting states it
  endDate: string | null;
  engagement: Engagement[];
  postedAt: string | null;
  paid: PaidStatus;
  payText: string | null;
  snippet: string;
  skills: string[]; // canonical skill names
  authFlags: AuthFlag[];
  companySize: CompanySize | null; // approximate, curated in data/companies.json (not from the posting)
  via: string | null; // aggregator name to show as "via <source>"; null for a company's own ATS
  source: SourceName;
  sourceId: string;
}

/** What an adapter returns before normalisation. */
export interface RawJob {
  source: SourceName;
  sourceId: string;
  company: string;
  title: string;
  url: string;
  locationTexts: string[];
  remoteHint: boolean | null;
  text: string; // plain-text description
  companySize: CompanySize | null;
  via: string | null;
  postedAt: string | null;
}

export interface Meta {
  fetchedAt: string;
  isSample: boolean;
  totalListings: number;
  perSource: Record<string, number>;
  perCountry: Record<string, number>;
  boardsOk: number;
  boardsFailed: { company: string; source: string; slug: string; reason: string }[];
  /** Aggregator runs: ok / skipped (e.g. no API keys) / failed, so a missing source is visible, not silent. */
  aggregators?: {
    name: string;
    status: 'ok' | 'skipped' | 'failed';
    detail: string;
    raw: number;
  }[];
}

export interface CompanySeed {
  name: string;
  source: BoardSource;
  slug: string;
  category: string;
  size?: CompanySize;
  discoveredFrom?: string; // set by `npm run discover`: which public list the company was found in
}

export interface Profile {
  name: string;
  skills: string[];
  education: { school: string; degree: string; gradYear: number | null }[];
  links: string[];
  resumeText: string;
  targetRoles: string[];
  locations: string[]; // preferred city names, e.g. "Tempe, US"
  radiusKm: number;
  workModes: ('remote' | 'hybrid' | 'onsite')[];
  availableFrom: string | null; // ISO date
  availableTo: string | null;
  interests: string[]; // ids from src/shared/interests.ts
  keywords: string[]; // free-text keywords
  companySizes: CompanySize[];
  paid: 'any' | 'paid' | 'unpaid';
  needsSponsorship: boolean;
}
