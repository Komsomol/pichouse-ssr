# Picturehouse Screen 1 Movie Tracker

## Overview

Nuxt 3 static site with four tabs:

- **Cinema** (`/`) - movies on **Screen 1** at Finsbury Park and Picturehouse Central, filtered to **weekday evenings (after 6 PM)** and **all weekend times**, with booking links and trailers.
- **Trailers** (`/trailers`) - official studio trailers from YouTube, last 30 days, filterable by studio.
- **Box Office** (`/boxoffice`) - the UK weekend top 10 scraped from Box Office Mojo, enriched with TMDb metadata and trailers.
- **About** (`/about`) - what the site is, how it updates, data sources and attribution.

**Live URL:** https://pichouse-ssr.pages.dev

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Node:** 22+ required (`eslint-plugin-unicorn` uses `Set.prototype.union`, absent on 20)
- **Hosting:** Cloudflare Pages via Wrangler
- **CI/CD:** GitHub Actions (daily check at 06:37 UTC)
- **UI:** Vue 3 Composition API
- **Testing:** Vitest + happy-dom (146 tests)
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb, OMDB, YouTube Data API v3, Box Office Mojo (scraped with cheerio)
- **Concurrency:** p-limit (5 TMDb, 8 YouTube)
- **Caching:** In-memory TTL (6hr TMDb, 1hr Picturehouse, 1hr YouTube, 6hr box office)

## Architecture

Everything resolves at **build time** inside Nitro server routes. There is no
runtime backend - the deployed artifact is static HTML - so API keys never reach
the client.

```
GitHub Actions (smart-deploy, daily 06:37 UTC)
    │
    ├── Fingerprint Picturehouse feed; skip build if unchanged
    │
    ▼ npm run generate  (validate:env → lint → test → nuxt generate → verify:build)
    │
    ├── /server/api/movies.js
    │     ├── fetchMoviesFromPicturehouse() [cached 1hr]
    │     ├── Filter: Screen 1, target cinemas, valid times
    │     ├── Deduplicate by original title
    │     ├── Enrich with TMDb [cached 6hr, 5 concurrent] → OMDB fallback
    │     └── Booking URLs, sort by earliest showtime
    │
    ├── /server/api/trailers.js
    │     ├── 50 studio channels, uploads playlist derived UC→UU [8 concurrent]
    │     ├── Filter: keyword, 30-day window, release-year, excluded terms
    │     └── Sort newest first, dedupe co-releases into `alsoFrom`
    │
    ├── /server/api/boxoffice.js
    │     ├── Box Office Mojo year index → latest weekend → chart [cached 6hr]
    │     └── Enrich top 10 with TMDb [cached 6hr, 5 concurrent]
    │           poster, synopsis, runtime, rating and trailer per film
    │
    ▼
Static HTML → Cloudflare Pages CDN → https://pichouse-ssr.pages.dev
```

**No global state management** - component-local refs only.

## Key Files

| File | Purpose |
|------|---------|
| `/server/api/movies.js` | Cinema listings orchestrator |
| `/server/api/picturehouseApi.js` | Picturehouse API client (cinema ID hardcoded `029`), 30s timeout + 3 attempts |
| `/server/api/tmdbApi.js` | TMDb API client |
| `/server/api/omdbApi.js` | OMDB API client (fallback) |
| `/server/api/filterMovies.js` | Title sanitization, cleaning for search |
| `/server/api/trailers.js` | Studio trailers orchestrator |
| `/server/api/youtubeApi.js` | YouTube Data API v3 client |
| `/server/api/filterTrailers.js` | Trailer filtering, sorting, dedup |
| `/server/api/boxoffice.js` | UK box office top 10 orchestrator |
| `/server/api/boxOfficeApi.js` | Box Office Mojo client (two-step: year index → chart) |
| `/server/api/filterBoxOffice.js` | Chart parsing (cheerio) |
| `/server/utils/constants.js` | Cinema IDs, screen config, trailer + box office config |
| `/server/utils/channels.js` | 50 studio YouTube channels |
| `/server/utils/helpers.js` | Pure utility functions |
| `/server/utils/cache.js` | TTL-based caches |
| `/pages/index.vue` | Cinema tab |
| `/pages/trailers.vue` | Trailers tab |
| `/pages/boxoffice.vue` | Box Office tab |
| `/pages/about.vue` | About tab |
| `/components/NavTabs.vue` | Tab bar (rendered from `app.vue`) |
| `/components/movies/MovieListStyles.css` | Design tokens + shared layout for all pages |
| `/components/movies/VideoModal.vue` | Trailer modal (shared by Cinema, Trailers and Box Office) |
| `/scripts/verify-build.js` | Post-generate guard: fails the build on an empty or errored Cinema tab |
| `/.github/workflows/deploy.yml` | Push + manual deploy (no cron) |
| `/.github/workflows/smart-deploy.yml` | Daily deploy, skips when data unchanged |

