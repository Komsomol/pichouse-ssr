/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchMoviesFromPicturehouse } from './picturehouseApi';
import { fetchMovieFromTMDb, fetchVideosAndPosterFromTMDb } from './tmdbApi';
import { filterMoviesByCinemaAndRemoveDuplicates } from './filterMovies';
import {
	CINEMA_NAMES,
	TARGET_CINEMA_IDS,
	SCREENING_CONFIG,
	PERFORMANCE_CONFIG,
} from '../utils/constants';
import {
	createFallbackVideos,
	isAfterMinHour,
	generateBookingUrl,
} from '../utils/helpers';

// Limit concurrent TMDb API calls to prevent rate limiting and improve performance
const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS);

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();
	console.log('🎬 [API] Starting movie fetch...');

	try {
		// Fetch movies from Picturehouse API
		const picturehouseStart = Date.now();
		const rawMovies = await fetchMoviesFromPicturehouse();
		console.log(`✓ [Picturehouse] Fetched ${rawMovies.length} movies in ${Date.now() - picturehouseStart}ms`);

		// Filter movies by cinema and remove duplicates
		const filterStart = Date.now();
		const filteredMovies = filterMoviesByCinemaAndRemoveDuplicates(
			rawMovies,
			'031',
		);
		console.log(`✓ [Filter] Filtered to ${filteredMovies.length} movies in ${Date.now() - filterStart}ms`);

		// Fetch TMDb details for ALL movies with controlled concurrency
		console.log(`🔍 [TMDb] Enriching ${filteredMovies.length} movies (max 5 concurrent)...`);
		const tmdbStart = Date.now();

		// Wrap enrichment logic in concurrency-limited function
		const enrichMovie = async (movie, index) => {
			const movieStart = Date.now();
			const findLatest = movie.filter_class_names?.includes(
				'discover picturehouse_presents',
			) || false;

			try {
				const tmdbMovieData = await fetchMovieFromTMDb(
					movie.Title,
					findLatest,
				);

				if (tmdbMovieData) {
					const {
						id: tmdbMovieId,
						original_title,
						release_date,
						overview,
					} = tmdbMovieData;

					const { videos, poster } = await fetchVideosAndPosterFromTMDb(
						tmdbMovieId,
					);

					console.log(`  ✓ [${index + 1}/${filteredMovies.length}] "${movie.Title}" (${Date.now() - movieStart}ms)`);

					return {
						...movie,
						original_title,
						release_date,
						overview,
						videos,
						poster,
					};
				}
				else {
					console.log(`  ⚠ [${index + 1}/${filteredMovies.length}] "${movie.Title}" - No TMDb data (${Date.now() - movieStart}ms)`);
					// Fallback if TMDb data not found
					return {
						...movie,
						videos: createFallbackVideos(movie.TrailerUrl),
						poster: null,
					};
				}
			}
			catch (error) {
				console.error(`  ✗ [${index + 1}/${filteredMovies.length}] "${movie.Title}" failed:`, error.message);
				// Return movie with fallback data if TMDb fetch fails
				return {
					...movie,
					videos: createFallbackVideos(movie.TrailerUrl),
					poster: null,
				};
			}
		};

		// Apply concurrency limit to all enrichment tasks
		const enrichedMoviesPromises = filteredMovies.map((movie, index) =>
			limit(() => enrichMovie(movie, index)),
		);

		// Wait for all parallel requests to complete
		const enrichedMovies = await Promise.all(enrichedMoviesPromises);
		console.log(`✓ [TMDb] Enriched ${enrichedMovies.length} movies in ${Date.now() - tmdbStart}ms`);

		// Create unique movies map (deduplicate by title)
		const dedupeStart = Date.now();
		const uniqueMovies = new Map();
		enrichedMovies.forEach((movie) => {
			uniqueMovies.set(movie.Title, movie);
		});
		console.log(`✓ [Dedupe] Deduplicated in ${Date.now() - dedupeStart}ms`);

		// Filter and process showtimes for Screen 1 after 18:00 at target cinemas
		const screen1FilterStart = Date.now();

		const moviesWithScreen1Showtimes = Array.from(uniqueMovies.values())
			.map((movie) => {
				// Filter showtimes for Screen 1, after min hour, at target cinemas
				const screen1Showtimes = (movie.show_times || []).filter((showtime) => {
					const isScreen1 = showtime.ScreenName === SCREENING_CONFIG.SCREEN_NAME;
					const isTargetCinema = TARGET_CINEMA_IDS.includes(showtime.CinemaId);
					const meetsTimeRequirement = isAfterMinHour(showtime.Showtime, SCREENING_CONFIG.MIN_HOUR);

					return isScreen1 && isTargetCinema && meetsTimeRequirement;
				});

				// Generate booking URLs and add cinema names for each showtime
				const showtimesWithBookingUrls = screen1Showtimes.map(showtime => ({
					...showtime,
					cinemaName: CINEMA_NAMES[showtime.CinemaId] || 'Unknown Cinema',
					bookingUrl: generateBookingUrl(
						showtime.CinemaId,
						showtime.SessionId,
						SCREENING_CONFIG.BOOKING_URL_TEMPLATE,
					),
				}));

				return {
					...movie,
					screen1Showtimes: showtimesWithBookingUrls,
				};
			})
			// Only include movies that have videos/trailers AND Screen 1 showtimes
			.filter(movie => movie.videos && movie.videos.length > 0 && movie.screen1Showtimes.length > 0);

		console.log(`✓ [Filter] Filtered to ${moviesWithScreen1Showtimes.length} movies with Screen 1 showtimes after 18:00 in ${Date.now() - screen1FilterStart}ms`);

		// Sort movies by earliest upcoming showtime (chronological order)
		const sortStart = Date.now();
		moviesWithScreen1Showtimes.sort((a, b) => {
			// Get the earliest showtime for each movie
			const earliestA = new Date(Math.min(...a.screen1Showtimes.map(s => new Date(s.Showtime))));
			const earliestB = new Date(Math.min(...b.screen1Showtimes.map(s => new Date(s.Showtime))));
			return earliestA - earliestB; // Ascending order (soonest first)
		});
		console.log(`✓ [Sort] Sorted ${moviesWithScreen1Showtimes.length} movies by earliest showtime in ${Date.now() - sortStart}ms`);

		const totalTime = Date.now() - startTime;
		console.log(`🎉 [API] Complete! ${moviesWithScreen1Showtimes.length} movies in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`);

		return moviesWithScreen1Showtimes;
	}
	catch (error) {
		console.error('❌ [API] Error fetching movies:', error.message);
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to fetch movies: ' + error.message,
		});
	}
});
