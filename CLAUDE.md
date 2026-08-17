# Picturehouse Screen 1 Movie Tracker

## Overview

Nuxt 3 static site with three tabs:

- **Cinema** (`/`) - movies on **Screen 1** at Finsbury Park and Picturehouse Central, filtered to **weekday evenings (after 6 PM)** and **all weekend times**, with booking links and trailers.
- **Trailers** (`/trailers`) - official studio trailers from YouTube, last 30 days, filterable by studio.
- **About** (`/about`) - what the site is, how it updates, data sources and attribution.

**Live URL:** https://pichouse-ssr.pages.dev

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Node:** 22+ required (`eslint-plugin-unicorn` uses `Set.prototype.union`, absent on 20)
- **Hosting:** Cloudflare Pages via Wrangler
- **CI/CD:** GitHub Actions (daily check at 6 AM UTC)
- **UI:** Vue 3 Composition API
- **Testing:** Vitest + happy-dom (96 tests)
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb, OMDB, YouTube Data API v3
- **Concurrency:** p-limit (5 TMDb, 8 YouTube)
- **Caching:** In-memory TTL (6hr TMDb, 1hr Picturehouse, 1hr YouTube)

## Architecture

Everything resolves at **build time** inside Nitro server routes. There is no
runtime backend - the deployed artifact is static HTML - so API keys never reach
the client.

```
GitHub Actions (smart-deploy, daily 6 AM UTC)
    │
    ├── Fingerprint Picturehouse feed; skip build if unchanged
    │
    ▼ npm run generate  (validate:env → lint → test → nuxt generate)
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
    ▼
Static HTML → Cloudflare Pages CDN → https://pichouse-ssr.pages.dev
```

**No global state management** - component-local refs only.

## Key Files

| File | Purpose |
|------|---------|
| `/server/api/movies.js` | Cinema listings orchestrator |
| `/server/api/picturehouseApi.js` | Picturehouse API client (cinema ID hardcoded `029`) |
| `/server/api/tmdbApi.js` | TMDb API client |
| `/server/api/omdbApi.js` | OMDB API client (fallback) |
| `/server/api/filterMovies.js` | Title sanitization, cleaning for search |
| `/server/api/trailers.js` | Studio trailers orchestrator |
| `/server/api/youtubeApi.js` | YouTube Data API v3 client |
| `/server/api/filterTrailers.js` | Trailer filtering, sorting, dedup |
| `/server/utils/constants.js` | Cinema IDs, screen config, trailer config |
| `/server/utils/channels.js` | 50 studio YouTube channels |
| `/server/utils/helpers.js` | Pure utility functions |
| `/server/utils/cache.js` | TTL-based caches |
| `/pages/index.vue` | Cinema tab |
| `/pages/trailers.vue` | Trailers tab |
| `/pages/about.vue` | About tab |
| `/components/NavTabs.vue` | Tab bar (rendered from `app.vue`) |
| `/components/movies/MovieListStyles.css` | Design tokens + shared layout for all pages |
| `/components/movies/VideoModal.vue` | Trailer modal (shared by both tabs) |
| `/.github/workflows/deploy.yml` | Push + manual deploy (no cron) |
| `/.github/workflows/smart-deploy.yml` | Daily deploy, skips when data unchanged |

## Configuration

`/server/utils/constants.js`:

```javascript
CINEMA_IDS: { FINSBURY_PARK: '029', PICTUREHOUSE_CENTRAL: '022' }
SCREENING_CONFIG: { SCREEN_NAME: 'Screen 1', MIN_HOUR: 18 }  // MIN_HOUR: weekdays only
TRAILER_CONFIG: {
  SEARCH_KEYWORDS: ['official trailer', 'final trailer'],
  EXCLUDED_KEYWORDS: [...teasers, blu-ray, series markers, 'disney+', 'marvel television'],
  DAYS_RANGE: 30,
  MAX_RELEASE_YEAR_AGE: 1,  // rejects back-catalogue re-uploads by title year
  PER_PAGE: 20
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
`YT_API_KEY` the build still succeeds and the Trailers tab renders empty.

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
failing test blocks a deploy.

## Deployment

| Workflow | Triggers | Behaviour |
|----------|----------|-----------|
| `smart-deploy.yml` | Daily 06:00 UTC, manual | Hashes the Picturehouse feed, builds only on change |
| `deploy.yml` | Push to `main`, manual | Always builds |

`smart-deploy.yml` owns the schedule and re-enables itself via the API each run
(GitHub disables scheduled workflows after 60 days without repo activity - this
took the site down 16 Jun - 7 Jul 2026).

## Testing

Test files:
- `server/api/__tests__/filterMovies.test.js`
- `server/api/__tests__/filterTrailers.test.js`
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
8. **Don't add Pinia** - state is component-local
9. **Don't migrate off Nuxt** - server routes are what keep API keys out of the client
10. **Verify dependency changes with `npm ci`, not `npm install`** - see gotchas
11. **Tests and ESLint must pass**

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
- **The smart-deploy fingerprint only covers Picturehouse data.** New studio
  trailers alone will not trigger a rebuild.

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
- **Cinema tab has no `<h1>`** - the other two pages do.
- `README.md` and `DEPLOYMENT.md` were brought current on 17 Aug 2026; keep them
  in step when changing workflows, env vars or Node version.
