# Picturehouse Screen 1 Movie Tracker - AI Documentation

**Project Working Directory:** `/Users/farhad/Documents/Fliplet/pichouse-ssr`

## Project Overview

This is a Nuxt 3 application that displays movies screening on **Screen 1** (the premium screen) at select Picturehouse cinemas **after 6 PM**, with direct booking links. The application fetches data from the Picturehouse API (Vista Cinema system) and enriches it with TMDb metadata (trailers, posters, release dates, overviews).

### Primary Purpose
Allow users to quickly see what films are playing on Screen 1 (the best screen) at Finsbury Park and Picturehouse Central, sorted chronologically by upcoming showtimes, with one-click booking.

### Key Features
- Filters movies to **Screen 1 only** at **two specific cinemas**
- Shows only screenings **after 18:00 (6 PM)**
- Displays only movies with **video trailers**
- Generates **direct booking URLs** to Picturehouse ticketing system
- **Chronologically sorted** by earliest upcoming showtime
- **Pagination** for more than 10 movies
- **Loading messages** with rotating cinema-themed text
- **Responsive design** matching voidkat.com aesthetic
- **In-memory caching** (6hr TMDb, 1hr Picturehouse)
- **Concurrency control** (max 5 concurrent TMDb requests)

---

## Technical Architecture

### Stack
- **Framework:** Nuxt 3 (SSR mode disabled: `ssr: false`)
- **UI Library:** Vue 3 Composition API
- **Testing:** Vitest with happy-dom (45 tests)
- **Linting:** ESLint with @nuxt/eslint-config
- **APIs:** Picturehouse (Vista Cinema), TMDb
- **Concurrency Control:** p-limit
- **Caching:** In-memory TTL-based caching

### Design Aesthetic (voidkat.com Match)
- **Fonts:** Merriweather (serif body), Open Sans (sans-serif headings)
- **Colors:** White background, dark text (`hsla(0, 0%, 0%, 0.9)`), #f92300 red accent
- **Spacing:** 1.78rem vertical rhythm
- **Font Size:** 112.5% base (18px)
- **Line Height:** 1.78

---

## Configuration Constants

### Cinema IDs (Vista Cinema System)
```javascript
FINSBURY_PARK: '001'
PICTUREHOUSE_CENTRAL: '021'
```

### Screening Configuration
```javascript
SCREEN_NAME: 'Screen 1'
MIN_HOUR: 18  // 6 PM
BOOKING_URL_TEMPLATE: 'https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats'
```

### Performance Configuration
```javascript
MAX_CONCURRENT_TMDB_REQUESTS: 5
```

### Cache TTL
- **TMDb cache:** 6 hours (21,600,000ms)
- **Picturehouse cache:** 1 hour (3,600,000ms)

---

## Key Files and Purpose

### `/server/utils/constants.js`
**Purpose:** Centralized configuration to eliminate magic strings and improve maintainability.

**Exports:**
- `CINEMA_IDS` - Cinema identifier mapping
- `CINEMA_NAMES` - Human-readable cinema names
- `TARGET_CINEMA_IDS` - Array of cinemas to include in filtering
- `SCREENING_CONFIG` - Screen name, minimum hour, booking URL template
- `PERFORMANCE_CONFIG` - Concurrency limits

### `/server/utils/helpers.js`
**Purpose:** Reusable pure utility functions.

**Functions:**
- `createFallbackVideos(trailerUrl)` - Creates fallback video array from trailer URL
- `isAfterMinHour(showtimeString, minHour)` - Checks if showtime is after minimum hour
- `generateBookingUrl(cinemaId, sessionId, template)` - Generates booking URL from template

### `/server/api/movies.js`
**Purpose:** Main API endpoint orchestrating data fetching, enrichment, filtering, and sorting.

**Flow:**
1. Fetch raw movies from Picturehouse API
2. Filter by cinema ID '031' and remove duplicates
3. Enrich each movie with TMDb data (concurrency-limited to 5 parallel requests)
4. Deduplicate by title
5. Filter showtimes to Screen 1, after 6 PM, at target cinemas
6. Generate booking URLs for each showtime
7. Filter out movies without videos or showtimes
8. Sort chronologically by earliest upcoming showtime
9. Return final array

