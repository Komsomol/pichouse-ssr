/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchMoviesFromPicturehouse } from './picturehouseApi';
import { fetchMovieFromTMDb, fetchVideosAndPosterFromTMDb } from './tmdbApi';
import { fetchTrailerFromOMDB } from './omdbApi';
import { sanitizeMovieTitle } from './filterMovies';
import {
	CINEMA_NAMES,
	TARGET_CINEMA_IDS,
	SCREENING_CONFIG,
	PERFORMANCE_CONFIG,
} from '../utils/constants';
import {
	createFallbackVideos,
	meetsTimeRequirement,
	generateBookingUrl,
} from '../utils/helpers';

// Limit concurrent TMDb API calls to prevent rate limiting and improve performance
const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS);

/**
 * Filters a movie's showtimes to only Screen 1 at target cinemas with valid times
 * @param {object} movie - Movie object with show_times array
 * @returns {Array} Filtered showtimes for Screen 1
 */
const getScreen1Showtimes = (movie) => {
	return (movie.show_times || []).filter((showtime) => {
		const isScreen1 = showtime.ScreenName === SCREENING_CONFIG.SCREEN_NAME;
		const isTargetCinema = TARGET_CINEMA_IDS.includes(showtime.CinemaId);
		const validTime = meetsTimeRequirement(showtime.Showtime, SCREENING_CONFIG.MIN_HOUR);
		return isScreen1 && isTargetCinema && validTime;
	});
};

/**
 * Enriches showtimes with booking URLs and cinema names
 * @param {Array} showtimes - Array of showtime objects
 * @returns {Array} Showtimes with booking URLs added
 */
