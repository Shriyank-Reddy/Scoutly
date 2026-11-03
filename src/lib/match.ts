import type { Listing, Profile } from '../shared/types';
import { SKILL_WEIGHT } from '../shared/skills';
import { dateFit } from '../shared/dates';
import { findCityByKey, minDistanceKm } from '../shared/locations';
import { FRESH_DAYS, MODE_MISMATCH, NEUTRAL, SKILL_COVERAGE_CAP, STALE_DAYS, WEIGHTS } from '../config/weights';

export interface MatchResult {
  score: number; // 0..1
  parts: { skills: number; role: number; location: number; date: number; recency: number };
  reasons: { kind: 'skills' | 'role' | 'location' | 'date' | 'recency'; text: string; good: boolean }[];
  matchedSkills: string[];
}

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'at', 'we', 'you', 'our', 'is', 'are', 'be', 'as', 'by']);
export const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 1 && !STOP.has(t));

/** A tiny BM25 index over listings' title (counted twice) + snippet. */
export function buildBm25(docs: string[], k1 = 1.5, b = 0.75) {
  const tokens = docs.map(tokenize);
  const avg = tokens.reduce((n, t) => n + t.length, 0) / Math.max(1, tokens.length);
  const df = new Map<string, number>();
  for (const t of tokens) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const N = tokens.length;
  return (query: string[]): number[] =>
    tokens.map((t) => {
      const tf = new Map<string, number>();
      for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
      let s = 0;
      for (const q of new Set(query)) {
        const f = tf.get(q) ?? 0;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(q) ?? 0) + 0.5) / ((df.get(q) ?? 0) + 0.5));
        s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avg));
      }
      return s;
    });
}

const DAY = 864e5;
export function recencyScore(postedAt: string | null, now: number): number {
  if (!postedAt) return 0.3;
  const days = (now - Date.parse(postedAt)) / DAY;
  if (!(days >= 0)) return 1;
  if (days <= FRESH_DAYS) return 1;
  return Math.max(0, 1 - (days - FRESH_DAYS) / (STALE_DAYS - FRESH_DAYS));
}

export const hasProfileSignal = (p: Profile) => p.skills.length > 0 || p.targetRoles.length > 0 || p.locations.length > 0;

export function locationScore(l: Listing, p: Profile): { value: number; reason: string | null; good: boolean } {
  const modeOk = (m: Listing['workMode']) => m === 'unknown' || p.workModes.length === 0 || p.workModes.includes(m);
  const penalty = modeOk(l.workMode) ? 1 : MODE_MISMATCH;
  const wantsRemote = p.workModes.length === 0 || p.workModes.includes('remote');
  if (l.workMode === 'remote') {
    return wantsRemote ? { value: 1, reason: 'Remote', good: true } : { value: 0.3, reason: null, good: false };
  }
  const cities = p.locations.map(findCityByKey).filter((c): c is NonNullable<typeof c> => !!c);
  if (cities.length === 0) return { value: NEUTRAL * penalty, reason: null, good: false };
  let best: { d: number; city: string } | null = null;
  for (const c of cities) {
    const d = minDistanceKm(l.locations, c.lat, c.lon);
    if (d !== null && (!best || d < best.d)) best = { d, city: c.name };
  }
  if (!best) return { value: 0.2 * penalty, reason: null, good: false };
  const within = best.d <= p.radiusKm;
  const value = within ? (1 - 0.3 * (best.d / Math.max(1, p.radiusKm))) * penalty : Math.max(0, 0.2 - best.d / 20000) * penalty;
  return { value, reason: within ? (best.d < 5 ? `In ${best.city}` : `${Math.round(best.d)} km from ${best.city}`) : null, good: within };
}

export function scoreListings(listings: Listing[], profile: Profile, now = Date.now()): Map<string, MatchResult> {
  const bm25 = buildBm25(listings.map((l) => `${l.title} ${l.title} ${l.snippet}`));
  const query = tokenize(profile.targetRoles.length ? profile.targetRoles.join(' ') : profile.skills.join(' '));
  const raw = query.length ? bm25(query) : [];
  const maxRaw = Math.max(0, ...raw);
  const mine = new Set(profile.skills);
  const out = new Map<string, MatchResult>();

  listings.forEach((l, i) => {
    const reasons: MatchResult['reasons'] = [];
    const matchedSkills = l.skills.filter((s) => mine.has(s));
    const total = l.skills.reduce((n, s) => n + (SKILL_WEIGHT.get(s) ?? 1), 0);
    const got = matchedSkills.reduce((n, s) => n + (SKILL_WEIGHT.get(s) ?? 1), 0);
    const skills = l.skills.length === 0 ? (profile.skills.length ? 0.2 : 0) : Math.min(1, got / Math.min(total, SKILL_COVERAGE_CAP));
    if (matchedSkills.length) reasons.push({ kind: 'skills', text: `Skills: ${matchedSkills.slice(0, 4).join(', ')}${matchedSkills.length > 4 ? ` +${matchedSkills.length - 4}` : ''}`, good: true });

    const role = !query.length ? NEUTRAL : maxRaw > 0 ? raw[i] / maxRaw : 0;
    if (query.length && role >= 0.6 && profile.targetRoles.length) reasons.push({ kind: 'role', text: 'Fits your target roles', good: true });

    const loc = locationScore(l, profile);
    if (loc.reason) reasons.push({ kind: 'location', text: loc.reason, good: loc.good });

    const fit = dateFit(l, profile.availableFrom, profile.availableTo);
    const date = fit ?? NEUTRAL;
    if (fit === null) reasons.push({ kind: 'date', text: l.season || l.startDate ? 'Dates not checked' : 'Dates not stated', good: false });
    else if (fit > 0) reasons.push({ kind: 'date', text: fit > 0.6 ? 'Fits your availability' : 'Partly fits your availability', good: true });
    else reasons.push({ kind: 'date', text: 'Outside your availability', good: false });

    const recency = recencyScore(l.postedAt, now);
    const days = l.postedAt ? Math.floor((now - Date.parse(l.postedAt)) / DAY) : null;
    if (days !== null && days <= FRESH_DAYS) reasons.push({ kind: 'recency', text: days <= 0 ? 'Posted today' : `Posted ${days}d ago`, good: true });

    const parts = { skills, role, location: loc.value, date, recency };
    const score = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce((n, k) => n + WEIGHTS[k] * parts[k], 0);
    out.set(l.id, { score: Math.max(0, Math.min(1, score)), parts, reasons, matchedSkills });
  });
  return out;
}
