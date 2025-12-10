# Picturehouse Screen 1 Movie Tracker

## Overview

Nuxt 3 app displaying movies on **Screen 1** (premium screen) at Finsbury Park and Picturehouse Central, **after 6 PM**, with direct booking links.

## Tech Stack

- **Framework:** Nuxt 3 (client-side only, `ssr: false`)
- **UI:** Vue 3 Composition API
- **Testing:** Vitest + happy-dom (45 tests)
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb
- **Concurrency:** p-limit (max 5 parallel requests)
- **Caching:** In-memory TTL-based (6hr TMDb, 1hr Picturehouse)

## Architecture

```
Client (pages/index.vue)
    |
    v useFetch('/api/movies')
    |
Server API (/server/api/movies.js)
    |-- fetchMoviesFromPicturehouse() [cached 1hr]
    |-- Enrich with TMDb [cached 6hr, 5 concurrent]
    |-- Filter: Screen 1, after 6PM, target cinemas
    |-- Generate booking URLs
    |-- Sort by earliest showtime
    v
Return JSON to client
```

**No global state management** - component-local refs only. Pinia is not needed.

## Key Files

| File | Purpose |
|------|---------|
| `/server/api/movies.js` | Main API orchestrator |
| `/server/api/picturehouseApi.js` | Picturehouse API client |
| `/server/api/tmdbApi.js` | TMDb API client |
| `/server/api/filterMovies.js` | Title sanitization, deduplication |
| `/server/utils/constants.js` | Cinema IDs, screen config, URLs |
| `/server/utils/helpers.js` | Pure utility functions |
| `/server/utils/cache.js` | TTL-based cache |
| `/pages/index.vue` | Single page component |
| `/components/movies/MovieListScript.js` | Composable for pagination/loading |
| `/components/movies/VideoModal.vue` | Trailer modal |

## Configuration

Located in `/server/utils/constants.js`:

```javascript
CINEMA_IDS: { FINSBURY_PARK: '001', PICTUREHOUSE_CENTRAL: '021' }
TARGET_CINEMA_IDS: ['001', '021']
SCREENING_CONFIG: {
  SCREEN_NAME: 'Screen 1',
  MIN_HOUR: 18,
  BOOKING_URL_TEMPLATE: 'https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats'
}
MAX_CONCURRENT_TMDB_REQUESTS: 5
```

## Environment Variables

Required in `.env`:
```
TMDB_API_KEY=your_tmdb_api_key
```

Validated at startup by `scripts/validate-env.js`.

## Commands

```bash
npm run dev          # Start dev server (port 4000)
npm test             # Run Vitest tests
npm run lint:fix     # Auto-fix ESLint issues
npm run build        # Production build
npm run generate     # Static site generation
```

## Testing

Tests must pass before builds. Run `npm test` after changes.

Test files:
- `server/api/__tests__/filterMovies.test.js`
- `server/utils/__tests__/cache.test.js`
- `components/movies/__tests__/MovieListScript.test.js`

## Code Style

- Vue 3 Composition API with `<script setup>`
- Pure JavaScript (no TypeScript)
- Functional programming: pure functions, immutability
- ESLint must be clean

## Critical Rules

1. **Preserve Screen 1 filtering** - core feature
2. **Maintain 6 PM time filter** - users want evening screenings
3. **Keep booking URL pattern** - `https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats`
4. **Preserve chronological sorting** - earliest showtimes first
5. **Don't add filter UI** - intentionally removed
6. **Don't add Pinia** - not needed, state is component-local
7. **Don't migrate from Nuxt** - server routes are essential for API key protection
8. **Tests must pass** - run `npm test` after changes
9. **ESLint must pass** - run `npm run lint:fix` if needed

## Common Tasks

### Add New Cinema
1. Add ID to `CINEMA_IDS` in `constants.js`
2. Add name to `CINEMA_NAMES` mapping
3. Add to `TARGET_CINEMA_IDS` array

### Change Screen/Time Filter
Edit `SCREENING_CONFIG` in `constants.js`

### Add Title Exclusions
Add patterns to `stringsToRemove` in `filterMovies.js` `sanitizeMovieTitle()`

### Adjust Cache TTL
Edit `CACHE_TTL` in `picturehouseApi.js` or `tmdbApi.js`

## Known Limitations

- BFI IMAX not supported (different ticketing system)
- In-memory cache resets on server restart
- No user accounts (redirects to Picturehouse for booking)
