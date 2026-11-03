// ALL matching knobs live here (documented in docs/ARCHITECTURE.md and the README).
// The five weights must add up to 1 so the final score is a clean 0..100%.
export const WEIGHTS = {
  skills: 0.4, // overlap between your skills and the skills the posting mentions
  role: 0.2, // BM25 similarity between your target roles and the title + snippet
  location: 0.2, // preferred cities / radius / remote / work-mode fit
  date: 0.15, // overlap of your availability window with the posting's dates
  recency: 0.05, // newer postings first
} as const;

/** Value used when a part cannot be judged (e.g. the posting states no dates). Neutral, not a penalty. */
export const NEUTRAL = 0.5;
/** A posting that lists many skills should not be unreachable: only this much skill weight is needed for a full score. */
export const SKILL_COVERAGE_CAP = 4;
/** Days since posting: full recency score up to FRESH_DAYS, falling linearly to 0 at STALE_DAYS. */
export const FRESH_DAYS = 14;
export const STALE_DAYS = 120;
/** Multiplier when the posting's known work mode is not one you selected. */
export const MODE_MISMATCH = 0.4;
