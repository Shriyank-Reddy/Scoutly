// Types shared by the data pipeline (Node) and the website (browser).
export type SourceName = 'greenhouse' | 'lever' | 'ashby';
export type WorkMode = 'onsite' | 'hybrid' | 'remote' | 'unknown';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Engagement = 'co-op' | 'part-time';
export type PaidStatus = 'paid' | 'unpaid' | 'unknown';

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
}

export interface CompanySeed {
  name: string;
  source: SourceName;
  slug: string;
  category: string;
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
  paid: 'any' | 'paid';
  needsSponsorship: boolean;
}
