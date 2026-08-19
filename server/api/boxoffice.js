/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchUkTop10 } from './boxOfficeApi';
import { fetchMovieFromTMDb, fetchVideosAndPosterFromTMDb } from './tmdbApi';
// Pure string builder - needs no OMDB key, only lives in that module
import { createYouTubeSearchTrailer } from './omdbApi';
import { BOX_OFFICE_CONFIG, PERFORMANCE_CONFIG } from '../utils/constants';

const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS);

/**
 * Formats a TMDb runtime in minutes for display.
 * @param {number|null} runtime - Runtime in minutes
 * @returns {string} e.g. "145 min", or an empty string
 */
const formatRuntime = runtime => (runtime ? `${runtime} min` : '');

/**
 * Formats a TMDb vote average to one decimal place.
 * @param {number|null} voteAverage - Rating out of 10
 * @returns {string} e.g. "7.9", or an empty string
 */
const formatRating = voteAverage =>
	voteAverage ? voteAverage.toFixed(1) : '';

/**
 * Enriches one chart entry with TMDb metadata and its trailer.
 *
 * TMDb carries a trailer for effectively every film that charts, so the top 10
 * gets a playable video rather than a search link. A film TMDb cannot match
 * still renders - it just falls back to a YouTube search.
 *
 * @param {object} film - Box office chart entry
 * @returns {Promise<object>} Chart entry with metadata and videos
 */
const enrichFilm = async (film) => {
	const movie = await fetchMovieFromTMDb(film.title);

	if (!movie) {
		console.warn(`  ⚠ [Box Office] No TMDb match for "${film.title}"`);
		return {
			...film,
			poster: null,
			plot: '',
			year: '',
			runtime: '',
			rating: '',
			videos: createYouTubeSearchTrailer(film.title),
		};
	}

	const { videos, poster, runtime, voteAverage }
		= await fetchVideosAndPosterFromTMDb(movie.id);

	return {
		...film,
		poster,
		plot: movie.overview || '',
		year: (movie.release_date || '').slice(0, 4),
		runtime: formatRuntime(runtime),
		rating: formatRating(voteAverage),
		// One trailer per film: the card has room for a single clear action
		videos: videos.length > 0
			? videos.slice(0, 1)
			: createYouTubeSearchTrailer(film.title, movie.release_date?.slice(0, 4)),
	};
};

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();
	console.log('💷 [Box Office] Fetching UK top 10...');

	const chart = await fetchUkTop10();

	if (chart.films.length === 0) {
		console.warn('⚠️  [Box Office] No chart data - returning empty top 10');
		return { weekend: null, currency: BOX_OFFICE_CONFIG.CURRENCY, films: [] };
	}

	console.log(
		`✓ [Box Office] ${chart.films.length} films for weekend ${chart.weekend}, `
		+ `enriching with TMDb...`,
	);

	const films = await Promise.all(
		chart.films.map(film => limit(() => enrichFilm(film))),
	);

	const playable = films.filter(film => film.videos[0]?.key).length;
	const duration = Date.now() - startTime;
	console.log(
		`🎉 [Box Office] ${films.length} films (${playable} with a trailer) `
		+ `in ${duration}ms\n`,
	);

	return {
		weekend: chart.weekend,
		// Mojo reports British grosses in US dollars
		currency: BOX_OFFICE_CONFIG.CURRENCY,
		films,
	};
});
