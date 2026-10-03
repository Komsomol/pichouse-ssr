/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchImaxListings } from './imaxApi';
import { toImaxFilms } from './filterImax';
import { fetchVideosAndPosterFromTMDb } from './tmdbApi';
// Pure string builder - needs no OMDB key, only lives in that module
import { createYouTubeSearchTrailer } from './omdbApi';
import { IMAX_CONFIG, PERFORMANCE_CONFIG } from '../utils/constants';

const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS);

// Trailer links shown per film, as on the Movies tab's side column
const MAX_TRAILERS = 3;

/**
 * Adds a poster and trailers to one IMAX film.
 *
 * Clusterflick has already matched each film to TMDb, so the id is used
 * directly - no title search, which BFI event titles ("25th Anniversary: ...",
 * "... + Q&A with ...") would often fail. A film without an id, or whose TMDb
 * entry has no trailer, falls back to a YouTube search link.
 *
 * @param {object} film - Film from toImaxFilms
 * @returns {Promise<object>} Film with poster and videos
 */
const enrichFilm = async (film) => {
	const searchTrailer = () =>
		createYouTubeSearchTrailer(film.title, film.releaseDate.slice(0, 4));

	if (!film.tmdbId) {
		return { ...film, poster: null, videos: searchTrailer() };
	}

	const { videos, poster, runtime } = await fetchVideosAndPosterFromTMDb(film.tmdbId);

	return {
		...film,
		poster,
		runtime: film.runtime || runtime,
		videos: videos.length > 0 ? videos.slice(0, MAX_TRAILERS) : searchTrailer(),
	};
};

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();
	console.log('🎞️ [IMAX] Fetching BFI IMAX listings...');

	const listings = await fetchImaxListings();
	const bookable = toImaxFilms(listings);

	console.log(
		`✓ [IMAX] ${listings.length} films → ${bookable.length} with bookable `
		+ `screenings, enriching with TMDb...`,
	);

	const films = await Promise.all(
		bookable.map(film => limit(() => enrichFilm(film))),
	);

	console.log(`🎉 [IMAX] ${films.length} films in ${Date.now() - startTime}ms\n`);

	return {
		creditUrl: IMAX_CONFIG.CREDIT_URL,
		films,
	};
});
