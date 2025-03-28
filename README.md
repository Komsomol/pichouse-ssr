# PicHouse SSR - Picturehouse Cinema Schedule App

This project creates a statically generated website showing movie showtimes for Picturehouse Cinemas. It fetches data from the Picturehouse website and generates a clean, user-friendly schedule.

## Features

-   Displays current movie listings from Picturehouse Cinemas
-   Filters movies by cinema location
-   Removes duplicate listings and cleans up movie titles
-   Statically generated pages for fast loading and SEO benefits
-   Automatic deployment to Surge hosting

## Project Structure

api - Server API utilities for fetching and processing movie data
utils - Client-side utilities including data fetching helpers
generateMoviesJson.js - Script to pre-fetch movie data for static generation

# Setup

Make sure to install the dependencies:

## Environment Configuration

Create a .env file in the project root with the following variables:

The cookie is required for API authentication with the Picturehouse website.

# Development Workflow

Generate Fresh Movie Data
Before development, fetch the latest movie data:

## Start Development Server

Run the development server (default port 4000):

`npm run dev`

Access the development site at http://localhost:4000

# Building for Production

## Generate Static Site

To build the static site with the latest movie data:

This command:
`npm run deploy`

1. Fetches the latest movie data
2. Generates static HTML files
3. Deploys to pichouse.surge.sh

## Manual Deployment Steps

If you want to build without deploying:

### Fetch fresh movie data

`npm run fetch-movies`

### Generate static site

`npm run generate`

### Preview locally

`npm run preview`
