# Learning guide: explaining Scoutly in an interview

For each part: what it does, the core idea, the file to read first, and what breaks without it.

## 1. Pipeline

- **What**: once a day, fetch every company's public job board and write two JSON files.
- **Core idea**: do the slow, network-heavy work _ahead of time_ (build time), so the website is just static files. Be polite: cache, rate-limit, back off.
- **Read first**: `pipeline/run.ts`, then `pipeline/http.ts`.
- **Without it**: no data, or a server/CORS problem (these APIs are not meant to be called by every visitor's browser).

## 2. Normalisation

- **What**: three vendors, three JSON shapes, become one `Listing`. Keep only internship-like roles. Merge duplicates.
- **Core idea**: an _adapter per source_ converts to one shared type; everything after that code does not care where a job came from. Rules are text rules (regex), and _unknown stays unknown_.
- **Read first**: `src/shared/types.ts`, `pipeline/adapters/greenhouse.ts`, `src/shared/normalise.ts`.
- **Without it**: the UI would need `if (source === ...)` everywhere, and "Senior Manager" roles would flood results.

## 3. Geocoding

- **What**: turn "Bengaluru, Karnataka, India" into a place with latitude/longitude, offline.
- **Core idea**: a bundled table of ~3.8k cities (GeoNames) plus rules: peel the country off the end, then the state, then look up the city and pick the match in that country/state, else the biggest city. Distance uses the haversine formula (great-circle distance).
- **Read first**: `src/shared/locations.ts`, then `tests/extract.test.ts`.
- **Without it**: no radius search, no map pins, or you would depend on a paid/limited geocoding API.

## 4. Resume parsing

- **What**: read a PDF/DOCX in the browser and pull out skills, education, grad year and links.
- **Core idea**: `pdfjs-dist` and `mammoth` turn files into plain text locally; a dictionary of skills with aliases (JS → JavaScript) plus a few regexes do the extraction. No AI, no upload.
- **Read first**: `src/lib/resume.ts`, `src/shared/skills.ts`.
- **Without it**: users would type everything by hand, or you would need a server (a privacy problem).

## 5. Matching

- **What**: a 0–100% score with reasons.
- **Core idea**: five transparent parts, each 0..1, combined by weights in one config file. Skills use weighted overlap; role similarity uses **BM25** (a TF-IDF-style ranking function that rewards rare words and normalises for length); location uses distance vs radius; date uses window overlap; recency decays. Unknown → neutral 0.5, never a penalty.
- **Read first**: `src/config/weights.ts`, `src/lib/match.ts`, `tests/match.test.ts`.
- **Without it**: a flat list the user must read manually; or a black-box score nobody can trust.

## 6. State and storage

- **What**: profile, tracker and filters.
- **Core idea**: React context holds profile/tracker and mirrors them into `localStorage` (wrapped in try/catch because private windows can throw). Filters live in the **URL**, so views are shareable and the back button works. Nothing leaves the browser.
- **Read first**: `src/state/AppState.tsx`, `src/lib/storage.ts`, `src/lib/filters.ts`.
- **Without it**: the profile vanishes on refresh; or you would need accounts and a database (and privacy risk).

## 7. Deployment

- **What**: GitHub Pages hosts `dist/`; GitHub Actions rebuilds daily.
- **Core idea**: static site + scheduled job = free hosting with fresh data. `HashRouter` and `base: './'` make it work under a sub-path. "Strict" refresh keeps the last good site if fetching fails.
- **Read first**: `.github/workflows/deploy.yml`, `vite.config.ts`.
- **Without it**: stale data, or paying for a server.

## 15 likely interview questions

1. **Why a static site and a data pipeline instead of a backend?** Free hosting, fast, nothing to secure or scale. Job data changes slowly, so a daily snapshot is enough; the privacy promise is easy because there is no server to send data to.
2. **Why not just call the job APIs from the browser?** Every visitor would hit the vendors' servers (impolite, maybe rate-limited), CORS may block it, and the slow work would repeat for each user. One daily fetch is cheaper for everyone.
3. **Why not scrape LinkedIn or Indeed?** Their terms forbid it and it is brittle and unethical for a public project. Greenhouse/Lever/Ashby publish these APIs for exactly this use.
4. **How do you keep your fetching polite?** Rate limit, disk cache, exponential backoff, a User-Agent naming the project, one run per day, and I store only a snippet.
5. **What is the shared `Listing` type for?** It is the contract between pipeline and site. Both import it, so TypeScript catches drift.
6. **How does the adapter pattern help?** Each source has its own parser to the same shape; adding a fourth source means one new file and tests, no UI changes.
7. **How do you decide a job is an internship?** Title must contain intern/co-op/apprentice/placement/working student etc., and must not contain senior/manager/etc. "Student" alone needs a supporting word. Tested with real-looking titles.
8. **How does the match score work?** Five parts from 0 to 1 (skills .40, role .20, location .20, dates .15, recency .05) multiplied by weights and summed; chips show the strongest reasons.
9. **What is BM25 and why use it?** A ranking function like TF-IDF that also saturates repeated terms and normalises by document length. It is simple, local, and good for short texts like titles.
10. **How do you handle unknown dates?** Never guess. They show "Dates not stated", score a neutral 0.5, and the availability filter never hides them.
11. **How does the city/radius search work?** Each listing's location string is geocoded against a bundled city table at pipeline time; the browser computes haversine distance to the chosen city and keeps those within the radius.
12. **What are the work-authorization flags and their limits?** Regex text matches ("no sponsorship", "U.S. citizen", "clearance", "CPT/OPT") shown as "Mentions: …". They are not a legal determination, and the UI says so.
13. **How is the resume kept private?** Parsed entirely in the browser with pdfjs/mammoth; stored only in localStorage; no analytics or network calls with it; a delete button wipes it.
14. **How did you test it?** Vitest for extraction, filters, matching and the pipeline using fixture files (no network in tests), plus a Playwright smoke test of upload → rank → save → delete.
15. **What are the limits and what would you improve?** Coverage is only companies on those three platforms; sparse structured dates/pay; heuristic parsing can miss. Next: verify/expand the company list, add more sources with permissive terms, improve resume parsing, add saved searches.