const enrichShowtimes = (showtimes) => {
	return showtimes
		.map(showtime => ({
			...showtime,
			cinemaName: CINEMA_NAMES[showtime.CinemaId] || 'Unknown Cinema',
			bookingUrl: generateBookingUrl(
				showtime.CinemaId,
				showtime.SessionId,
				SCREENING_CONFIG.BOOKING_URL_TEMPLATE,
			),
		}))
		.sort((a, b) => new Date(a.Showtime) - new Date(b.Showtime));
};

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();
	console.log('🎬 [API] Starting movie fetch...');

	try {
		// ============================================================
		// STEP 1: Fetch all movies from Picturehouse API
		// ============================================================
		const picturehouseStart = Date.now();
		const rawMovies = await fetchMoviesFromPicturehouse();
		console.log(`✓ [Picturehouse] Fetched ${rawMovies.length} movies in ${Date.now() - picturehouseStart}ms`);

		// ============================================================
		// STEP 2: EARLY FILTER - Only keep movies with Screen 1 showtimes
		// This is the key optimization - we filter BEFORE enriching with TMDb/OMDB
		// ============================================================
		const earlyFilterStart = Date.now();

		const moviesWithScreen1 = rawMovies
			.map((movie) => {
				const screen1Showtimes = getScreen1Showtimes(movie);
				return {
					...movie,
					_screen1Showtimes: screen1Showtimes,
					_hasScreen1: screen1Showtimes.length > 0,
				};
			})
			.filter(movie => movie._hasScreen1);

		console.log(`✓ [Early Filter] ${rawMovies.length} → ${moviesWithScreen1.length} movies with Screen 1 showtimes in ${Date.now() - earlyFilterStart}ms`);

		// ============================================================
		// STEP 3: Deduplicate by original title
		// Different screenings (e.g., "The Shining - Original Cut" vs "The Shining (45th Anniversary)")
		// are kept separate since they have different original titles
		// ============================================================
		const dedupeStart = Date.now();
		const uniqueTitles = new Set();
		const titleExclusionList = ['Dawn of Impressionism - Paris 1874'];

		const deduplicatedMovies = moviesWithScreen1
			.filter((movie) => {
				// Skip excluded movies
				if (titleExclusionList.some(excluded => movie.Title.includes(excluded))) {
					return false;
				}
				// Deduplicate by original title
				if (uniqueTitles.has(movie.Title)) {
					return false;
				}
				uniqueTitles.add(movie.Title);
				return true;
			})
			.map((movie) => {
				// Sanitize title for display but keep original
				const sanitizedTitle = sanitizeMovieTitle(movie.Title);
				return {
					...movie,
					_originalTitle: movie.Title,
					Title: sanitizedTitle || movie.Title,
				};
			});

		console.log(`✓ [Dedupe] ${moviesWithScreen1.length} → ${deduplicatedMovies.length} unique movies in ${Date.now() - dedupeStart}ms`);

		// ============================================================
		// STEP 4: Enrich ONLY these movies with TMDb/OMDB data
		// This is now much faster since we're only enriching ~15-20 movies
		// instead of 100+
		// ============================================================
		console.log(`🔍 [TMDb/OMDB] Enriching ${deduplicatedMovies.length} movies (max ${PERFORMANCE_CONFIG.MAX_CONCURRENT_TMDB_REQUESTS} concurrent)...`);
		const enrichStart = Date.now();

		const enrichMovie = async (movie, index) => {
			const movieStart = Date.now();
			const findLatest = movie.filter_class_names?.includes('discover picturehouse_presents') || false;

			try {
				// Try TMDb first
				const tmdbMovieData = await fetchMovieFromTMDb(movie.Title, findLatest);

				if (tmdbMovieData) {
					const { id: tmdbMovieId, original_title, release_date, overview } = tmdbMovieData;
					let { videos, poster } = await fetchVideosAndPosterFromTMDb(tmdbMovieId);

					// If TMDb has no videos, try OMDB as fallback
					if (!videos || videos.length === 0) {
						console.log(`  🔄 [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - No TMDb videos, trying OMDB...`);
						const omdbResult = await fetchTrailerFromOMDB(movie._originalTitle);
						if (omdbResult.videos?.length > 0) {
							videos = omdbResult.videos;
							if (!poster && omdbResult.poster) poster = omdbResult.poster;
							console.log(`  ✓ [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - OMDB fallback (${Date.now() - movieStart}ms)`);
						}
					}
					else {
						console.log(`  ✓ [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - TMDb (${Date.now() - movieStart}ms)`);
					}

					return { ...movie, original_title, release_date, overview, videos, poster };
				}
				else {
					// TMDb found nothing - try OMDB directly
					console.log(`  🔄 [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - No TMDb, trying OMDB...`);
					const omdbResult = await fetchTrailerFromOMDB(movie._originalTitle);

					if (omdbResult.videos?.length > 0) {
						console.log(`  ✓ [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - OMDB only (${Date.now() - movieStart}ms)`);
						return {
							...movie,
							original_title: omdbResult.omdbData?.title || movie.Title,
							overview: omdbResult.omdbData?.plot || '',
							videos: omdbResult.videos,
							poster: omdbResult.poster,
							omdbData: omdbResult.omdbData,
						};
					}

					// Last resort: use Picturehouse trailer URL
					console.log(`  ⚠ [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" - Picturehouse fallback (${Date.now() - movieStart}ms)`);
					return { ...movie, videos: createFallbackVideos(movie.TrailerUrl), poster: null };
				}
			}
			catch (error) {
				console.error(`  ✗ [${index + 1}/${deduplicatedMovies.length}] "${movie._originalTitle}" failed:`, error.message);
				return { ...movie, videos: createFallbackVideos(movie.TrailerUrl), poster: null };
			}
		};

		// Apply concurrency limit
		const enrichedMovies = await Promise.all(
			deduplicatedMovies.map((movie, index) => limit(() => enrichMovie(movie, index))),
		);

		console.log(`✓ [TMDb/OMDB] Enriched ${enrichedMovies.length} movies in ${Date.now() - enrichStart}ms`);

		// ============================================================
		// STEP 5: Final processing - add booking URLs and filter out movies without videos
		// ============================================================
		const finalStart = Date.now();

		const finalMovies = enrichedMovies
			.map(movie => ({
				...movie,
				screen1Showtimes: enrichShowtimes(movie._screen1Showtimes),
			}))
			.filter(movie => movie.videos?.length > 0)
			.sort((a, b) => {
				// Sort by earliest showtime
				const earliestA = new Date(Math.min(...a.screen1Showtimes.map(s => new Date(s.Showtime))));
				const earliestB = new Date(Math.min(...b.screen1Showtimes.map(s => new Date(s.Showtime))));
				return earliestA - earliestB;
			});

		console.log(`✓ [Final] ${finalMovies.length} movies with videos, sorted by showtime in ${Date.now() - finalStart}ms`);

		const totalTime = Date.now() - startTime;
		console.log(`🎉 [API] Complete! ${finalMovies.length} movies in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`);

		return finalMovies;
	}
	catch (error) {
		console.error('❌ [API] Error fetching movies:', error.message);
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to fetch movies: ' + error.message,
		});
	}
});
