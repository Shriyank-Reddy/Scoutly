import type { CompanySeed, RawJob } from '../../src/shared/types';
import { htmlToText } from '../../src/shared/text';

export const greenhouseUrl = (slug: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  content?: string;
  offices?: { name?: string }[];
}

export function parseGreenhouse(json: unknown, seed: CompanySeed): RawJob[] {
  const jobs = (json as { jobs?: GhJob[] })?.jobs;
  if (!Array.isArray(jobs))
    throw new Error('Greenhouse: unexpected response shape (no "jobs" array)');
  return jobs.map((j) => ({
    source: 'greenhouse',
    sourceId: String(j.id),
    company: seed.name,
    title: j.title,
    url: j.absolute_url,
    locationTexts: [j.location?.name ?? ''].filter(Boolean),
    remoteHint: j.location?.name ? /remote/i.test(j.location.name) || null : null,
    text: htmlToText(j.content ?? ''),
    companySize: seed.size ?? null,
 postedAt: j.first_published ?? j.updated_at ?? null,
  }));
}
