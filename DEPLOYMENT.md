# Automated Deployment to Cloudflare Pages

This project uses **GitHub Actions** + **Cloudflare Pages** for fully automated deployments. Movie data is refreshed daily without any manual intervention.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Daily 6 AM UTC)              │
├─────────────────────────────────────────────────────────────────┤
│  1. Checkout code from repository                               │
│  2. Install dependencies (npm ci)                               │
│  3. Run tests (npm test)                                        │
│  4. Fetch fresh movie data from Picturehouse API                │
│  5. Generate static HTML (npm run generate)                     │
│  6. Deploy to Cloudflare Pages via Wrangler CLI                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages (CDN)                       │
├─────────────────────────────────────────────────────────────────┤
│  • Global edge network (fast worldwide)                         │
│  • Automatic HTTPS                                              │
│  • URL: https://pichouse-ssr.pages.dev                          │
│  • Custom domain support                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

| Component | Role |
|-----------|------|
| **GitHub Actions** | Scheduler + CI/CD runner (runs builds on schedule) |
| **Wrangler CLI** | Cloudflare's CLI tool (creates project & deploys) |
| **Cloudflare Pages** | Static site hosting with global CDN |
| **Nuxt 3** | Generates static HTML at build time |
| **TMDb/OMDB APIs** | Movie metadata, trailers, posters |
| **Picturehouse API** | Cinema showtimes and availability |

## Workflow Files

### `deploy.yml` - Push Deploy
- Triggers on every push to `main`, plus manual dispatch
- No schedule - the daily build belongs to `smart-deploy.yml`
- Always builds (doesn't check for changes)
- Good for: Reliability, simplicity

### `smart-deploy.yml` - Smart Deploy
- Runs daily at 6 AM UTC
- Checks if Picturehouse movie data has changed
- Skips build if data unchanged (saves GitHub Actions minutes)
- Good for: Efficiency, reducing unnecessary builds

## Setup Guide

### Prerequisites
- GitHub repository (public or private)
- Cloudflare account (free tier works)
- API keys for TMDb and OMDB

### Step 1: Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token** → **Custom token**
3. Configure:
   - **Token name:** `GitHub Actions Deploy`
   - **Permissions:** `Account` → `Cloudflare Pages` → `Edit`
   - **Account Resources:** `Include` → Your account
4. Click **Continue to summary** → **Create Token**
5. **Copy the token immediately** (you won't see it again!)

### Step 2: Get Your Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on any domain or go to **Workers & Pages**
3. Find **Account ID** in the right sidebar (32-character hex string)

### Step 3: Add GitHub Repository Secrets

Go to: `GitHub Repo` → `Settings` → `Secrets and variables` → `Actions`

Add these 6 secrets:

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Token from Step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from Step 2 |
| `TMDB_TOKEN` | Your TMDb API Read Access Token (starts with `eyJ...`) |
| `OMDB_API_KEY` | Your OMDB API key |
| `COOKIE` | Picturehouse website cookie (for API access) |
| `YT_API_KEY` | YouTube Data API v3 key (powers the Trailers tab) |

Note that `gh secret set NAME` needs the value piped in or typed at its prompt.
Run non-interactively with neither, it stores an empty string - the secret then
appears in `gh secret list` while the build behaves as though it is unset.

### Step 4: Trigger First Deployment

1. Go to your repo's **Actions** tab
2. Select **Deploy to Cloudflare Pages**
3. Click **Run workflow** → **Run workflow**
4. Watch the build complete (~1-2 minutes)

The Wrangler CLI will automatically create the Cloudflare Pages project on first deploy!

### Step 5: Verify Deployment

Your site is now live at: `https://pichouse-ssr.pages.dev`

## Custom Domain Setup (Optional)

To use a custom domain like `cinema.yourdomain.com`:

1. Go to Cloudflare Dashboard → **Workers & Pages** → **pichouse-ssr**
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter your subdomain (e.g., `cinema.yourdomain.com`)
5. Add the CNAME record to your DNS:
   ```
   CNAME  cinema  pichouse-ssr.pages.dev
   ```
6. Wait for SSL certificate (usually instant if domain is on Cloudflare)

## Schedule Configuration

The daily schedule lives in `.github/workflows/smart-deploy.yml`. `deploy.yml` has
no cron - it runs on push and manual dispatch only, so the two do not both
rebuild every morning.

```yaml
schedule:
  - cron: '0 6 * * *'  # Daily at 6 AM UTC
```

**Common schedules:**
| Cron | Description |
|------|-------------|
| `0 6 * * *` | Daily at 6 AM UTC |
| `0 6 * * 0` | Weekly on Sundays |
| `0 6 * * 1,4` | Monday and Thursday |
| `0 */12 * * *` | Every 12 hours |

## Monitoring & Notifications

### Build Status
- Check the **Actions** tab in GitHub for build logs
- GitHub sends email notifications on workflow failures (enabled by default)

### Configure Notifications
Go to: `GitHub` → `Settings` → `Notifications` → `Actions`

Options:
- Email on failure only
- Email on all runs
- Disable notifications

### Cloudflare Dashboard
- View deployment history: **Workers & Pages** → **pichouse-ssr** → **Deployments**
- Check usage/bandwidth: **Workers & Pages** → **Overview**

## Costs

### GitHub Actions
- **Public repos:** ✅ Free (unlimited minutes)
- **Private repos:** 2,000 free minutes/month, then $0.008/minute

### Cloudflare Pages (Free Tier)
- ✅ 500 builds/month (daily = ~30 builds, plenty of headroom)
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ Automatic HTTPS
- ✅ Custom domains

**Total cost for this project: $0/month** 🎉

## Troubleshooting

### "Project not found" Error
The Wrangler CLI should auto-create the project. If it fails:
1. Check `CLOUDFLARE_API_TOKEN` has `Cloudflare Pages: Edit` permission
2. Check `CLOUDFLARE_ACCOUNT_ID` is correct
3. Try running workflow again

### Build Fails - "TMDB_TOKEN not found"
Ensure all 5 secrets are added in GitHub → Settings → Secrets → Actions

### Site Shows Old Data
1. Check GitHub Actions logs - was the build successful?
2. For smart-deploy: data might be unchanged (working as intended)
3. Manually trigger with "Force deploy" option

### Tests Failing
Run locally first: `npm test`
Fix any issues, then push to trigger new deployment

### Custom Domain SSL Issues
1. Ensure domain is proxied through Cloudflare (orange cloud)
2. Check SSL/TLS mode is "Full" or "Full (strict)"
3. Wait up to 24 hours for DNS propagation

## Local Development vs Production

| Aspect | Local (`npm run dev`) | Production (Cloudflare) |
|--------|----------------------|-------------------------|
| Data refresh | On each page load | Once per day (at build) |
| URL | `localhost:4000` | `pichouse-ssr.pages.dev` |
| API calls | Direct to TMDb/OMDB/Picturehouse | Pre-fetched at build time |
| Speed | Slower (fetching data) | Fast (static HTML) |

## Files Overview

```
.github/
  workflows/
    deploy.yml         # Push and manual deployment
    smart-deploy.yml   # Daily deployment (checks for changes first)

.env.example           # Template for environment variables
DEPLOYMENT.md          # This file
```
