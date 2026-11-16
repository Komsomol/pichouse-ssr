/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchMoviesFromPicturehouse } from './picturehouseApi';
import { fetchMovieFromTMDb, fetchVideosAndPosterFromTMDb } from './tmdbApi';
import { sanitizeMovieTitle } from './filterMovies';
import { selectOtherScreenFilms } from './filterOtherScreens';
import { PERFORMANCE_CONFIG } from '../utils/constants';
import { createFallbackVideos } from '../utils/helpers';

const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS);

/**
 * Adds poster, synopsis, trailer and Metacritic link from TMDb. The trailer
 * falls back to the one Picturehouse lists; a film with neither is dropped.
 * @param {object} film - From selectOtherScreenFilms
 * @returns {Promise<object>} Film with TMDb fields
 */
const enrichFilm = async (film) => {
	const { trailerUrl, ...rest } = film;
	try {
		const movie = await fetchMovieFromTMDb(sanitizeMovieTitle(film.title) || film.title);
		const details = movie
			? await fetchVideosAndPosterFromTMDb(movie.id)
			: { videos: [], poster: null, metascore: null };
		const videos = details.videos.length > 0 ? details.videos : createFallbackVideos(trailerUrl);

		return {
			...rest,
			poster: details.poster,
			overview: movie?.overview || '',
			metascore: details.metascore,
			videos: videos.slice(0, 1),
		};
	}
	catch (error) {
		console.error(`  ✗ [Other screens] "${film.title}" failed:`, error.message);
		return { ...rest, poster: null, overview: '', metascore: null, videos: createFallbackVideos(trailerUrl) };
	}
};

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();

	try {
		// Shares the Movies tab's in-flight request, so a build still makes one POST
		const rawMovies = await fetchMoviesFromPicturehouse();
		const selected = selectOtherScreenFilms(rawMovies);
		const enriched = await Promise.all(selected.map(film => limit(() => enrichFilm(film))));
		const films = enriched.filter(film => film.videos.length > 0);

		console.log(
			`🎟️ [Other screens] ${selected.length} films → ${films.length} with a trailer `
			+ `in ${Date.now() - startTime}ms`,
		);

		return films;
	}
	catch (error) {
		console.error('❌ [Other screens] Error:', error.message);
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to fetch other screens: ' + error.message,
		});
	}
});
