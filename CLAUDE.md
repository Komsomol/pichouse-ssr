# Picturehouse Screen 1 Movie Tracker

## Overview

Nuxt 3 static site with five tabs:

- **Movies** (`/`) - movies on **Screen 1** at Finsbury Park and Picturehouse Central, filtered to **weekday evenings (after 6 PM)** and **all weekend times**, with booking links and trailers.
- **IMAX** (`/imax`) - every bookable screening at **BFI IMAX**, Waterloo, sold-out and past screenings removed. Data via Clusterflick (see BFI IMAX).
- **Trailers** (`/trailers`) - official studio trailers from YouTube, last 30 days, filterable by studio.
- **Box Office** (`/boxoffice`) - the UK weekend top 10 scraped from Box Office Mojo, enriched with TMDb metadata and trailers.
- **About** (`/about`) - what the site is, how it updates, data sources and attribution.

The first tab was called **Cinema** until 3 Oct 2026; older commits and the
incident log use that name.

**Live URL:** https://pichouse-ssr.pages.dev

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Node:** 22+ required. `eslint-plugin-unicorn` uses `Set.prototype.union`,
  absent on 20, and `scripts/validate-env.js` uses `process.loadEnvFile`.
- **Hosting:** Cloudflare Pages via Wrangler
- **CI/CD:** GitHub Actions (checks at 07:37 and 21:37 UTC)
- **UI:** Vue 3 Composition API
- **Testing:** Vitest + happy-dom (159 tests)
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb, OMDB, YouTube Data API v3, Box Office Mojo (scraped with cheerio)
- **Dependencies:** axios, cheerio, normalize.css, nuxt, p-limit, vue. No dotenv -
  Nuxt loads `.env` for server routes and the validate script uses Node's built-in.
- **Concurrency:** p-limit (5 TMDb, 8 YouTube)
- **Caching:** In-memory TTL (6hr TMDb, 1hr Picturehouse, 1hr YouTube, 6hr box office)

## Architecture

Everything resolves at **build time** inside Nitro server routes. There is no
runtime backend - the deployed artifact is static HTML - so API keys never reach
the client.

```
GitHub Actions (smart-deploy, 07:37 + 21:37 UTC)
    │
    ├── Fingerprint Picturehouse feed + BFI IMAX asset; skip build if both unchanged
    │
    ▼ npm run generate  (validate:env → lint → test → nuxt generate → verify:build)
    │
    ├── /server/api/movies.js
    │     ├── fetchMoviesFromPicturehouse() [cached 1hr]
    │     ├── Filter: Screen 1, target cinemas, valid times
    │     ├── Deduplicate by original title
    │     ├── Enrich with TMDb [cached 6hr, 5 concurrent] → OMDB fallback
    │     └── Booking URLs, sort by earliest showtime, drop raw feed arrays
    │
    ├── /server/api/imax.js
    │     ├── Clusterflick BFI IMAX release asset (GitHub) [cached 1hr]
    │     ├── Drop sold-out / past performances and films left with none
    │     └── Poster + trailers from TMDb by id [5 concurrent]
    │
    ├── /server/api/trailers.js
    │     ├── 50 studio channels, uploads playlist derived UC→UU [8 concurrent]
    │     ├── Filter: keyword, 30-day window, release-year, excluded terms
    │     └── Sort newest first, dedupe co-releases into `alsoFrom`
    │
    ├── /server/api/boxoffice.js
    │     ├── Box Office Mojo year index → latest weekend → chart [cached 6hr]
    │     ├── Split name from label ("2026 Re-release"), apply TITLE_ALIASES
    │     └── Enrich top 10 with TMDb [cached 6hr, 5 concurrent]
    │           poster, synopsis, runtime, rating and trailer per film
    │
    ▼
Static HTML → Cloudflare Pages CDN → https://pichouse-ssr.pages.dev
```

**No global state management** - component-local refs only.

**Keep raw feed arrays out of the API response.** Whatever `/api/movies` returns
is serialised into the Movies tab's `_payload.json`. The feed's `show_times`
covers every screen at every cinema - ~1,800 sessions against the ~40 shown -
so `movies.js` drops `show_times`, `movie_times` and `_screen1Showtimes` in its
final map. That took the payload from 656KB to 54KB. A new field the page needs
must be added to what survives, not by passing the whole feed object through.

