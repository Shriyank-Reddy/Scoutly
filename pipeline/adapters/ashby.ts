import type { CompanySeed, RawJob } from '../../src/shared/types';
import { htmlToText } from '../../src/shared/text';

export const ashbyUrl = (slug: string) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`;

interface AbJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  jobUrl: string;
  isListed?: boolean;
}

export function parseAshby(json: unknown, seed: CompanySeed): RawJob[] {
  const jobs = (json as { jobs?: AbJob[] })?.jobs;
  if (!Array.isArray(jobs)) throw new Error('Ashby: unexpected response shape (no "jobs" array)');
  return jobs
    .filter((j) => j.isListed !== false)
    .map((j) => ({
      source: 'ashby',
      sourceId: j.id,
      company: seed.name,
      title: j.title,
      url: j.jobUrl,
      locationTexts: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(
        (x): x is string => !!x,
      ),
      remoteHint:
        j.workplaceType === 'Remote' || j.isRemote === true
          ? true
          : j.workplaceType === 'OnSite'
            ? false
            : null,
      text: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ''),
      companySize: seed.size ?? null,
 postedAt: j.publishedAt ?? null,
    }));
}
