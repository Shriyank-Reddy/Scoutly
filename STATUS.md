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
- Lighthouse (headless Chromium, default mobile emulation, built site on a local preview server, Search page): **Performance 94, Accessibility 100, Best Practices 100** (FCP 2.1 s, LCP 2.3 s, TBT 100 ms). Re-run on the deployed site; real numbers will differ.

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