**Prerender routes are declared, not crawled.** `nuxt.config.ts` lists all five
routes under `nitro.prerender.routes`. Link crawling only discovers the other
tabs once `/` has rendered, and `/` waits on a Picturehouse request that takes
10-17s, so the Trailers and Box Office work used to queue behind it. Declared,
they fetch during that wait: non-overlapped build work dropped ~2.2s to ~0.5s.
Do not remove the list.

## Key Files

| File | Purpose |
|------|---------|
| `/server/api/movies.js` | Movies tab orchestrator |
| `/server/api/picturehouseApi.js` | Picturehouse API client (cinema ID hardcoded `029`), 30s timeout + 3 attempts |
| `/server/api/tmdbApi.js` | TMDb client: search, prefix retry, trailer ranking |
| `/server/api/omdbApi.js` | OMDB API client (Movies tab fallback) |
| `/server/api/filterMovies.js` | Title cleaning, strand prefixes, exact-title matching |
| `/server/api/trailers.js` | Studio trailers orchestrator |
| `/server/api/youtubeApi.js` | YouTube Data API v3 client |
| `/server/api/filterTrailers.js` | Trailer filtering, sorting, dedup |
| `/server/api/boxoffice.js` | UK box office top 10 orchestrator |
| `/server/api/boxOfficeApi.js` | Box Office Mojo client (two-step: year index → chart) |
| `/server/utils/constants.js` | Cinema IDs, screen config, trailer + box office config |
| `/server/api/filterBoxOffice.js` | Chart parsing (cheerio) |
| `/server/api/imax.js` | BFI IMAX orchestrator |
| `/server/api/imaxApi.js` | Fetches Clusterflick's BFI IMAX JSON |
| `/server/api/filterImax.js` | Sold-out/past filtering, London-time formatting |
| `/pages/imax.vue` | IMAX tab (reuses the Movies tab's layout classes) |
| `/server/utils/channels.js` | 50 studio YouTube channels |
| `/server/utils/helpers.js` | Pure utilities incl. `normalizeTitleKey` (shared comparison key) |
| `/server/utils/cache.js` | TTL-based caches |
| `/nuxt.config.ts` | Prerender route list (see Architecture) |
| `/pages/index.vue` | Movies tab |
| `/pages/trailers.vue` | Trailers tab |
| `/pages/boxoffice.vue` | Box Office tab |
| `/pages/about.vue` | About tab |
| `/components/NavTabs.vue` | Tab bar (rendered from `app.vue`) |
| `/components/movies/MovieListStyles.css` | Design tokens, `.marquee` title, shared layout for all pages |
| `/components/movies/VideoModal.vue` | Trailer modal (shared by Movies, Trailers and Box Office) |
| `/scripts/verify-build.js` | Post-generate guard: fails the build on an empty or errored Movies tab |
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
  CURRENCY: 'USD',  // Mojo reports British grosses in dollars
  TITLE_ALIASES: { 'Avengers: Endgame (2026 Re-release)': 'Avengers Endgame: Encore' }
}
IMAX_CONFIG: {
  SOURCE_URL: 'https://github.com/clusterflick/data-transformed/releases/latest/download/bfi.org.uk-imax',
  CREDIT_URL: 'https://clusterflick.com',
  TIME_ZONE: 'Europe/London'  // build runs in UTC; times must read as London
}
```

## Title matching

Picturehouse titles carry things TMDb has never heard of. Three stages, in
order, all in `filterMovies.js` unless noted.

`movies.js` runs **`sanitizeMovieTitle()`** first and searches on its output, so
it must strip the trailing `+` clause too. It used to remove only "+ Q&A",
turning "Madness: Take It or Leave It + Q&A with members of Madness" into
"... with members of Madness" - no `+` left for stage 1 to find, and no match.

1. **`cleanTitleForSearch()`** strips format and screening markers, and
   **everything after a `+`** - that clause is what comes with the screening,
   not the film ("Pressure + Live Broadcast Q&A", "Green Screen: A Dairy Story
   + Q+A"). 42 of ~304 feed titles carry one; enumerating the wordings missed
   each new variant, so the whole trailing clause goes.
2. **`stripStrandPrefix()`** drops a season or strand prefix ("Out at Clapham:
   Beautiful Thing", "American Library presents Pressure"). Splits on the
   **first** colon so a nested title survives ("CFS: Pompei: Below the Clouds").
3. **`filterByExactTitle()`** holds the retry's results to an exact name,
   comparing both `title` and `original_title` via `normalizeTitleKey`.

**The prefix strip is retry-only, and must stay that way.** 138 of ~292 titles
contain a colon and most are genuine names - "Wicked: For Good" is the same
shape as "Green Screen: Burning Skies". `fetchMovieFromTMDb` searches the full
title first and only strips the prefix when TMDb returns **nothing**, which a
real title never does. Stripping up front would break every colonned film.

Live feed: 245/296 titles resolve, 91 via the retry, 7 rejected by the exact
check. The ~50 that never resolve are quiz nights and comedy clubs, not films.

## Trailer selection

`filterTrailerVideos()` in `tmdbApi.js` picks a film's trailer, best first.

**Select on TMDb's `type`, never on the video's name.** A name is marketing
copy: The End of Oak Street carries a *Featurette* called "Have you experienced
the new trailer?" which a name match ranked above its actual "Official Trailer".
Required: `type === 'Trailer'`, `official`, `site === 'YouTube'`.

Type alone is not enough - studios type promo cuts as Trailer too, and those are
the newest thing a film has once it charts. So ranking is:

1. Names itself a trailer at all (drops "Tickets now on sale")
2. Not a promo qualifier - `countdown`, `teaser`, `vertical`, `IMAX`, `4DX`,
   `sing-along`, `TV spot` - nor a regional one (`US`/`UK`/`AU`/`NZ`, uppercase
   only, so a lowercase "us" in a title is not a false hit)
3. Newest

Nothing is excluded, only demoted, so a film whose only upload is a countdown
still shows it. Newest-within-rank lands on the "Final Trailer" wherever one
exists - a final trailer always postdates the official trailer it follows - so
that needs no special case. Where TMDb types nothing as Trailer, the old name
match runs as a fallback rather than the film losing its video.

## BFI IMAX

**Do not scrape whatson.bfi.org.uk.** It sits behind a Cloudflare challenge:
a browser passes silently, but any request from a datacenter - GitHub Actions
included - gets a 403 "Just a moment..." page, with or without a session
`sToken` in the URL. Getting past it would mean disguising the build as a
human browser (stealth headless browsers, challenge solvers, spoofed
fingerprints). That is evading protection BFI chose to put up - don't.
`www.bfi.org.uk/bfi-imax` is not challenged but carries no listings.

**Data comes from Clusterflick** (clusterflick.com), an open-source project that
gathers 250+ London cinemas daily. `clusterflick/data-transformed` publishes a
per-venue asset; `bfi.org.uk-imax` is a JSON array of films, each with
`title`, `themoviedb.id`, `overview.classification`/`duration` and
`performances[]` of `{ time (epoch ms), bookingUrl, status.soldOut, format }`.
The data is **CC BY 4.0: the credit on the IMAX page and the About sources list
is a licence requirement**, not decoration. Keep both.

- **TMDb id comes with the data,** so enrichment calls
  `fetchVideosAndPosterFromTMDb(id)` directly - no title search, which BFI's
  event titles ("25th Anniversary: ...", "... + Q&A with ...") often fail.
- **Booking links are per film, not per screening.** BFI's links (and so
  Clusterflick's) open the film's page, where you pick the showing. Each time
  card links there; its `aria-label` names the screening.
- **Times are formatted in `Europe/London` explicitly** - CI runs in UTC, so a
  bare `toLocaleString` would show BST times an hour early.
- **Freshness:** Clusterflick has no fixed schedule - it publishes when its
  scrape finishes, typically twice a day: mornings 05:00-07:06 UTC, evenings
  17:00-20:40 UTC (Sep-Oct 2026). smart-deploy runs at 07:37 and 21:37 UTC to
  land after each, and fingerprints the IMAX asset (screenings + sold-out
  flags) alongside Picturehouse, so an IMAX-only change deploys. A failed IMAX
  fetch keeps the previous fingerprint - it never forces a build with an empty
  tab. The hash cache file holds two lines: Picturehouse, then IMAX.

## Box office titles

Mojo's release cell is a link holding the film's name plus a span holding any
label: `<a>Avengers: Endgame</a><span>2026 Re-release</span>`. `parseWeekendChart`
reads the link as `title` and the span as `label`. Reading the cell's text
glued them into "Avengers: Endgame2026 Re-release", which TMDb could not match.

TMDb is always searched on `title`, the original film. A re-release's own TMDb
entry may be a stub - "Avengers Endgame: Encore" (id 1786842) 404s on details,
so it has no poster or trailer. `BOX_OFFICE_CONFIG.TITLE_ALIASES`, keyed by
`"<title> (<label>)"`, only renames the card. Unaliased re-releases show the
original film's name, which is accurate if less specific.

**Do not pick a re-release by "latest TMDb match"** (`findLatest`). TMDb search
is fuzzy: the latest result for "Alien" is "Alien Spa" (2026).

## Design

The **marquee letterboard**: the sign over a cinema door that announces
what's on the big screen. Tokens live in `MovieListStyles.css`:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--lightbox` | `#eef0ea` | `#000000` | Background: the backlit panel |
| `--letter` | `#000000` | `#eef0ea` | Titles, times, body |
| `--letter-soft` | `#4a4d47` | `#b5b8b2` | Secondary text |
| `--rail` | `#8a8d86` | `#72756e` | Dividers only - too low-contrast for text |
| `--exit` | `#087040` | `#2fd07a` | Exit-sign green: every action (book, play, link) |

