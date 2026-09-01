#!/usr/bin/env node

/**
 * Post-generate Build Verification
 *
 * `nuxt generate` exits 0 even when a data source failed: the page catches the
 * error and renders its error container, so a build that fetched nothing still
 * looks like a success and gets deployed over a working site. That is exactly
 * what happened on 31 Aug 2026, when Picturehouse returned a 504 then a 502 and
 * the live site was replaced with "Failed to load movies".
 *
 * This asserts the generated Cinema tab actually holds listings.
 */

/* eslint-disable no-console */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = join(__dirname, '..', '.output', 'public', 'index.html');

// Rendered by pages/index.vue: one per listed film, and the v-else-if branch
// shown when the /api/movies call threw.
const MOVIE_MARKER = 'class="movie-block"';
const ERROR_MARKER = 'class="error-container"';

const html = readFileSync(indexHtml, 'utf8');
const movieCount = html.split(MOVIE_MARKER).length - 1;

if (html.includes(ERROR_MARKER)) {
	console.error('\n❌ Build verification failed: the Cinema tab rendered its error state.\n');
	console.error('   The generated site would show an error instead of listings, so this');
	console.error('   build must not be deployed. Check the Picturehouse fetch above.\n');
	process.exit(1);
}

if (movieCount === 0) {
	console.error('\n❌ Build verification failed: the Cinema tab has no listings.\n');
	console.error(`   Expected at least one "${MOVIE_MARKER}" in ${indexHtml}.\n`);
	process.exit(1);
}

console.log(`\n✅ Build verified: ${movieCount} movies on the Cinema tab.\n`);
