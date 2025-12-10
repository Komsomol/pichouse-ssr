# Cloudflare Pages Deployment Setup

This guide walks you through setting up automated deployments to Cloudflare Pages via GitHub Actions.

## Overview

```
GitHub Actions (scheduled daily at 6 AM UTC)
    │
    ├── Checks if movie data has changed
    │   └── If no changes → Skip build (saves minutes)
    │
    ├── Runs tests
    ├── Generates static site with fresh data
    │
    └── Deploys to Cloudflare Pages
            │
            └── https://pichouse-ssr.pages.dev
                (or your custom domain)
```

## Setup Steps

### Step 1: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create a project** → **Direct Upload**
4. Name your project: `pichouse-ssr`
5. Upload any placeholder file (we'll deploy via GitHub later)
6. Click **Save and Deploy**

### Step 2: Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Custom token** option
4. Configure:
   - **Token name:** `GitHub Actions - Pichouse SSR`
   - **Permissions:**
     - `Account` → `Cloudflare Pages` → `Edit`
   - **Account Resources:**
     - `Include` → `Your Account`
5. Click **Continue to summary** → **Create Token**
6. **Copy the token** (you won't see it again!)

### Step 3: Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | The token you created in Step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | `97f7a5d148038c354c06751ca74d44e1` |
| `TMDB_TOKEN` | Your TMDb API token (from .env) |
| `OMDB_API_KEY` | `b78dca4e` |
| `COOKIE` | Your Picturehouse cookie (from .env) |

### Step 4: Test the Deployment

1. Go to **Actions** tab in your GitHub repo
2. Select **Smart Deploy (Only if Data Changed)**
3. Click **Run workflow** → **Run workflow**
4. Watch it build and deploy!

### Step 5: Set Up Custom Domain (Optional)

To use `cinema.voidcat.com`:

1. In Cloudflare Pages → your project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `cinema.voidcat.com`
4. Follow the DNS instructions (usually adding a CNAME record)

## Workflow Files

### `deploy.yml` - Simple Deploy
- Deploys on every push to `main`
- Also runs daily at 6 AM UTC
- Always builds (doesn't check for changes)

### `smart-deploy.yml` - Smart Deploy (Recommended)
- Runs daily at 6 AM UTC
- Checks if movie data has changed
- Only builds if data is different (saves build minutes)
- Can be force-triggered manually

## Changing the Schedule

Edit the cron schedule in `.github/workflows/smart-deploy.yml`:

```yaml
schedule:
  - cron: '0 6 * * *'  # Daily at 6 AM UTC
```

Common schedules:
- `0 6 * * *` - Daily at 6 AM UTC
- `0 6 * * 0` - Weekly on Sunday at 6 AM UTC
- `0 6 * * 1,4` - Monday and Thursday at 6 AM UTC
- `0 */6 * * *` - Every 6 hours

## Monitoring

- **Build logs:** GitHub Actions tab
- **Deployment status:** Cloudflare Pages dashboard
- **Usage:** Cloudflare dashboard → Workers & Pages → Usage

## Costs

### GitHub Actions (Public Repo)
- ✅ **Free** - unlimited minutes for public repos

### Cloudflare Pages (Free Tier)
- ✅ 500 builds/month (daily = ~30 builds)
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ Custom domains with HTTPS

## Troubleshooting

### Build fails with "TMDB_TOKEN not found"
Make sure you added all secrets in GitHub → Settings → Secrets → Actions

### "Project not found" error
Create the Cloudflare Pages project first (Step 1)

### Site shows old data
Check the GitHub Actions logs - the build might have been skipped due to no data changes.
Use the "Force deploy" option in manual trigger.

### Custom domain not working
1. Check DNS propagation (can take up to 24 hours)
2. Ensure CNAME points to `pichouse-ssr.pages.dev`
3. Check Cloudflare Pages → Custom domains for SSL status