## Configuration

`/server/utils/constants.js`:

```javascript
CINEMA_IDS: { FINSBURY_PARK: '029', PICTUREHOUSE_CENTRAL: '022' }
SCREENING_CONFIG: { SCREEN_NAME: 'Screen 1', MIN_HOUR: 18 }  // MIN_HOUR: weekdays only
PICTUREHOUSE_CONFIG: { REQUEST_TIMEOUT: 30000, MAX_ATTEMPTS: 3, RETRY_DELAY_MS: 2000 }
TRAILER_CONFIG: {
  SEARCH_KEYWORDS: ['official trailer', 'final trailer'],
  EXCLUDED_KEYWORDS: [...teasers, blu-ray, series markers, 'disney+', 'marvel television'],
  DAYS_RANGE: 30,
  MAX_RELEASE_YEAR_AGE: 1,  // rejects back-catalogue re-uploads by title year
  PER_PAGE: 20
}
BOX_OFFICE_CONFIG: {
  BASE_URL: 'https://www.boxofficemojo.com',
  YEAR_INDEX_PATH: '/weekend/by-year/?area=GB',  // newest weekend first
  TOP_N: 10,
  CURRENCY: 'USD'  // Mojo reports British grosses in dollars
}
```

## Environment Variables

```
TMDB_TOKEN=eyJ...          # Required - TMDb API Read Access Token
COOKIE=your_cookie         # Required - Picturehouse website cookie
OMDB_API_KEY=your_key      # Optional - fallback for trailers
YT_API_KEY=your_key        # Optional - powers the Trailers tab
```

Only `TMDB_TOKEN` and `COOKIE` are enforced by `scripts/validate-env.js`. Without
`YT_API_KEY` the build still succeeds and the Trailers tab renders empty. The Box
Office tab needs no key of its own - the chart is scraped and the rest comes from
`TMDB_TOKEN`.

GitHub Secrets additionally need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
(6 secrets total).

## Commands

```bash
npm run dev          # Dev server (port 4000)
npm test             # Vitest
npm run lint:fix     # Auto-fix ESLint
npm run generate     # Static site generation
npm run preview      # Preview generated site
```

`generate`/`build` run validate:env → lint → test first, so a lint error or a
failing test blocks a deploy. `generate` then runs `verify:build`, which fails
the build if the generated Cinema tab rendered its error state or has no
listings - `nuxt generate` alone exits 0 in that case, so without it a page
saying only "Failed to load movies" gets deployed over a working site.

## Deployment

| Workflow | Triggers | Behaviour |
|----------|----------|-----------|
| `smart-deploy.yml` | Daily 06:37 UTC, manual | Hashes the Picturehouse feed, builds only on change |
| `deploy.yml` | Push to `main`, manual | Always builds |

`smart-deploy.yml` owns the schedule and re-enables itself via the API each run
(GitHub disables scheduled workflows after 60 days without repo activity - this
took the site down 16 Jun - 7 Jul 2026).

## Testing

Test files:
- `server/api/__tests__/picturehouseApi.test.js`
- `server/api/__tests__/filterMovies.test.js`
- `server/api/__tests__/filterTrailers.test.js`
- `server/api/__tests__/filterBoxOffice.test.js`
- `server/utils/__tests__/cache.test.js`
- `server/utils/__tests__/helpers.test.js`
- `server/utils/__tests__/env-validation.test.js`
- `components/movies/__tests__/MovieListScript.test.js`

## Code Style

- Vue 3 Composition API with `<script setup>`
- Pure JavaScript (no TypeScript), tabs for indentation
- Functional programming: pure functions, immutability
- ESLint must be clean

## Critical Rules

