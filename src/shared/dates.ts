import type { Engagement, Season } from './types';

export interface TermInfo {
  season: Season | null;
  seasonYear: number | null;
  startDate: string | null;
  endDate: string | null;
  engagement: Engagement[];
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const MON_RE =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthIdx = (s: string) => MONTHS.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3)));
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Approximate season windows used ONLY for overlap checks, never shown as the posting's stated dates. */
export const SEASON_WINDOWS: Record<Season, [number, number]> = {
  spring: [0, 4],
  summer: [4, 8],
  fall: [8, 12],
  winter: [11, 14],
};

/** Extract season/year/dates only when the text states them. `postedYear` helps for "Summer Internship" with no year. */
export function extractTerm(title: string, text: string): TermInfo {
  const t = `${title}\n${text.slice(0, 6000)}`;
  const info: TermInfo = {
    season: null,
    seasonYear: null,
    startDate: null,
    endDate: null,
    engagement: [],
  };

  if (
    /\bco-?ops?\b/i.test(title) ||
    /\bco-?op (position|term|program|role)\b/i.test(text.slice(0, 1500))
  )
    info.engagement.push('co-op');
  if (
    /\bpart[- ]time\b/i.test(title) ||
    /\bpart[- ]time (internship|position|role|basis)/i.test(text.slice(0, 1500))
  )
    info.engagement.push('part-time');

  // Season + year, in the title first (most reliable), then body.
  const seasonRe =
    /\b(spring|summer|fall|autumn|winter)\s*(?:semester|term|quarter)?\s*,?\s*(?:of\s*)?['’]?(\d{4}|\d{2})?\b/i;
  const pick = (s: string) => {
    const m = s.match(seasonRe);
    if (!m) return false;
    const sea = m[1].toLowerCase();
    info.season = (sea === 'autumn' ? 'fall' : sea) as Season;
    if (m[2]) info.seasonYear = m[2].length === 2 ? 2000 + +m[2] : +m[2];
    return true;
  };
  if (!pick(title)) pick(text.slice(0, 3000));
  if (info.season && !info.seasonYear) {
    const y = t.match(new RegExp(`${info.season}[^.\\n]{0,30}?(20\\d{2})`, 'i'));
    if (y) info.seasonYear = +y[1];
  }

  // Explicit ranges: "May 2027 - August 2027", "June to August 2027", "starting June 1, 2027".
  const range = t.match(
    new RegExp(
      `\\b${MON_RE}\\.?\\s*(20\\d{2})?\\s*(?:-|–|—|to|through|until)\\s*${MON_RE}\\.?\\s*,?\\s*(20\\d{2})`,
      'i',
    ),
  );
  if (range) {
    const y2 = +range[4];
    const y1 = range[2] ? +range[2] : monthIdx(range[1]) > monthIdx(range[3]) ? y2 - 1 : y2;
    const m1 = monthIdx(range[1]),
      m2 = monthIdx(range[3]);
    info.startDate = iso(y1, m1, 1);
    info.endDate = iso(y2, m2, lastDay(y2, m2));
  } else {
    const start = t.match(
      new RegExp(
        `\\b(?:start(?:s|ing)?|begin(?:s|ning)?|commenc\\w+)\\s*(?:date)?[^.\\n]{0,25}?${MON_RE}\\.?\\s*(\\d{1,2})?(?:st|nd|rd|th)?,?\\s*(20\\d{2})`,
        'i',
      ),
    );
    if (start) info.startDate = iso(+start[3], monthIdx(start[1]), start[2] ? +start[2] : 1);
  }
  if (!info.seasonYear && info.startDate) info.seasonYear = +info.startDate.slice(0, 4);
  return info;
}

/** The [start, end) window in ms we can reasonably say a listing covers, or null if unknown. */
export function listingWindow(l: {
  season: Season | null;
  seasonYear: number | null;
  startDate: string | null;
  endDate: string | null;
}): [number, number] | null {
  if (l.startDate) {
    const s = Date.parse(l.startDate);
    const e = l.endDate ? Date.parse(l.endDate) : s + 100 * 864e5;
    return [s, e];
  }
  if (l.season && l.seasonYear) {
    const [a, b] = SEASON_WINDOWS[l.season];
    return [Date.UTC(l.seasonYear, a, 1), Date.UTC(l.seasonYear, b, 1)];
  }
  return null;
}

/** 0..1 overlap of the user's availability with the listing window; null when unknown. */
export function dateFit(
  l: Parameters<typeof listingWindow>[0],
  from: string | null,
  to: string | null,
): number | null {
  const w = listingWindow(l);
  if (!w || !from || !to) return null;
  const a = Date.parse(from),
    b = Date.parse(to);
  const overlap = Math.min(w[1], b) - Math.max(w[0], a);
  if (overlap <= 0) return 0;
  return Math.min(1, overlap / Math.max(1, Math.min(w[1] - w[0], b - a)));
}