**Dark mode is the light theme inverted** - background and letters swap, the
greys mirror. Only the green is lifted, because the light-mode green is too
dark to read on black. Keep it a plain inversion rather than a separate palette.

- **Type:** Big Shoulders Display (titles, showtimes, ranks, grosses) and
  Instrument Sans (everything else). Major-third scale, `--font-xs`…`--font-4xl`.
- **`.marquee`** is the one bold element: film titles in condensed capitals.
  Movies and Box Office film titles use it. Trailer names do not - they are
  YouTube video names, not films.
- **No lines on titles and no title animation.** Both were tried (a rail under
  each line, letters dropping in on load) and removed as noise on 3 Oct 2026.
- **No card kit.** Films and chart entries are separated by a 4px letter-colour
  rail, not boxed with radius and shadow. Keep it that way.
- **Phones:** `.movie-left` and `.movie-info` are `display: contents` so their
  children sit in one grid - title, then small poster beside facts and
  synopsis, then showtimes. 768px+ switches to the poster side column.
- The old cream/DM Serif/terracotta look was replaced on 3 Oct 2026 because it
  matched the most generic AI-generated "boutique" template.

## UI conventions

- **Trailer links carry a real YouTube href.** Movies, Trailers and Box Office render
  `<a :href="youtube.com/watch?v=KEY" target="_blank" @click.exact.prevent="openModal(KEY)">`.
  A plain click opens the modal; `.exact` lets middle/Cmd/Ctrl-click and
  "open in new tab" reach YouTube. Do not go back to `javascript:void(0)` or a
  `<button>` - neither can be opened in a new tab.
