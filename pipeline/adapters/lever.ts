import type { CompanySeed, RawJob } from '../../src/shared/types';
import { htmlToText } from '../../src/shared/text';

export const leverUrl = (slug: string) => `https://api.lever.co/v0/postings/${slug}?mode=json`;

interface LvJob { id: string; text: string; hostedUrl: string; createdAt?: number; workplaceType?: string; descriptionPlain?: string; description?: string; additionalPlain?: string; categories?: { location?: string; allLocations?: string[] } }

export function parseLever(json: unknown, seed: CompanySeed): RawJob[] {
  if (!Array.isArray(json)) throw new Error('Lever: unexpected response shape (expected an array)');
  return (json as LvJob[]).map((j) => {
    const locs = j.categories?.allLocations?.length ? j.categories.allLocations : [j.categories?.location ?? ''];
    return {
      source: 'lever',
      sourceId: j.id,
      company: seed.name,
      title: j.text,
      url: j.hostedUrl,
      locationTexts: locs.filter(Boolean),
      remoteHint: j.workplaceType === 'remote' ? true : j.workplaceType === 'on-site' ? false : null,
      text: [j.descriptionPlain ?? htmlToText(j.description ?? ''), j.additionalPlain ?? ''].join('\n').trim(),
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    };
  });
}
