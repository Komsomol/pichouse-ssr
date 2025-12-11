# Picturehouse Screen 1 Movie Tracker

## Overview

Nuxt 3 app displaying movies on **Screen 1** (premium screen) at Finsbury Park and Picturehouse Central. Filters to **weekday evenings (after 6 PM)** and **all weekend times**, with direct booking links and trailers.

**Live URL:** https://pichouse-ssr.pages.dev

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Hosting:** Cloudflare Pages (global CDN)
- **CI/CD:** GitHub Actions (daily builds at 6 AM UTC)
- **UI:** Vue 3 Composition API
- **Testing:** Vitest + happy-dom
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb, OMDB
- **Concurrency:** p-limit (max 5 parallel requests)
- **Caching:** In-memory TTL-based (6hr TMDb, 1hr Picturehouse)

## Architecture

```
GitHub Actions (Daily 6 AM UTC)
    │
    ├── npm run generate
    │
    ▼
Server API (/server/api/movies.js)
    │
    ├── fetchMoviesFromPicturehouse() [cached 1hr]
    ├── Filter: Screen 1, target cinemas, valid times
    ├── Deduplicate by original title
    ├── Enrich with TMDb [cached 6hr, 5 concurrent]
    │   └── Fallback to OMDB if no TMDb trailers
    ├── Generate booking URLs
    ├── Sort by earliest showtime
    │
    ▼
Static HTML → Cloudflare Pages CDN
    │
    ▼
https://pichouse-ssr.pages.dev
```

**No global state management** - component-local refs only.

## Key Files

| File | Purpose |
|------|---------|
| `/server/api/movies.js` | Main API orchestrator |
| `/server/api/picturehouseApi.js` | Picturehouse API client |
| `/server/api/tmdbApi.js` | TMDb API client |
| `/server/api/omdbApi.js` | OMDB API client (fallback) |
| `/server/api/filterMovies.js` | Title sanitization, cleaning for search |
| `/server/utils/constants.js` | Cinema IDs, screen config, URLs |
| `/server/utils/helpers.js` | Pure utility functions |
| `/server/utils/cache.js` | TTL-based cache |
| `/pages/index.vue` | Single page component |
| `/components/movies/VideoModal.vue` | Trailer modal |
| `/.github/workflows/deploy.yml` | Daily deployment workflow |
| `/.github/workflows/smart-deploy.yml` | Smart deployment (checks for changes) |

## Configuration

Located in `/server/utils/constants.js`:

```javascript
CINEMA_IDS: { FINSBURY_PARK: '029', PICTUREHOUSE_CENTRAL: '022' }
TARGET_CINEMA_IDS: ['029', '022']
SCREENING_CONFIG: {
  SCREEN_NAME: 'Screen 1',
  MIN_HOUR: 18,  // Only applies to weekdays
  BOOKING_URL_TEMPLATE: 'https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats'
}
MAX_CONCURRENT_TMDB_REQUESTS: 5
```

## Environment Variables

Required in `.env`:
```
TMDB_TOKEN=eyJ...          # TMDb API Read Access Token
OMDB_API_KEY=your_key      # OMDB API key (fallback for trailers)
COOKIE=your_cookie         # Picturehouse website cookie
```

For deployment (also in GitHub Secrets):
```
CLOUDFLARE_API_TOKEN=...   # Cloudflare Pages Edit permission
CLOUDFLARE_ACCOUNT_ID=...  # Your Cloudflare account ID
```

Validated at startup by `scripts/validate-env.js`.

## Commands

```bash
npm run dev          # Start dev server (port 4000)
npm test             # Run Vitest tests
npm run lint:fix     # Auto-fix ESLint issues
npm run generate     # Static site generation
npm run preview      # Preview generated site
```

## Deployment

Automated via GitHub Actions:
- **Daily at 6 AM UTC** - automatic build and deploy
- **On push to main** - triggers deployment
- **Manual trigger** - via GitHub Actions UI

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup guide.

## Testing

Tests must pass before builds. Run `npm test` after changes.

Test files:
- `server/api/__tests__/filterMovies.test.js`
- `server/utils/__tests__/cache.test.js`
- `server/utils/__tests__/helpers.test.js`
- `server/utils/__tests__/env-validation.test.js`
- `components/movies/__tests__/MovieListScript.test.js`

## Code Style

- Vue 3 Composition API with `<script setup>`
- Pure JavaScript (no TypeScript)
- Functional programming: pure functions, immutability
- ESLint must be clean

## Critical Rules

1. **Preserve Screen 1 filtering** - core feature
2. **Time filter logic:**
   - Weekdays (Mon-Fri): after 6 PM only
   - Weekends (Sat-Sun): all times
3. **Keep booking URL pattern** - `https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats`
4. **Preserve chronological sorting** - earliest showtimes first
5. **Use original Picturehouse titles** - for display (shows special screenings like "35mm", "Q&A")
6. **Use cleaned titles for API search** - `cleanTitleForSearch()` removes suffixes for TMDb/OMDB lookup
7. **Don't add filter UI** - intentionally removed
8. **Don't add Pinia** - not needed, state is component-local
9. **Don't migrate from Nuxt** - server routes protect API keys
10. **Tests must pass** - run `npm test` after changes
11. **ESLint must pass** - run `npm run lint:fix` if needed

## Common Tasks

### Add New Cinema
1. Add ID to `CINEMA_IDS` in `constants.js`
2. Add name to `CINEMA_NAMES` mapping
3. Add to `TARGET_CINEMA_IDS` array

### Change Screen/Time Filter
Edit `SCREENING_CONFIG` in `constants.js`

### Add Title Exclusions
Add patterns to `stringsToRemove` in `filterMovies.js` `cleanTitleForSearch()`

### Adjust Cache TTL
Edit `CACHE_TTL` in `picturehouseApi.js` or `tmdbApi.js`

### Force Deployment
1. Go to GitHub Actions
2. Select "Deploy to Cloudflare Pages"
3. Click "Run workflow"

## Known Limitations

- BFI IMAX not supported (different ticketing system)
- In-memory cache resets on server restart (irrelevant for static builds)
- No user accounts (redirects to Picturehouse for booking)
- New movies only show if they have trailers on TMDb or OMDB
