# STATUS

Map of the repo for restarts. Read this and `docs/DECISIONS.md` first.

## Done (M0–M8)

- M0 scaffold: Vite + React + TS + Tailwind v4, Vitest, ESLint, Prettier, theme tokens (`src/index.css`), routes Search/City/Profile/Tracker, docs.
- M1 pipeline: adapters (Greenhouse/Lever/Ashby), fixtures, internship filter, normalise, dedupe, `meta.json`, polite HTTP (cache, rate limit, backoff, UA).
- M2 extraction: location parsing + offline geocoding, radius, work mode, season/dates, work-authorization flags, skills.
- M3 profile: PDF/DOCX/text parsing in browser, editable profile, preferences, localStorage, Delete all my data.
- M4 matching/search: scoring + reason chips, filters synced to URL, virtualised list, detail drawer.
- M5 city view: city picker + radius, clustered Leaflet map synced with list.
- M6 tracker: board, notes, follow-up dates, CSV export.
- M7 polish: skeletons, motion (reduced-motion safe), shortcuts, empty states, phone layout (no horizontal scroll at 375 px), focus rings.
- M8 deploy/docs: `deploy.yml`, `refresh-data.yml`, README, ARCHITECTURE, DATA_SOURCES, DECISIONS, LEARNING.

## Quality checks (last run)

- `npm test`: 74 tests pass. `npm run lint`, `npm run typecheck`, `npm run build`: clean.
- Playwright smoke test (`npm run e2e`): upload/paste resume → ranked results → drawer → save → tracker → delete all data: passes.
- Lighthouse (round 1, Start page; headless Chromium, default mobile emulation, built site on a local preview server, Search page): **Performance 94, Accessibility 100, Best Practices 100** (FCP 2.1 s, LCP 2.3 s, TBT 100 ms). Re-run on the deployed site; real numbers will differ.

## What does NOT work yet / honest caveats

- **No live data has ever been fetched.** The build environment's network returned HTTP 403 for the job APIs. All fixtures are hand-written to match the documented API shapes (not recorded), with fictional "(sample)" companies. `public/data/` therefore contains sample output and the site shows a "Sample data" banner (`meta.isSample`).
- **`data/companies.json` (200 boards) is unverified.** Slugs were written from memory; expect many 404s on the first live run. They are skipped and listed in `meta.json → boardsFailed`. Run `npm run verify-slugs` (writes `data/slug-report.json`) and prune.
- No README statistics are quoted: there is no real pipeline output yet.
- Map tiles could not be loaded in the sandbox, so the map was only verified for markers/radius, not tile rendering.
- Tracker moves stages via a dropdown (no drag-and-drop).

## Cuts from the "cut if running long" list

None. Clustering, Playwright smoke test, keyboard shortcuts, CSV export and Ashby support are all included.

## Known issues

- Main JS bundle ≈ 440 kB (160 kB gzip) because the city table is bundled; PDF/DOCX libraries load only when a resume is uploaded.
- Location strings for cities outside the bundled list keep their text but have no coordinates, so they never appear in radius searches.

## Commands

```bash
npm ci
npm run fetch-jobs -- --fixtures   # offline sample data
npm run fetch-jobs                 # live (falls back to sample if unreachable)
npm run verify-slugs               # check which board slugs exist
npm run dev | npm test | npm run lint | npm run typecheck | npm run build
npm run preview -- --port 4173 & npm run e2e
```

## Remaining manual steps

1. Push to GitHub (repo stays private/public as you choose; do not change visibility via automation).
2. Settings → Pages → Source: **GitHub Actions**.
3. Run **Actions → Refresh data → Run workflow** once. If it fails with "No board could be fetched", check the log; if boards 404, prune `data/companies.json` using `data/slug-report.json` from `npm run verify-slugs`.
4. Once a live run succeeds, the banner disappears automatically. Add the live URL and screenshots to the README.

## Round 2 (priority list)

