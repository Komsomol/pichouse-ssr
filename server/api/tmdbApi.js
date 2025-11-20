import axios from 'axios';
import dotenv from 'dotenv';
import { tmdbCache } from '../utils/cache.js';

dotenv.config(); // Load environment variables

const TMDB_TOKEN = process.env.TMDB_TOKEN; // Ensure this token is correct and exists

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

// Helper to create YouTube trailer object from URL (currently unused but kept for future use)
// eslint-disable-next-line no-unused-vars
const createYouTubeTrailer = (url) => {
	const key = url?.split('v=')[1];
	return key
		? {
				key,
				name: 'Official Trailer',
				site: 'YouTube',
			}
		: null;
};

const filterTrailerVideos = videos =>
	videos.filter(video => /trailer/i.test(video.name));

const createPosterUrl = posterPath =>
	posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : null;

// Fetch movie from TMDb by title, with an option to specify if we are looking for the latest released movie
export const fetchMovieFromTMDb = async (title, findLatest = false) => {
	// Check cache first
	const cacheKey = `movie:${title}:${findLatest}`;
	const cachedMovie = tmdbCache.get(cacheKey);
	if (cachedMovie) {
		return cachedMovie;
	}

	const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
	const headers = {
		Authorization: `Bearer ${TMDB_TOKEN}`, // Use Bearer token for authorization
	};

	try {
		const response = await axios.get(searchUrl, { headers });
		const movies = response.data.results; // Get all movie results

		if (!movies || movies.length === 0) {
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
		throw new Error(`TMDb request failed with status: ${error.response?.status || 'unknown'}`);
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
		// Fetch videos and poster in parallel for better performance
		const [videoResponse, movieDetails] = await Promise.all([
			axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US`, { headers }),
			axios.get(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, { headers }),
		]);

		// Use pure functions for data transformation
		const trailerVideos = filterTrailerVideos(videoResponse.data.results);
		const poster = createPosterUrl(movieDetails.data.poster_path);

		const result = { videos: trailerVideos, poster };
		tmdbCache.set(cacheKey, result);
		return result;
	}
	catch (error) {
		console.error(`Error fetching videos and poster for movie ID ${movieId}:`, error);
		return { videos: [], poster: null };
	}
};
