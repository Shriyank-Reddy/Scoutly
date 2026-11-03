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

## Other data

- **City coordinates**: GeoNames (via the `all-the-cities` npm package), licensed **CC BY 4.0**, https://www.geonames.org. Bundled offline in `src/data/cities.json`; no geocoding API is called.
- **Map tiles**: © OpenStreetMap contributors (https://www.openstreetmap.org/copyright), shown with attribution on the map. OpenStreetMap's tile usage policy applies; this is a low-traffic portfolio site.

## Current status of the data

The build environment could not reach the job APIs (see `docs/DECISIONS.md`). Until the first scheduled run succeeds on GitHub, the site ships **fictional sample listings** and says so in a banner.