1. **Preserve Screen 1 filtering** - core feature
2. **Time filter:** weekdays after 6 PM only; weekends all times
3. **Keep booking URL pattern** - `https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats`
4. **Preserve chronological sorting** - earliest showtimes first
5. **Use original Picturehouse titles** for display (keeps "35mm", "Q&A" markers)
6. **Use cleaned titles for API search** - `cleanTitleForSearch()`
7. **No filter UI on the Cinema tab** - intentionally omitted. The Trailers tab's
   studio filter is deliberate and separate; do not "unify" them.
8. **Box office enrichment goes through TMDb** - it matched 9/9 of the chart
   with a real trailer where OMDB carries no trailer data at all
9. **Don't add Pinia** - state is component-local
10. **Don't migrate off Nuxt** - server routes are what keep API keys out of the client
11. **Verify dependency changes with `npm ci`, not `npm install`** - see gotchas
12. **Tests and ESLint must pass**

## Gotchas

- **`npm install` can produce a lockfile `npm ci` rejects.** `@bomb.sh/tab` (via
  `@nuxt/cli`) has optional peer deps on `cac`/`commander` that conflict with what
  npm hoists. Symptom: `lock file's cac@7.0.0 does not satisfy cac@6.7.14`. A
  second `npm install` converges the tree. Always verify with `npm ci` before
  pushing a lockfile change.
- **`gh secret set NAME` with no piped value stores an empty string.** The secret
  then appears in `gh secret list` while the build behaves as if it is unset.
- **Cloudflare edge can serve a stale HTML shell for a minute after deploy.**
  Add a cache-busting query before concluding a deploy failed.
- **GitHub's cron is best-effort, and the top of the hour is the worst slot.**
  `schedule` queues on a shared pool, slips under load, and is dropped when the
  queue is deep. On `0 6 * * *` this fired on time until 26 Aug 2026, then ran
  5-12h late every day, then missed 1 Sep entirely - which is why the 31 Aug
  outage was still live the next morning instead of self-healing on the next
  run. Now `37 6 * * *`. If days start going missing again, the next step is an
  external trigger (a Cloudflare Worker cron calling `workflow_dispatch`)
  rather than another cron minute.
- **A failed run now defers recovery to the next run.** smart-deploy holds the
  current deploy when the fetch fails rather than replacing it, so the site
  stays correct - but it only refreshes when a later run succeeds. That makes
  the schedule actually firing a reliability dependency, not a convenience.
- **The smart-deploy fingerprint only covers Picturehouse data.** New studio
  trailers, and a new box office weekend, will not trigger a rebuild on their own.
- **The Picturehouse feed is ~3.5MB and its gateway sometimes gives up on it.**
  `get-movies-ajax` ignores `cinema_id` and always returns all 25 cinemas. On
  31 Aug 2026 the build hung ~60s per attempt and got a 504 then a 502; the page
  that shipped said only "Failed to load movies". The route itself is fine - it
  answers 200 with or without the `COOKIE` header, and the body-vs-query form of
  the parameters makes no difference. Hence the timeout, the retries, and
  `verify:build`. `scheduled-movies-ajax` with `cinema_id=029` does honour the
  filter (465KB for both cinemas, ~1.7s) but drops `Rating`, `RunTime` and
  `filter_class_names`, which the Cinema tab renders and `movies.js` uses.
- **Box Office Mojo has no "latest weekend" URL.** A build reads the year index
  and follows the first row, so the chart lags the weekend by however long Mojo
  takes to publish. `britinfo.net`, which `uk_top_10_scraper` used, has not
  updated since 4 September 2025 - do not switch back to it.

## Known Limitations

- BFI IMAX not supported (different ticketing system)
- No user accounts (booking redirects to Picturehouse)
- Films only appear if a trailer exists on TMDb or OMDB
- Trailers tab depends on YouTube API quota (~53 units/build against 10,000/day)

## Open Items

- The smart-deploy **skip path has never executed**. Since the fix landed, every
  run has found changed data and deployed. First quiet listings day will confirm
  `😴 No changes detected` works.
- **Trailer dedup misses pipe-delimited studio suffixes.** `normalizeTitle` strips
  a parenthesised studio credit (`(Universal Pictures)`) but not a trailing
  `| A24`. No current feed entry hits this.
- **`fetchVideosAndPosterFromTMDb` returns `runtime` and `voteAverage`** as well
  as videos and poster. They come off the details call the poster already needs,
  so the Box Office tab's metadata costs no extra request.
- `README.md` and `DEPLOYMENT.md` were brought current on 17 Aug 2026; keep them
  in step when changing workflows, env vars or Node version.