- **Trailer links sit under the poster** on Movies and Box Office from 600/768px
  up; on phones they drop below the synopsis.
- **The showtime is the booking link.** Each `.showtime-card` is an `<a>` to
  the booking URL with an `aria-label` naming cinema, date and time. There is
  no separate "Book Tickets" button.
- **Page `<h1>`s are visually hidden** (`.visually-hidden` in
  `MovieListStyles.css`). The tab bar already names the page, but the heading
  stays in the DOM for screen readers and search engines. Do not delete them.
- **About page data sources link out** to each provider's site.

## Environment Variables

```
TMDB_TOKEN=eyJ...          # Required - TMDb API Read Access Token
COOKIE=your_cookie         # Required - Picturehouse website cookie
OMDB_API_KEY=your_key      # Optional - Movies tab trailer/poster fallback
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
npm run dev          # Dev server - http://127.0.0.1:3000 (see gotchas)
npm test             # Vitest
npm run lint:fix     # Auto-fix ESLint
npm run generate     # Static site generation
npm run preview      # Preview generated site
```

`generate`/`build` run validate:env → lint → test first, so a lint error or a
failing test blocks a deploy. `generate` then runs `verify:build`, which fails
the build if the generated Movies tab rendered its error state or has no
listings - `nuxt generate` alone exits 0 in that case, so without it a page
saying only "Failed to load movies" gets deployed over a working site.

