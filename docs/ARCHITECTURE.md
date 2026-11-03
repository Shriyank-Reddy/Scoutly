# Architecture

```
 data/companies.json ──┐
 (source + board slug) │      GitHub Actions (daily, and on push)
                       ▼
        ┌──────────────────────────┐      ┌─────────────────────────┐
        │  pipeline/  (Node + tsx) │      │  public/data/           │
        │  fetch → parse → filter  │ ───▶ │   listings.json         │
        │  → normalise → dedupe    │      │   meta.json             │
        └──────────────────────────┘      └───────────┬─────────────┘
              ▲ shares types + logic                  │  static files
              │                                       ▼
        ┌──────────────────────────┐      ┌─────────────────────────┐
        │  src/shared/  (pure TS)  │ ◀──▶ │  src/  React site       │
        │  locations, dates, skills│      │  match • filter • map   │
        └──────────────────────────┘      │  profile & tracker in   │
                                          │  localStorage (browser) │
                                          └───────────┬─────────────┘
                                                      ▼
                                              GitHub Pages (static)
```

Nothing runs on a server. The pipeline produces JSON once a day; the browser downloads it, and everything personal (resume, profile, tracker, scoring) happens locally.

## Modules

**`pipeline/run.ts`**: the command behind `npm run fetch-jobs`. Reads the seed list, loads each board (live, or fixtures with `--fixtures`), records per-board failures, and writes `public/data/listings.json` and `meta.json`. `--verify` only checks which board slugs work.

**`pipeline/adapters/*`**: one small parser per source (Greenhouse, Lever, Ashby). Each turns that vendor's JSON into the same `RawJob` shape and throws a clear error if the response shape is unexpected.

**`pipeline/http.ts`**: polite fetching: disk cache, 400 ms rate limit, exponential backoff retries, User-Agent, early abort when offline.

**`pipeline/build.ts`**: pure functions that keep internship-like roles, normalise, dedupe and build `meta.json`. Easy to test because no I/O happens here.

**`src/shared/types.ts`**: `Listing`, `Profile`, `Meta` and friends, used by both pipeline and site so the JSON contract cannot drift.

**`src/shared/internship.ts` / `normalise.ts`**: the include/exclude title rules, and the conversion from `RawJob` to `Listing` (plus dedupe).

**`src/shared/locations.ts`**: parses messy location strings ("Hybrid - Seattle, WA", "Bangalore") against the bundled GeoNames cities, with aliases, country/state peeling, haversine distance and a typeahead search.

**`src/shared/dates.ts`, `workmode.ts`, `authflags.ts`, `skills.ts`**: text extraction. Season/year/date ranges (never guessed), remote/hybrid/in-person, work-authorization phrases (text matches only), and a skills dictionary with aliases.

**`src/lib/match.ts` + `src/config/weights.ts`**: the scoring model. Five parts in 0..1: skills 0.40, role/keywords (BM25) 0.20, location 0.20, dates 0.15, recency 0.05. Weights, neutral value and decay constants live only in `weights.ts`. Each result carries reason chips.

**`src/lib/filters.ts`**: the filter state, its round-trip to URL query params, and `applyFilters`.

**`src/lib/resume.ts`**: PDF (pdfjs-dist), DOCX (mammoth) and text reading in the browser, then `parseResumeText` which extracts name, skills, education, graduation year and links.

**`src/lib/storage.ts` / `tracker.ts`**: try/catch-wrapped localStorage, "Delete all my data", tracker stages and injection-safe CSV export.

**`src/state/AppState.tsx`**: one React context: loads the JSON, holds profile and tracker, and computes scores.

**`src/pages/*`, `src/components/*`**: Search (rail + virtualised list + drawer), City (picker, radius, list + clustered Leaflet map kept in sync), Profile, Tracker.

**`.github/workflows/*`**: `deploy.yml` tests, fetches, builds and publishes to Pages; `refresh-data.yml` calls it daily in strict mode.
