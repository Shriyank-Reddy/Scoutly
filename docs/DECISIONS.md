# Decision log

One line per decision: what, and why. Newest last.

- **Network blocked for job APIs in the build environment** (HTTP 403 from the sandbox proxy). Fixtures in `tests/fixtures/` are therefore hand-written to match the documented Greenhouse / Lever / Ashby response shapes, NOT recorded from live APIs. Their companies are fictional and suffixed "(sample)". The deployed site is labelled "Sample data" until a live run succeeds.
- **`data/companies.json` has 200 seed boards, none verified from here** (could not fetch). Unverified slugs fail with a 404 at run time, are skipped, and are listed in `meta.json` → `boardsFailed`. Run `npm run verify-slugs` (writes `data/slug-report.json`) from a networked machine or the refresh workflow, then prune. Over 150 on purpose, because some will be dropped.
- **Pipeline falls back to sample fixtures** when no board at all is reachable (local dev), but the daily workflow passes `--no-fallback` so a bad day never replaces real data with samples.
- **Vite + React + TypeScript, Tailwind CSS v4** (`@tailwindcss/vite`, tokens in `@theme` in `src/index.css`): least config, one place for the palette.
- **react-router-dom with HashRouter**: GitHub Pages cannot rewrite unknown paths to `index.html`, so hash URLs keep deep links and URL-synced filters working.
- **@tanstack/react-virtual** as the list virtualiser (small, headless, well known).
- **leaflet.markercluster** for pin clustering (the official Leaflet plugin). Leaflet is used directly, not via react-leaflet, to avoid one more dependency.
- **`all-the-cities` (dev dependency only)** is the source for the bundled city list (GeoNames, CC BY 4.0). `scripts/build-cities.ts` writes `src/data/cities.json` once; the app does not import the package. Cut-offs: population ≥ 50k for US/CA/GB/IN/DE/AU, ≥ 250k elsewhere, to keep the file ~160 KB (Lighthouse). Small towns are not geocoded: their listings keep the city text but no pin.
- **`tsx`** runs the TypeScript pipeline with Node and shares `src/shared` types with the site.
- **Fonts**: Sora (display), Inter (body), JetBrains Mono (data labels), loaded non-blocking with system fallbacks.
- **localStorage, not IndexedDB** for profile + tracker: data is tiny, access is synchronous, and every call is wrapped in try/catch.
- **Playwright is not a project dependency.** The smoke test (`npm run e2e`) uses the Playwright already installed in the environment; it is skipped in CI.
- **Unknown stays unknown**: no season is inferred from a start date; unknown dates/pay/work mode are labelled "not stated" and score a neutral 0.5 rather than a penalty.
- **Date fit uses approximate season windows** (Summer = May–Aug, Fall = Sep–Dec, etc.) only to compute overlap with the user's availability; the UI only ever shows dates the posting states.
- **Dedupe key** = company + normalised title + first 80 chars of snippet; same job in several cities becomes one listing with several locations.
- **"Student" alone is not enough** to count as an internship (avoids "Student Loan Specialist"); it needs a supporting word.
- **`needsSponsorship` does not change scores**; it shows a notice and an optional one-click hide for postings whose text mentions no sponsorship / citizenship / clearance. Keeps scoring explainable.
- **Committed sample `public/data/`** so a fresh clone renders; the deploy workflow overwrites it on every run.
- **License**: kept MIT; copyright line set to "Shriyank Reddy Singireddy".
- **Prettier ignores `public/data` and the lockfile**; ESLint/Prettier run on source only.
- **Company size is curated metadata, not scraped**: `size` per company in `data/companies.json` (large for well-known big employers, startup for AI/startup categories, otherwise mid). It is approximate and labelled "(approx.)" in the UI; sample companies got hand-set sizes.
- **Match weights changed** to add a `prefs` part (pay, size, sponsorship): skills .35, role .20, location .18, date .12, prefs .10, recency .05. Parts for preferences the user did not set are neutral (0.5).
- **`lucide-react`** added as the single icon set for the UI.
- **UI pass**: fonts are now IBM Plex Sans (text) and IBM Plex Mono (dates, locations, scores, chips) in place of Sora/Inter/JetBrains Mono; tokens still live in `src/index.css`. Radii 4-6 px, 1 px borders, no shadows, four type sizes (12/14/16/20), 4 px spacing scale, accent only on primary buttons, focus, active filters and the score ring. Phone gets a bottom tab bar, bottom-sheet filters and a sticky search field.
- **Interest chips use whole-word keyword matching** (e.g. "ai" must not match inside "fair"), title hits count fully and snippet-only hits 0.6.
