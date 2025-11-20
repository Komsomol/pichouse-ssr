# Deployment Guide

## Setting up GitHub Secrets

To deploy this app to GitHub Pages, you need to configure your API keys as GitHub Secrets.

### Step 1: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/Komsomol/pichouse-ssr
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following two secrets:

#### Secret 1: TMDB_TOKEN
- **Name:** `TMDB_TOKEN`
- **Value:** Your TMDb Read Access Token (starts with "eyJ...")
- **How to get it:**
  1. Go to https://www.themoviedb.org/settings/api
  2. Create an account if you don't have one
  3. Request an API key
  4. Copy the "Read Access Token" (Bearer token)

#### Secret 2: PICTUREHOUSE_COOKIE
- **Name:** `PICTUREHOUSE_COOKIE`
- **Value:** Your Picturehouse cookie string
- **How to get it:**
  1. Go to https://www.picturehouses.com/cinema/finsbury-park
  2. Open DevTools (F12) → Network tab
  3. Refresh the page
  4. Look for API requests
  5. Find the "Cookie" header and copy the entire value

  **Note:** Cookies expire after days/weeks. You'll need to update this secret periodically if the site stops working.

### Step 2: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### Step 3: Trigger Deployment

The deployment will automatically trigger when you push to the `main` branch. You can also manually trigger it:

1. Go to **Actions** tab
2. Click **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

### Step 4: Access Your Site

Once deployed, your site will be available at:
**https://komsomol.github.io/pichouse-ssr/**

## Manual Deployment

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# The built files will be in .output/public/
# Upload the contents to your web server
```

## Environment Variables

For local development, create a `.env` file (use `.env.example` as template):

```bash
cp .env.example .env
```

Then edit `.env` and add your API keys.

## Updating API Keys

### Local Development
Edit your local `.env` file

### GitHub Pages
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click on the secret name (e.g., `PICTUREHOUSE_COOKIE`)
3. Click **Update secret**
4. Paste the new value
5. Re-run the deployment workflow

## Troubleshooting

### Site shows "No movies available"
- Check if your `PICTUREHOUSE_COOKIE` secret has expired
- Update the secret with a fresh cookie value

### Build fails
- Check the Actions tab for error logs
- Verify both secrets are set correctly
- Ensure secret names match exactly: `TMDB_TOKEN` and `PICTUREHOUSE_COOKIE`

### 404 error on GitHub Pages
- Ensure GitHub Pages is enabled in Settings
- Check the deployment status in the Actions tab
- Wait a few minutes for DNS propagation

## Security Notes

- Never commit `.env` file to git (it's in `.gitignore`)
- Keep your API keys confidential
- Rotate cookies periodically
- Use GitHub Secrets for all sensitive data