**Key Logic:**
```javascript
// Screen 1 filtering
const screen1Showtimes = (movie.show_times || []).filter((showtime) => {
  const isScreen1 = showtime.ScreenName === SCREENING_CONFIG.SCREEN_NAME;
  const isTargetCinema = TARGET_CINEMA_IDS.includes(showtime.CinemaId);
  const meetsTimeRequirement = isAfterMinHour(showtime.Showtime, SCREENING_CONFIG.MIN_HOUR);
  return isScreen1 && isTargetCinema && meetsTimeRequirement;
});

// Chronological sorting
moviesWithScreen1Showtimes.sort((a, b) => {
  const earliestA = new Date(Math.min(...a.screen1Showtimes.map(s => new Date(s.Showtime))));
  const earliestB = new Date(Math.min(...b.screen1Showtimes.map(s => new Date(s.Showtime))));
  return earliestA - earliestB; // Ascending order (soonest first)
});
```

### `/server/api/filterMovies.js`
**Purpose:** Movie title sanitization and duplicate removal.

**Functions:**
- `sanitizeMovieTitle(title)` - Removes unwanted patterns like ratings, special event text, parenthetical info
- `filterMoviesByCinemaAndRemoveDuplicates(movies, cinemaId)` - Filters by cinema and deduplicates

**Special Event Patterns Removed:**
- `+ Mulled Wine & Festive Cakes`
- `+ Prosecco & Popcorn`
- `+ PJ Party`
- `+ Q&A`
- `- Preview`
- `FILM CLUB:`
- `NT Live:`
- Ratings like `(PG)`, `(U)`
- Years in parentheses `(1984)`

### `/server/api/picturehouseApi.js`
**Purpose:** Fetches movies from Picturehouse API with caching.

**API Endpoint:** `https://www.picturehouses.com/api/screenings`
**Cache:** 1 hour TTL

### `/server/api/tmdbApi.js`
**Purpose:** Fetches movie metadata from TMDb with caching.

**Endpoints:**
- `/search/movie` - Search for movie by title
- `/movie/{id}` - Get movie details
- `/movie/{id}/videos` - Get trailers
- `/movie/{id}/images` - Get poster

**Cache:** 6 hours TTL

**Note:** Uses `findLatest` parameter for movies tagged with "discover picturehouse_presents" to find the original/restored version.

### `/components/movies/MovieListScript.js`
**Purpose:** Vue composable for movie list logic.

**Exports:**
- `movies` - Full movie array from API
- `paginatedMovies` - Current page slice (10 per page)
- `pending` - Loading state
- `error` - Error state
- `formatDate` - Date formatting function
- `currentPage` - Current page number
- `totalPages` - Total page count
- `goToPage` - Page navigation function
- `loadingMessage` - Rotating loading message

**Loading Messages:** 12 cinema-themed messages that rotate every 2 seconds (e.g., "🎬 Finding the best seats in Screen 1...", "🍿 Popping fresh popcorn...")

### `/pages/index.vue`
**Purpose:** Main page component rendering the movie list.

**Features:**
- Pagination controls (top and bottom, only visible if >10 movies)
- Loading state with spinner and rotating messages
- Error state
- Movie blocks with poster, title, overview, runtime, release date, rating
- Showtime cards with cinema name, date, time, booking button
- Trailer links opening in modal
- Smooth scroll to top on page change

### `/components/movies/MovieListStyles.css`
**Purpose:** Complete styling matching voidkat.com aesthetic.

**Key Styles:**
- Light theme with white background
- Merriweather serif for body text
- Open Sans sans-serif for headings
- #f92300 red accent color
- 1.78rem spacing rhythm
- Responsive breakpoints: 768px, 480px
- Mobile stacks poster vertically, single-column showtimes grid

### `/components/movies/VideoModal.vue`
**Purpose:** Modal component for displaying YouTube trailers in iframe.

---

## Data Flow

```
1. User visits page
   ↓
2. Vue app calls useFetch('/api/movies')
   ↓
3. /api/movies handler executes:
   a. Fetch from Picturehouse API (cached 1hr)
   b. Filter by cinema '031' and deduplicate
   c. Enrich with TMDb data (5 concurrent, cached 6hr)
   d. Deduplicate by title
   e. Filter showtimes (Screen 1, after 6PM, target cinemas)
   f. Generate booking URLs
   g. Filter movies (must have videos and showtimes)
   h. Sort chronologically by earliest showtime
   ↓
4. Return JSON array to client
   ↓
5. Vue renders paginated list (10 per page)
   ↓
6. User clicks "Book Tickets"
   ↓
7. Opens https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats
```

---

## Movie Object Structure

