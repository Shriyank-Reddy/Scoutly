import type { RawJob } from '../../src/shared/types';
import { htmlToText } from '../../src/shared/text';

// ---- Adzuna: https://developer.adzuna.com/ (free app_id + app_key) --------------------------------------------
export const ADZUNA_COUNTRIES = ['us', 'gb', 'in', 'ca', 'au', 'de', 'fr', 'nl', 'sg'] as const;
const ADZUNA_COUNTRY_NAME: Record<string, string> = {
  us: 'United States',
  gb: 'United Kingdom',
  in: 'India',
  ca: 'Canada',
  au: 'Australia',
  de: 'Germany',
  fr: 'France',
  nl: 'Netherlands',
  sg: 'Singapore',
};
const ADZUNA_CURRENCY: Record<string, string> = {
  us: '$',
  gb: '£',
  in: '₹',
  ca: '$',
  au: '$',
  de: '€',
  fr: '€',
  nl: '€',
  sg: '$',
};

/** `appId`/`appKey` come from environment variables, never from code. The key is a query parameter of the API. */
export const adzunaUrl = (country: string, page: number, appId: string, appKey: string) =>
  `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=50&what_or=${encodeURIComponent('intern internship coop')}&sort_by=date&max_days_old=120&content-type=application/json`;

interface AzJob {
  id: string | number;
  title: string;
  description?: string;
  created?: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
}

export function parseAdzuna(json: unknown, country: string): RawJob[] {
  const results = (json as { results?: AzJob[] })?.results;
  if (!Array.isArray(results))
    throw new Error('Adzuna: unexpected response shape (no "results" array)');
  const cur = ADZUNA_CURRENCY[country] ?? '';
  return results.map((j) => {
    // Adzuna's salary is often a model estimate (is_predicted = 1). Only an actually stated salary counts as "pay stated".
    const stated = j.salary_min && String(j.salary_is_predicted) === '0';
    const pay = stated
      ? ` Salary: ${cur}${Math.round(j.salary_min!)}${j.salary_max ? ` - ${cur}${Math.round(j.salary_max)}` : ''} per year.`
      : '';
    return {
      source: 'adzuna',
      via: 'Adzuna',
      companySize: null,
      sourceId: String(j.id),
      company: j.company?.display_name?.trim() || 'Company not stated',
      title: j.title.replace(/<\/?strong>/g, ''),
      url: j.redirect_url,
      locationTexts: j.location?.display_name
        ? [`${j.location.display_name}, ${ADZUNA_COUNTRY_NAME[country] ?? ''}`.replace(/, $/, '')]
        : [],
      remoteHint: null,
      text: htmlToText(j.description ?? '') + pay,
      postedAt: j.created ?? null,
    } satisfies RawJob;
  });
}

// ---- Remotive: https://remotive.com/api/remote-jobs (keyless; asks for few requests and attribution) ----------
export const remotiveUrl = () => 'https://remotive.com/api/remote-jobs?search=intern';
interface RmJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  description?: string;
  publication_date?: string;
  salary?: string;
}

export function parseRemotive(json: unknown): RawJob[] {
  const jobs = (json as { jobs?: RmJob[] })?.jobs;
  if (!Array.isArray(jobs))
    throw new Error('Remotive: unexpected response shape (no "jobs" array)');
  return jobs.map((j) => ({
    source: 'remotive',
    via: 'Remotive',
    companySize: null,
    sourceId: String(j.id),
    company: j.company_name,
    title: j.title,
    url: j.url,
    locationTexts: [],
    remoteHint: true,
    text: [
      j.candidate_required_location
        ? `Remote. Location requirement: ${j.candidate_required_location}.`
        : 'Remote.',
      htmlToText(j.description ?? ''),
      j.salary ? `Salary: ${j.salary}` : '',
    ]
      .join('\n')
      .trim(),
    postedAt: j.publication_date
      ? new Date(
          j.publication_date.endsWith('Z') ? j.publication_date : j.publication_date + 'Z',
        ).toISOString()
      : null,
  }));
}

// ---- Arbeitnow: https://www.arbeitnow.com/api/job-board-api (keyless, Europe) ----------------------------------
export const arbeitnowUrl = (page: number) =>
  `https://www.arbeitnow.com/api/job-board-api?page=${page}`;
interface AnJob {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  location?: string;
  created_at?: number;
}

export function parseArbeitnow(json: unknown): RawJob[] {
  const data = (json as { data?: AnJob[] })?.data;
  if (!Array.isArray(data))
    throw new Error('Arbeitnow: unexpected response shape (no "data" array)');
  return data.map((j) => ({
    source: 'arbeitnow',
    via: 'Arbeitnow',
    companySize: null,
    sourceId: j.slug,
    company: j.company_name,
    title: j.title,
    url: j.url,
    locationTexts: j.location ? [j.location] : [],
    remoteHint: j.remote === true ? true : null,
    text: htmlToText(j.description ?? ''),
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
  }));
}
