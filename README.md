# PicHouse SSR - Picturehouse Cinema Schedule

[![Live Site](https://img.shields.io/badge/🎬_Live_Site-pichouse--ssr.pages.dev-blue?style=for-the-badge)](https://pichouse-ssr.pages.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare_Pages-orange?style=flat-square)](https://pichouse-ssr.pages.dev)
[![Daily Build](https://github.com/Komsomol/pichouse-ssr/actions/workflows/deploy.yml/badge.svg)](https://github.com/Komsomol/pichouse-ssr/actions/workflows/deploy.yml)

A statically generated website displaying movie showtimes for Picturehouse Cinemas (Finsbury Park & Picturehouse Central). Features movie trailers, ratings, and direct booking links.

### 🔗 **[View Live Site → pichouse-ssr.pages.dev](https://pichouse-ssr.pages.dev)**

## Features

- 🎬 **Movie Listings** - Screen 1 showtimes from Finsbury Park & Picturehouse Central
- 🎥 **Trailers** - YouTube trailers via TMDb/OMDB integration
- ⭐ **Ratings** - TMDb ratings and movie metadata
- 🎟️ **Booking Links** - Direct links to Picturehouse booking
- 📅 **Smart Filtering** - Weekday evenings (after 6 PM) + all weekend showtimes
- 🚀 **Auto-Updates** - Daily deployment via GitHub Actions

## Tech Stack

- **Framework:** Nuxt 3 (Static Site Generation)
- **Hosting:** Cloudflare Pages (global CDN)
- **CI/CD:** GitHub Actions (daily builds at 6 AM UTC)
- **APIs:** Picturehouse, TMDb, OMDB

## Local Development

### Prerequisites

- Node.js 20+
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
   - `TMDB_TOKEN` - TMDb API Read Access Token
   - `OMDB_API_KEY` - OMDB API key
   - `COOKIE` - Picturehouse website cookie

### Development Server

```bash
npm run dev
```

Access at: http://localhost:4000

### Run Tests

```bash
npm test
```

### Generate Static Site

```bash
npm run generate
```

Output is in `.output/public/`

### Preview Production Build

```bash
npm run preview
```

## Deployment

The site auto-deploys daily via GitHub Actions. See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup details.

### Manual Deployment

Push to `main` branch triggers automatic deployment:

```bash
git push origin main
```

Or trigger manually in GitHub Actions → "Deploy to Cloudflare Pages" → "Run workflow"

## Project Structure

```
├── .github/workflows/     # GitHub Actions (daily deployment)
├── components/            # Vue components
├── pages/                 # Nuxt pages (index.vue)
├── server/
│   ├── api/              # Server API routes
│   │   ├── movies.js     # Main movie data endpoint
│   │   ├── tmdbApi.js    # TMDb integration
│   │   ├── omdbApi.js    # OMDB integration
│   │   ├── picturehouseApi.js  # Picturehouse scraper
│   │   └── filterMovies.js     # Movie filtering logic
│   └── utils/            # Server utilities
├── scripts/              # Build scripts
├── .env.example          # Environment template
├── DEPLOYMENT.md         # Deployment documentation
└── CLAUDE.md             # AI context documentation
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

## License

MIT