## Deployment

| Workflow | Triggers | Behaviour |
|----------|----------|-----------|
| `smart-deploy.yml` | 07:37 + 21:37 UTC, manual | Hashes the Picturehouse feed and BFI IMAX asset, builds only on change |
| `deploy.yml` | Push to `main`, manual | Always builds |

`smart-deploy.yml` owns the schedule and re-enables itself via the API each run
(GitHub disables scheduled workflows after 60 days without repo activity - this
took the site down 16 Jun - 7 Jul 2026).

All actions are on v5 and the node24 runtime as of 19 Aug 2026: `checkout@v5`,
`setup-node@v5`, `cache/restore@v5`, `cache/save@v5`. v5 reads caches written by
v4, verified on a manual dispatch. Latest majors are higher (checkout v7,
setup-node v7, cache v6) but v5 clears the Node 20 deprecation, which was the
reason to move.

## Testing

Test files:
- `server/api/__tests__/picturehouseApi.test.js`
- `server/api/__tests__/filterMovies.test.js`
- `server/api/__tests__/filterTrailers.test.js`
- `server/api/__tests__/filterBoxOffice.test.js`
- `server/api/__tests__/filterImax.test.js`
- `server/api/__tests__/tmdbApi.test.js`
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
7. **Strip strand prefixes only on a TMDb miss** - see Title matching
8. **Pick trailers by TMDb `type`, not by name** - see Trailer selection
9. **No filter UI on the Movies tab** - intentionally omitted. The Trailers tab's
   studio filter is deliberate and separate; do not "unify" them.
10. **Box office enrichment goes through TMDb** - it matched 9/9 of the chart
    with a real trailer where OMDB carries no trailer data at all
11. **Don't add Pinia** - state is component-local
12. **Don't migrate off Nuxt** - server routes are what keep API keys out of the client
13. **Verify dependency changes with `npm ci`, not `npm install`** - see gotchas
14. **Tests and ESLint must pass**

## Incident log

`/docs/` holds a write-up per outage - timeline, what was ruled out, root cause,
what shipped, and what to watch next. Read the relevant one before re-litigating
a gotcha below; the short version here is the conclusion, the log has the evidence.

- [`2026-08-31-picturehouse-outage.md`](docs/2026-08-31-picturehouse-outage.md) -
  Cinema tab down ~21h. Gateway timeout on the 3.5MB feed, no retry, a build that
  exited 0 anyway, a workflow that deployed *because* the fetch failed, and a
  missed cron that skipped the automatic recovery.

## Gotchas

- **`npm install` can produce a lockfile `npm ci` rejects.** `@bomb.sh/tab` (via
  `@nuxt/cli`) has optional peer deps on `cac`/`commander` that conflict with what
  npm hoists. Symptom: `lock file's cac@7.0.0 does not satisfy cac@6.7.14`. A
  second `npm install` converges the tree. Always verify with `npm ci` before
  pushing a lockfile change.
- **`OMDB_API_KEY` is set in GitHub Secrets but absent from the local `.env`.**
  The key is valid - CI logs show the Movies tab's OMDB fallback working - but
  locally every OMDB call 401s, so that path cannot be exercised in dev. Do not
  conclude from a local 401 that the secret is broken.
- **`gh secret set NAME` with no piped value stores an empty string.** The secret
  then appears in `gh secret list` while the build behaves as if it is unset.
- **Cloudflare edge can serve a stale HTML shell for a minute after deploy.**
  Add a cache-busting query before concluding a deploy failed.
- **GitHub's cron is best-effort, and the top of the hour is the worst slot.**
  `schedule` queues on a shared pool, slips under load, and is dropped when the
  queue is deep. On `0 6 * * *` this fired on time until 26 Aug 2026, then ran
  5-12h late every day, then missed 1 Sep entirely - which is why the 31 Aug
  outage was still live the next morning instead of self-healing on the next
  run. Moved to `37 6 * * *`, then on 3 Oct 2026 to `37 7,21 * * *` to land
  after Clusterflick's two daily releases. If days start going missing again, the next step is an
  external trigger (a Cloudflare Worker cron calling `workflow_dispatch`)
  rather than another cron minute.
