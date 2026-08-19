import axios from 'axios';
import { tmdbCache } from '../utils/cache.js';
import { cleanTitleForSearch, stripStrandPrefix, filterByExactTitle } from './filterMovies.js';

const TMDB_TOKEN = process.env.TMDB_TOKEN;

// Configuration: Specific movie matches (pure data)
const specificMovieMatches = {
	'Black Dog': { title: 'Black Dog', release_date: '2024-06-14' },
	// Add more specific title mappings if needed
};

// Pure helper functions
const createMovieResult = movie => ({
	id: movie.id,
	original_title: movie.original_title,
	release_date: movie.release_date,
	overview: movie.overview,
});

const findMovieByReleaseDate = (movies, releaseDate) =>
	movies.find(movie => movie.release_date === releaseDate);

const findLatestMovie = movies =>
	movies.reduce((latest, movie) => {
		const movieReleaseDate = new Date(movie.release_date);
		const latestReleaseDate = new Date(latest.release_date);
		return movieReleaseDate > latestReleaseDate ? movie : latest;
	});

const isYouTube = video => video?.site === 'YouTube';

const namesATrailer = video => /\btrailers?\b/i.test(video?.name || '');

const newestFirst = (a, b) =>
	new Date(b.published_at || 0) - new Date(a.published_at || 0);

// Among correctly typed trailers, one that calls itself a trailer outranks one
// that does not, and only then does the newer win. Studios type their ticket
// and countdown spots as Trailer too, and those are the newest thing a film
// has by the time it charts.
const bestFirst = (a, b) =>
	Number(namesATrailer(b)) - Number(namesATrailer(a)) || newestFirst(a, b);

/**
 * Picks a film's trailers out of its TMDb videos, best first.
 *
 * Selection is by TMDb's `type` field, not the video's name. A name is
 * marketing copy and frequently mentions "trailer" while being something else
 * entirely - The End of Oak Street carries a featurette called "Have you
 * experienced the new trailer?" that a name match ranked above the film's
 * actual "Official Trailer".
 *
 * Official uploads win over fan submissions, and newer wins over older, so a
 * caller taking the first entry gets the current official trailer.
 *
 * Where TMDb types nothing as a Trailer the old name match still runs, so a
 * film that only ever had a teaser keeps a video rather than losing one.
 *
 * @param {Array} videos - TMDb video results
 * @returns {Array} Trailers, best first
 */
export const filterTrailerVideos = (videos = []) => {
	const youtube = videos.filter(isYouTube);
	const trailers = youtube.filter(video => video.type === 'Trailer');
	const official = trailers.filter(video => video.official);
	const best = official.length > 0 ? official : trailers;

	if (best.length > 0) {
		return [...best].sort(bestFirst);
	}

	return youtube.filter(namesATrailer).sort(newestFirst);
};

const createPosterUrl = posterPath =>
	posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : null;

// Fetch movie from TMDb by title, with an option to specify if we are looking for the latest released movie
export const fetchMovieFromTMDb = async (title, findLatest = false) => {
	// Clean the title for better search results (removes 35mm, Anniversary, etc.)
	const cleanedTitle = cleanTitleForSearch(title);

	// Check cache first (use original title for cache key consistency)
	const cacheKey = `movie:${title}:${findLatest}`;
	const cachedMovie = tmdbCache.get(cacheKey);
	if (cachedMovie) {
		return cachedMovie;
	}

	const headers = {
		Authorization: `Bearer ${TMDB_TOKEN}`, // Use Bearer token for authorization
	};

	const searchMovies = async (query) => {
		const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`;
		const response = await axios.get(searchUrl, { headers });
		return response.data.results || [];
	};

	try {
		let movies = await searchMovies(cleanedTitle);

		// Picturehouse files a screening under the season running it ("Out at
		// Clapham: Beautiful Thing"), which TMDb cannot match. Retry once on the
		// film's own name. A real title with a colon ("Wicked: For Good") matches
		// first time and never reaches this, which is why the prefix is only ever
		// dropped on a miss rather than up front.
		//
		// The retry's results are held to an exact name. Dropping a prefix leaves
		// a short, common query, and TMDb answers those loosely - "Resurrection"
		// leads with "Alien Resurrection". Without this the recovered screening
		// would carry a confidently wrong poster and trailer, which is worse than
		// the film not resolving at all.
		if (movies.length === 0) {
			const withoutPrefix = stripStrandPrefix(cleanedTitle);

			if (withoutPrefix && withoutPrefix !== cleanedTitle) {
				movies = filterByExactTitle(
					withoutPrefix,
					await searchMovies(withoutPrefix),
				);
			}
		}

		if (movies.length === 0) {
			return null;
		}

		// Functional approach: compose selection logic
		const selectMovie = () => {
			// Check for specific movie match override
			const specificMatch = specificMovieMatches[title];
			if (specificMatch) {
				const matchedMovie = findMovieByReleaseDate(movies, specificMatch.release_date);
				if (matchedMovie) return matchedMovie;
			}

			// Return latest or first movie
			return findLatest ? findLatestMovie(movies) : movies[0];
		};

		const selectedMovie = selectMovie();
		const result = createMovieResult(selectedMovie);
		tmdbCache.set(cacheKey, result);
		return result;
	}
	catch (error) {
		console.error(`Error fetching TMDb data for ${title}:`, error.message);
		console.error('Error response data:', error.response?.data); // Log the detailed response data if available
		throw new Error(`TMDb request failed with status: ${error.response?.status || 'unknown'}`, { cause: error });
	}
};

// Fetch videos and poster from TMDb using movie ID
export const fetchVideosAndPosterFromTMDb = async (movieId) => {
	// Check cache first
	const cacheKey = `videos-poster:${movieId}`;
	const cachedData = tmdbCache.get(cacheKey);
	if (cachedData) {
		return cachedData;
	}

	const headers = {
		Authorization: `Bearer ${TMDB_TOKEN}`, // Same here
	};

	try {
		// One request, not two: append_to_response returns the videos inside the
		// details payload, so a film costs a single call instead of a details
		// call plus a videos call
		const { data } = await axios.get(
			`https://api.themoviedb.org/3/movie/${movieId}?language=en-US&append_to_response=videos`,
			{ headers },
		);

		// Use pure functions for data transformation
		const trailerVideos = filterTrailerVideos(data.videos?.results || []);
		const poster = createPosterUrl(data.poster_path);

		// Runtime and rating ride along on the details call the poster already
		// needs, so the Box Office tab costs no extra request
		const result = {
			videos: trailerVideos,
			poster,
			runtime: data.runtime || null,
			voteAverage: data.vote_average || null,
		};
		tmdbCache.set(cacheKey, result);
		return result;
	}
	catch (error) {
		console.error(`Error fetching videos and poster for movie ID ${movieId}:`, error);
		return { videos: [], poster: null, runtime: null, voteAverage: null };
	}
};