- [x] 1. Resume first: home page (`/`) is a large drop zone (PDF/DOCX, or "Paste text instead"), parse progress, editable summary (name, school, degree, grad year, skills, links), privacy line directly under it. Search moved to `/search`.
- [x] 2. Personalisation: interest chips (Software, AI/ML, Security, Data, Product, Design, Research) + free-text keywords; work mode, pay (either/paid/unpaid ok), month-picker availability, company size (approximate, curated per company in `data/companies.json`, not from postings), sponsorship/CPT-friendly. All feed the score (new `prefs` part, weights in `src/config/weights.ts`: skills .35, role/interests .20, location .18, dates .12, prefs .10, recency .05). Cards show matching preference chips; the drawer has a "Your preferences" check list (match / miss / unknown).
- [x] 3. Location search: one combobox (autocomplete from the offline city list and country names, keyboard navigable), multi-city selection, radius slider, quick chips Remote / Anywhere / top countries (from the loaded data). Filters, results, map pins (new List/Map toggle on Search) and the URL (`city=a;b`, `country=US,IN`, `remote=1`, `r=`, `view=map`) update together.
- [x] 4. UI pass: IBM Plex Sans/Mono, near-black + one electric-blue accent used only for primary actions, focus, active filters and the score ring; 1 px borders, 4-6 px radii, no shadows, four type sizes, Lucide icons (no emoji), mono for data, skeletons with the real card geometry (no layout shift), virtualised list, shortcuts (`/`, `j`/`k`, `Esc`), reduced-motion safe. Phone: bottom tab bar, bottom-sheet filters, sticky header with search, 44 px tap targets, no horizontal scroll at 375/390 px. Screenshots (desktop 1440 + phone 390, 2x) are in `docs/screenshots/`.

## Round 2 checks

- 85 tests pass; lint, typecheck, build clean; Playwright smoke test passes (home → paste resume → preferences → location search + map toggle → rank → save → tracker → delete all).
- Lighthouse on `/#/search` (local preview, mobile emulation): Performance 83, Accessibility 100, Best Practices 100 (FCP 2.4 s, LCP 3.2 s, TBT 300 ms, CLS 0.048). Lower than round 1 because that run measured the lighter Start page and this one loads the Search page's chunks. Not tuned yet.
- Still no live data (job APIs unreachable from the build sandbox); site shows the Sample data banner. Map tiles could not load in the sandbox, so the screenshots show no basemap.

## Round 3: maximum coverage

- [x] A. Discovery: `npm run discover` (`pipeline/discover.ts`), weekly PR workflow (`.github/workflows/discover.yml`; needs the repo setting "Allow GitHub Actions to create and approve pull requests"). Only licence-permitted lists are used (see `docs/DATA_SOURCES.md`); only one qualifying list was found (MIT, redirect links), others have no licence and are skipped. Tested offline with fake fetch (9 tests). **Live outcome:** licence check passed against GitHub; the redirect host was unreachable from the build sandbox, so 0 boards resolved here. First real discovery run happens on GitHub.
- [x] B. Aggregators: Adzuna (env keys `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`, skipped and logged when missing), Remotive, Arbeitnow adapters with fixtures and tests (`pipeline/adapters/aggregators.ts`, `pipeline/aggregators.ts`). "via <source>" label on listings and in the drawer, credit footer + Start page + README. Dedupe by normalised company + title + city across all sources, ATS copy wins (`dedupeAcrossSources`); the first-stage merge is now per source. `meta.json` has per-source and per-country counts and an `aggregators` status list. Terms recorded in `docs/DATA_SOURCES.md`. **Not verified live** (sandbox cannot reach these APIs): fixtures are hand-written to the documented shapes. To enable Adzuna: add repo secrets `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`.
- [x] C. "Search on…" buttons (LinkedIn, Internshala, Handshake, Indeed) on Search and City, pre-filled from the current role keywords and location; templates live only in `src/config/externalSearch.ts` (plain links, never fetched). Tracker "Add from link": paste any http(s) URL, site detected from the domain (no fetch), user types title and company, saved like any tracked listing (CSV has a Site column).