- **A failed run now defers recovery to the next run.** smart-deploy holds the
  current deploy when the fetch fails rather than replacing it, so the site
  stays correct - but it only refreshes when a later run succeeds. That makes
  the schedule actually firing a reliability dependency, not a convenience.
- **The build is upstream-bound, not code-bound.** One Picturehouse POST is
  10-17s of a ~11-18s build and its latency swings run to run. Micro-optimising
  the title regexes is pointless: they cost ~1ms for all 304 titles.
- **`fetchVideosAndPosterFromTMDb` returns `runtime` and `voteAverage`** as well
  as videos and poster. All four come off one `append_to_response=videos` call,
  so Box Office metadata costs no extra request. Do not split it back into two.
- **Never log an axios error object.** It carries the request config, including
  the `Authorization: Bearer` header - the TMDb token. Log
  `error.response?.status || error.message`. `fetchVideosAndPosterFromTMDb`
  leaked it this way until 3 Oct 2026; `tmdbApi.test.js` now guards it.
- **`process.loadEnvFile` throws when `.env` is missing, where dotenv was quiet.**
  CI has no `.env` - secrets arrive as environment variables - so the call in
  `scripts/validate-env.js` must stay wrapped in try/catch.
- **The smart-deploy fingerprint covers Picturehouse and BFI IMAX only.** New
  studio trailers and a new box office weekend will not trigger a rebuild on
  their own.
- **`nuxt generate` refuses to run while the dev server is up** ("Another Nuxt
  dev is already running") and exits without building. `verify-build` then
  checks the *previous* `.output` and passes. Stop the dev server before a local
  production build.
- **The Picturehouse feed is ~3.5MB and its gateway sometimes gives up on it.**
  `get-movies-ajax` ignores `cinema_id` and always returns all 25 cinemas. On
  31 Aug 2026 the build hung ~60s per attempt and got a 504 then a 502; the page
  that shipped said only "Failed to load movies". The route itself is fine - it
  answers 200 with or without the `COOKIE` header, and the body-vs-query form of
  the parameters makes no difference. Hence the timeout, the retries, and
  `verify:build`. `scheduled-movies-ajax` with `cinema_id=029` does honour the
  filter (465KB for both cinemas, ~1.7s) but drops `Rating`, `RunTime` and
  `filter_class_names`, which the Movies tab renders and `movies.js` uses.
- **Box Office Mojo has no "latest weekend" URL.** A build reads the year index
  and follows the first row, so the chart lags the weekend by however long Mojo
  takes to publish. `britinfo.net`, which `uk_top_10_scraper` used, has not
  updated since 4 September 2025 - do not switch back to it.
- **Mojo reports British grosses in US dollars.** The Box Office page says so;
  do not relabel them as £.
- **The dev server is on 127.0.0.1:3000, not 4000.** `nuxt.config.ts` sets
  `server.port: 4000`, but `server` is not a Nuxt 3 key (`devServer` is), so it
  is ignored. It also binds IPv4 only: Chrome resolving `localhost` to `::1`
  shows an error page - use `127.0.0.1`.
- **A renamed re-release needs a manual `TITLE_ALIASES` entry.** Nothing in the
  Mojo or TMDb data reliably names it - see Box office titles.

## Known Limitations

- BFI IMAX depends on Clusterflick continuing to publish; BFI's own site cannot
  be read by the build (see BFI IMAX)
- No user accounts (booking redirects to Picturehouse)
- Movies tab films only appear if a trailer exists on TMDb or OMDB
- Trailers tab depends on YouTube API quota (~53 units/build against 10,000/day)
- Opera and event broadcasts ("Met Opera Live 2026-27: Otello") can match an
  unrelated film of the same name. The exact-title check cannot tell them apart.

## Open Items

- The smart-deploy **skip path has never executed**. Every run so far has found
  changed data and deployed - the 19 Aug 2026 dispatch saw 312 movies against a
  previous 304. First quiet listings day will confirm `😴 No changes detected`
  works.
- **Two title prefixes are still rejected as too risky to fold in.** "Battle of
  the Somme" misses TMDb's "The Battle of the Somme" (leading article), and
  "A Nightmare on Elm Street 2" misses "...Elm Street Part 2". Both fall back to
  no match rather than a wrong one, which is the intended trade.
- `README.md` and `DEPLOYMENT.md` were brought current on 3 Oct 2026; keep them
  in step when changing workflows, env vars or Node version.
