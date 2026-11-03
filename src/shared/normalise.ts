import type { Listing, RawJob } from './types';
import { makeSnippet } from './text';
import { parseLocations } from './locations';
import { detectWorkMode } from './workmode';
import { extractTerm } from './dates';
import { extractSkills } from './skills';
import { detectAuthFlags } from './authflags';

const PAY_RE =
  /(?:\$|€|£|₹)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|K))?(?:\s?(?:-|–|to)\s?(?:\$|€|£|₹)?\s?\d[\d,]*(?:\.\d+)?(?:\s?[kK])?)?\s?(?:\/\s?(?:hr|hour|yr|year|month|mo)|per (?:hour|year|month)|an hour|annually|hourly)?/;

/** Turn a RawJob into the shared Listing shape. Everything "stated" comes from the posting text. */
export function normalise(raw: RawJob): Listing {
  const text = raw.text;
  const locations = parseLocations(raw.locationTexts);
  const term = extractTerm(raw.title, text);
  const pay = text.match(PAY_RE);
  const payText =
    pay && /\d{2}/.test(pay[0]) && /\/|per|hour|year|annual|k\b|\d{3},\d{3}/i.test(pay[0])
      ? pay[0].trim()
      : null;
  const unpaid = /\bunpaid\b|\bvolunteer\b|\bnon-?paid\b/i.test(
    raw.title + ' ' + text.slice(0, 3000),
  )
    ? 'unpaid'
    : null;
  return {
    id: `${raw.source}:${raw.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${raw.sourceId}`,
    company: raw.company,
    title: raw.title.trim(),
    url: raw.url,
    locations,
    workMode: detectWorkMode(raw.locationTexts, raw.title, text, raw.remoteHint),
    season: term.season,
    seasonYear: term.seasonYear,
    startDate: term.startDate,
    endDate: term.endDate,
    engagement: term.engagement,
    postedAt: raw.postedAt,
    paid: unpaid ?? (payText ? 'paid' : 'unknown'),
    payText: unpaid ? null : payText,
    snippet: makeSnippet(text),
    skills: extractSkills(`${raw.title}\n${text}`),
    authFlags: detectAuthFlags(text),
    companySize: raw.companySize,
    via: raw.via,
    firstSeen: null,
    source: raw.source,
    sourceId: raw.sourceId,
  };
}

/** Merge listings that are the same job posted under several locations/sources. */
export function dedupe(listings: Listing[]): Listing[] {
  const map = new Map<string, Listing>();
  for (const l of listings) {
    const key = `${l.source}|${l.company.toLowerCase()}|${l.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()}|${(l.snippet || '').slice(0, 80).toLowerCase()}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...l, locations: [...l.locations] });
      continue;
    }
    const seen = new Set(prev.locations.map((p) => `${p.city}|${p.region}|${p.country}`));
    for (const p of l.locations)
      if (!seen.has(`${p.city}|${p.region}|${p.country}`)) prev.locations.push(p);
    if (prev.workMode === 'unknown') prev.workMode = l.workMode;
  }
  return [...map.values()];
}
