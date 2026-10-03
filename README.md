# PicHouse SSR - Picturehouse Cinema Schedule

[![Live Site](https://img.shields.io/badge/🎬_Live_Site-pichouse--ssr.pages.dev-blue?style=for-the-badge)](https://pichouse-ssr.pages.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare_Pages-orange?style=flat-square)](https://pichouse-ssr.pages.dev)
[![Daily Build](https://github.com/Komsomol/pichouse-ssr/actions/workflows/smart-deploy.yml/badge.svg)](https://github.com/Komsomol/pichouse-ssr/actions/workflows/smart-deploy.yml)

A statically generated site with five listings tabs - **Movies**, showing Screen 1 showtimes for Picturehouse Finsbury Park & Picturehouse Central, **IMAX**, showing every bookable screening at BFI IMAX, **What's on**, every film from both once with its trailer, summary and booking, **Trailers**, showing official trailers released by film studios in the last 30 days, and **Box Office**, showing the UK weekend top 10 - plus an **About** page.

### 🔗 **[View Live Site → pichouse-ssr.pages.dev](https://pichouse-ssr.pages.dev)**

## Features

### Movies tab

- 🎬 **Movie Listings** - Screen 1 showtimes from Finsbury Park & Picturehouse Central
- 🎥 **Trailers** - YouTube trailers per film via TMDb, with OMDB fallback
- ⭐ **Metadata** - Overview, runtime, release date and rating from TMDb
- 🎟️ **Booking Links** - Direct links to Picturehouse booking
- 📅 **Smart Filtering** - Weekday evenings (after 6 PM) + all weekend showtimes
- 🏷️ **Event Screenings Matched** - "Film + Q&A with ..." listings still find the film's poster and trailer

### IMAX tab

- 🎞️ **BFI IMAX Listings** - Every bookable screening at BFI IMAX, Waterloo
- 🚫 **Sold Out Removed** - Sold-out and past screenings are left out
- 🎥 **Trailers** - Poster and trailers from TMDb, matched by id
- 🏷️ **70mm Marked** - IMAX 70mm print screenings are labelled

### What's on tab

- 🎬 **Every Film Once** - Screen 1 and BFI IMAX films merged, one entry each
- 📝 **Know What It Is** - Poster, summary, certificate, runtime and a trailer
- 🎟️ **Book Per Venue** - Next screening at each venue, plus a link to all times
- 🗓️ **Now and Coming Soon** - This week's films first, later ones below

### Trailers tab

- 🎞️ **Studio Trailers** - Official trailers from 50 studio YouTube channels, last 30 days
- 🏷️ **Studio Filter** - Filter by studio, with per-studio counts
- 🔀 **Co-release Merging** - One trailer posted by two studios collapses into a single card credited to both
- 🚫 **Noise Filtering** - Excludes teasers, streaming-only series and back-catalogue re-uploads

### Box Office tab

- 💷 **UK Weekend Top 10** - Ranked chart with weekend and running totals
- 🔁 **Re-releases** - Matched to the original film's poster and trailer, with an optional display name
- 🎞️ **Trailers** - A playable TMDb trailer per film, falling back to a YouTube search link
- ⭐ **Metadata** - Poster, synopsis, runtime and rating from TMDb

### All three

- 📱 **Mobile First** - Layout, showtime grid and tap targets tuned for phones
- 🌗 **Light & Dark** - Follows the reader's system theme; dark is the light theme inverted
- 🚀 **Auto-Updates** - Rebuilt daily via GitHub Actions when the listings change
- ▶️ **Trailers your way** - Click to play in a pop-up, or middle/Cmd/Ctrl-click to open on YouTube in a new tab

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Hosting:** Cloudflare Pages (global CDN)
- **CI/CD:** GitHub Actions (checks at 07:37 and 21:37 UTC)
- **Testing:** Vitest (177 tests)
- **APIs:** Picturehouse, TMDb, OMDB, YouTube Data API v3, Box Office Mojo (scraped), Clusterflick (BFI IMAX)

All API calls happen at **build time** inside Nitro server routes, so no keys ever
reach the browser and the deployed site is plain static HTML.

## Local Development

### Prerequisites

- Node.js 22+ (the lint toolchain requires it - `eslint-plugin-unicorn` uses `Set.prototype.union`)
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Komsomol/pichouse-ssr.git
   cd pichouse-ssr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (copy from example):
   ```bash
   cp .env.example .env
   ```

4. Fill in your API keys in `.env`:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `TMDB_TOKEN` | ✅ | TMDb API Read Access Token (starts `eyJ`) - film metadata and trailers |
   | `COOKIE` | ✅ | Picturehouse website cookie - showtimes |
   | `OMDB_API_KEY` | ➖ | Fallback trailer lookup when TMDb has no video |
   | `YT_API_KEY` | ➖ | YouTube Data API v3 key - powers the Trailers tab |

   The build fails without the two required values. Without the optional ones it
   still succeeds: the Trailers tab simply renders empty without `YT_API_KEY`.

### Development Server

```bash
npm run dev
```

Access at: http://127.0.0.1:3000

### Run Tests

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Generate Static Site

```bash
npm run generate
```

Output is in `.output/public/`. Note that `generate`, `build` and `dev` each run
`validate:env` and `lint` first, and `generate`/`build` also run the tests - so a
lint error or failing test stops a deploy.

### Preview Production Build

```bash
npm run preview
```

## Deployment

Two GitHub Actions workflows deploy to Cloudflare Pages via Wrangler. See
[DEPLOYMENT.md](./DEPLOYMENT.md) for setup details.

| Workflow | Triggers | Behaviour |
| --- | --- | --- |
| `smart-deploy.yml` | 07:37 + 21:37 UTC, manual | Fingerprints the Picturehouse feed and BFI IMAX listings, and only rebuilds when either changed |
| `deploy.yml` | Push to `main`, manual | Always rebuilds and deploys |

`smart-deploy.yml` owns the schedule. Its two runs land just after the two daily
BFI IMAX data releases from Clusterflick; `deploy.yml` covers code changes. It
also re-enables itself through the API on each run, because GitHub disables
scheduled workflows after 60 days without repository activity.

Because the fingerprint only covers Picturehouse and BFI IMAX listings, a run
with no listing changes skips the build, and new studio trailers wait for the
next one.

### Manual Deployment

Push to `main` triggers a deployment:

```bash
git push origin main
```

Or trigger manually in GitHub Actions → "Deploy to Cloudflare Pages" → "Run workflow".

## Project Structure

```
├── .github/workflows/     # Daily (smart-deploy) and push (deploy) pipelines
├── components/
│   ├── NavTabs.vue        # Movies / IMAX / What's on / Trailers / Box Office / About
│   ├── movies/            # Movie list composable, styles, video modal
│   ├── trailers/          # Trailer list composable and styles
│   └── boxoffice/         # Box office list composable and styles
├── pages/
│   ├── index.vue          # Movies tab
│   ├── imax.vue           # IMAX tab
│   ├── whats-on.vue       # What's on tab
│   ├── trailers.vue       # Trailers tab
│   ├── boxoffice.vue      # Box Office tab
│   └── about.vue          # About tab
├── server/
│   ├── api/
│   │   ├── movies.js           # Movies tab endpoint
│   │   ├── picturehouseApi.js  # Picturehouse feed
│   │   ├── tmdbApi.js          # TMDb integration
│   │   ├── omdbApi.js          # OMDB fallback
│   │   ├── filterMovies.js     # Title sanitising and cinema filtering
│   │   ├── trailers.js         # Studio trailers endpoint
│   │   ├── youtubeApi.js       # YouTube Data API v3
│   │   ├── filterTrailers.js   # Trailer filtering, sorting, dedup
│   │   ├── boxoffice.js        # UK box office top 10 endpoint
│   │   ├── boxOfficeApi.js     # Box Office Mojo scraper
│   │   ├── filterBoxOffice.js  # Chart parsing (film name, re-release label)
│   │   ├── imax.js             # BFI IMAX endpoint
│   │   ├── imaxApi.js          # Clusterflick BFI IMAX data
│   │   ├── filterImax.js       # Sold-out filtering, London-time formatting
│   │   ├── whatson.js          # What's on endpoint (from Movies + IMAX)
│   │   └── filterWhatsOn.js    # Per-film merging, now / coming soon
│   └── utils/
│       ├── constants.js   # Cinema IDs, screening rules, trailer and box office config
│       ├── channels.js    # Studio YouTube channels
│       ├── helpers.js     # Showtime helpers
│       └── cache.js       # In-memory TTL caches
├── scripts/               # Environment validation, post-build check
├── .env.example           # Environment template
├── DEPLOYMENT.md          # Deployment documentation
└── CLAUDE.md              # AI context documentation
```

## Configuration

### Target Cinemas

Edit `server/utils/constants.js`:
```javascript
CINEMA_IDS: {
  FINSBURY_PARK: '029',
  PICTUREHOUSE_CENTRAL: '022'
}
```

### Showtime Filters

- **Weekdays:** After 6 PM only
- **Weekends:** All times
- **Screen:** Screen 1 only

### Trailer Filters

Edit `TRAILER_CONFIG` in `server/utils/constants.js`:

- **SEARCH_KEYWORDS** - a title must contain one of these (`official trailer`, `final trailer`)
- **EXCLUDED_KEYWORDS** - and none of these (teasers, blu-ray, series markers)
- **DAYS_RANGE** - lookback window in days (30)
- **MAX_RELEASE_YEAR_AGE** - rejects re-uploads whose title names an older release year
- **PER_PAGE** - trailers per page (20)

Add or remove studios in `server/utils/channels.js`. Each entry needs a display
name and a YouTube channel ID; the uploads playlist is derived from the ID, so no
extra lookup is needed.

### Box Office

Edit `BOX_OFFICE_CONFIG` in `server/utils/constants.js`:

- **TOP_N** - how many films to keep (10)
- **YEAR_INDEX_PATH** - Box Office Mojo's British weekend index, read to find the
  latest published chart
- **TITLE_ALIASES** - display names for chart entries Mojo lists under the
  original film, keyed by `"<title> (<label>)"`, e.g.
  `'Avengers: Endgame (2026 Re-release)': 'Avengers Endgame: Encore'`. TMDb is
  still searched on the original title.

Grosses are shown as Box Office Mojo reports them, in **US dollars**. The chart
itself needs no API key; posters, synopses, runtimes, ratings and trailers come
from TMDb via `TMDB_TOKEN`.

### BFI IMAX

`IMAX_CONFIG` in `server/utils/constants.js` points at Clusterflick's daily
BFI IMAX release asset. BFI's own booking site blocks automated requests, so
the build does not read it directly. No API key is needed.

## Credits

BFI IMAX listings are from [Clusterflick](https://clusterflick.com), used under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The Trailers tab is ported from the
[Movie-Trailers](https://github.com/Komsomol/Movie-Trailers) project, adapted from
its Express backend to build-time static generation.

The Box Office tab is ported from the
[uk_top_10_scraper](https://github.com/Komsomol/uk_top_10_scraper) project. Its
source, britinfo.net, stopped publishing in September 2025, so the same two-step
scrape now runs against Box Office Mojo's British weekend chart.

## License

MIT