```javascript
{
  ID: "12345",
  Title: "The Matrix",  // Sanitized title
  original_title: "The Matrix",  // From TMDb
  overview: "A computer hacker learns...",  // From TMDb
  release_date: "1999-03-31",  // From TMDb
  Rating: "15",
  RunTime: "136",
  poster: "https://image.tmdb.org/t/p/w500/...",  // From TMDb
  videos: [  // From TMDb
    {
      key: "vKQi3bBA1y8",
      name: "Official Trailer",
      site: "YouTube"
    }
  ],
  screen1Showtimes: [  // Filtered and enriched
    {
      SessionId: "67890",
      CinemaId: "001",
      cinemaName: "Finsbury Park",
      ScreenName: "Screen 1",
      Showtime: "2025-11-20T19:30:00",
      date: "Wednesday 20 Nov",
      time_format: "19:30",
      bookingUrl: "https://web.picturehouses.com/order/showtimes/001-67890/seats"
    }
  ]
}
```

---

## Environment Variables

**Required:**
- `TMDB_API_KEY` - TMDb API key (from https://www.themoviedb.org/settings/api)

**Validated at startup** by `server/utils/validateEnv.js`

---

## Testing

**Framework:** Vitest with happy-dom
**Test Count:** 45 tests
**Coverage:** API utilities, helpers, constants

**Run Tests:**
```bash
npm test
```

---

## Performance Metrics

**First Load (no cache):**
- Picturehouse API: ~200-500ms
- TMDb enrichment: ~2-8s (depends on movie count, max 5 concurrent)
- Total: ~3-10s

**Cached Load:**
- Picturehouse cached: ~10ms
- TMDb cached: ~50-100ms
- Total: ~0.09-0.13s

**Sorting:** 0ms (instant)

---

## Common Tasks

### Add New Cinema
1. Find cinema ID from Picturehouse API response
2. Add to `CINEMA_IDS` in `server/utils/constants.js`
3. Add to `CINEMA_NAMES` mapping
4. Add to `TARGET_CINEMA_IDS` array

### Change Screen Filter
Edit `SCREENING_CONFIG.SCREEN_NAME` in `server/utils/constants.js`

### Change Time Filter
Edit `SCREENING_CONFIG.MIN_HOUR` in `server/utils/constants.js`

### Add Title Exclusions
Add patterns to `stringsToRemove` array in `server/api/filterMovies.js` `sanitizeMovieTitle()` function

### Adjust Concurrency
Edit `PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS` in `server/utils/constants.js`

### Adjust Cache TTL
Edit `CACHE_TTL` constants in:
- `server/api/picturehouseApi.js` (Picturehouse cache)
- `server/api/tmdbApi.js` (TMDb cache)

---

## Known Limitations

1. **BFI IMAX not supported** - Uses different ticketing system (AudienceView vs Vista), no public API
2. **Client-side rendering only** - SSR disabled due to fetch requirements
3. **In-memory cache** - Resets on server restart, not shared across instances
4. **No user accounts** - Purely informational, redirects to Picturehouse for booking

---

## Code Quality

- **ESLint:** Clean with @nuxt/eslint-config
- **Functional Programming:** Pure functions, immutability, no side effects
- **Performance Logging:** Detailed console logs for debugging
- **Error Handling:** Try-catch blocks with fallback data
- **Documentation:** JSDoc comments on all utility functions

---

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run lint         # Lint code
npm run lint:fix     # Auto-fix linting issues
```

---

## Production Deployment

**Current Status:** Not yet deployed
**Intended Use:** Embed on voidkat.com

**Build Command:** `npm run build`
**Output:** `.output/` directory

---

## Recent Changes

1. Enhanced title sanitization (removed special event patterns)
2. Added Screen 1 filtering with booking URLs
3. Added Picturehouse Central alongside Finsbury Park
4. Investigated and decided against BFI IMAX integration
5. Created utility files (constants.js, helpers.js) for code cleanup
6. Added rotating loading messages
7. Removed filter functionality (search/sort) for simplicity
8. Implemented chronological sorting by earliest showtime
9. Matched CSS to voidkat.com aesthetic (light theme, red accent, serif/sans-serif pairing)

---

## Critical Context for AI Agents

- **Always preserve the Screen 1 filtering** - This is the core feature
- **Maintain the 6 PM time filter** - Users specifically want evening screenings
- **Keep booking URLs functional** - Pattern is `https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats`
- **Preserve chronological sorting** - Earliest showtimes first
- **Don't add back filter UI** - It was intentionally removed
- **Match voidkat.com design** - User wants consistent branding
- **Test after changes** - 45 tests must pass
- **ESLint must be clean** - Run `npm run lint:fix` if needed

---

**End of AI Documentation**
