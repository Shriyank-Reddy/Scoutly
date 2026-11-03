# Data sources

Scoutly only reads **public, documented job-board APIs that companies publish for their own listings**. It never scrapes LinkedIn, Indeed, Handshake, Glassdoor or any site whose terms forbid it.

| Source                   | Endpoint                                                              | Auth              | What we read                                                                   |
| ------------------------ | --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| Greenhouse Job Board API | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` | none (public GET) | title, location, URL, updated date, description HTML                           |
| Lever Postings API       | `https://api.lever.co/v0/postings/{slug}?mode=json`                   | none (public GET) | title, categories (location), workplaceType, URL, created date, description    |
| Ashby Job Postings API   | `https://api.ashbyhq.com/posting-api/job-board/{slug}`                | none (public GET) | title, location(s), isRemote / workplaceType, URL, published date, description |

## Terms and how the project respects them

These endpoints are documented by each vendor so a company's own listings can be shown on other pages (careers pages, job aggregators). Vendors can change their terms; **re-read them before relying on this data** (Greenhouse Job Board API docs, Lever postings API docs, Ashby public job posting API docs). I have not found a published numeric rate limit for these GET endpoints, so the pipeline is deliberately gentle:

- **Rate limiting**: at most one request every 400 ms across all boards (`pipeline/http.ts`).
- **Caching**: every response is cached on disk (`data/cache/`, 6 h) so re-runs do not re-request; the workflow caches this folder between runs.
- **Retry with backoff**: 429 / 5xx / network errors retry after 1 s, 2 s, 4 s; a 404 (unknown board) is not retried.
- **Fail fast offline**: after 3 consecutive network failures the run stops asking.
- **User-Agent**: `Scoutly/0.1 (+https://github.com/Shriyank-Reddy/Scoutly; student portfolio project, polite fetcher)`: names the project and repository, contains no email address.
- **Snippet only**: the site stores a ≤ 280-character excerpt, never the full description.
- **Always link out**: "Apply" opens the company's original posting.
- **Once a day**: the scheduled workflow runs daily; nothing runs per visitor.

## Company discovery (`npm run discover`)

Finds new Greenhouse / Lever / Ashby boards from public community internship lists. Before a list is read, the script fetches its licence file and **skips the list unless the licence is permissive** (MIT, Apache-2.0, BSD, CC0, Unlicense). Each new slug is verified with one request before being added, tagged `discoveredFrom`, and a weekly workflow opens a pull request for human review. Output: `data/discovery-report.md` (found / verified / rejected and why).

| List                                                 | URL                                                    | Licence (checked)     | Used?                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| vanshb03/Summer2026-Internships                      | https://github.com/vanshb03/Summer2026-Internships     | MIT (`LICENSE.txt`)   | **Yes.** Its links are redirects (`go.vansh.nyc`), so slugs are found by following them: capped (300/run), 1 request/second, cached. |
| SimplifyJobs/Summer2026-Internships                  | https://github.com/SimplifyJobs/Summer2026-Internships | no licence file found | **No**: without a licence, reuse is not permitted.                                                                                   |
| SimplifyJobs/New-Grad-Positions                      | https://github.com/SimplifyJobs/New-Grad-Positions     | no licence file found | **No.**                                                                                                                              |
| ReaVNaiL/New-Grad-2024, coderQuad/New-Grad-Positions | (same pattern)                                         | no licence file found | **No.**                                                                                                                              |
| j-delaney/easy-application                           | https://github.com/j-delaney/easy-application          | MIT                   | No: last updated years ago; not useful.                                                                                              |

Licences were checked on 2026-11-03 by fetching `raw.githubusercontent.com/<repo>/<branch>/LICENSE*`. The script re-checks on every run, so a list that changes licence is skipped automatically.

## Other data

- **City coordinates**: GeoNames (via the `all-the-cities` npm package), licensed **CC BY 4.0**, https://www.geonames.org. Bundled offline in `src/data/cities.json`; no geocoding API is called.
- **Map tiles**: © OpenStreetMap contributors (https://www.openstreetmap.org/copyright), shown with attribution on the map. OpenStreetMap's tile usage policy applies; this is a low-traffic portfolio site.

## Current status of the data

The build environment could not reach the job APIs (see `docs/DECISIONS.md`). Until the first scheduled run succeeds on GitHub, the site ships **fictional sample listings** and says so in a banner.
