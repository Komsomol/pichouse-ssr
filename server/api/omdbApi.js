import axios from 'axios';
import { tmdbCache } from '../utils/cache.js';
import { cleanTitleForSearch } from './filterMovies.js';

const OMDB_API_KEY = process.env.OMDB_API_KEY || 'b78dca4e';
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * Fetch movie data from OMDB by title
 * @param {string} title - Movie title to search for
 * @param {string} year - Optional year to narrow search
 * @returns {object | null} OMDB movie data or null if not found
 */
export const fetchMovieFromOMDB = async (title, year = null) => {
	// Clean the title for better search results (removes 35mm, Anniversary, etc.)
	const cleanedTitle = cleanTitleForSearch(title);

	const cacheKey = `omdb:${title}:${year || 'any'}`;
	const cached = tmdbCache.get(cacheKey);
	if (cached) return cached;

	try {
		const params = new URLSearchParams({
			apikey: OMDB_API_KEY,
			t: cleanedTitle,
			type: 'movie',
		});

		if (year) {
			params.append('y', year);
		}

		const response = await axios.get(`${OMDB_BASE_URL}?${params}`);

		if (response.data.Response === 'True') {
			const result = {
				title: response.data.Title,
				year: response.data.Year,
				imdbID: response.data.imdbID,
				plot: response.data.Plot,
				poster: response.data.Poster !== 'N/A' ? response.data.Poster : null,
				runtime: response.data.Runtime,
				director: response.data.Director,
				actors: response.data.Actors,
				imdbRating: response.data.imdbRating,
			};
			tmdbCache.set(cacheKey, result);
			return result;
		}

		return null;
	}
	catch (error) {
		console.error(`Error fetching OMDB data for "${title}":`, error.message);
		return null;
	}
};

/**
 * Create a YouTube trailer search video object from movie title and year
 * This creates a fallback "trailer" that links to YouTube search results
 * @param {string} title - Movie title
 * @param {string} year - Movie year
 * @returns {Array} Array with video object for YouTube search
 */
export const createYouTubeSearchTrailer = (title, year) => {
	const searchQuery = encodeURIComponent(`${title} ${year || ''} official trailer`.trim());
	return [
		{
			key: null, // No direct video key
			name: 'Search for Trailer on YouTube',
			site: 'YouTube',
			searchUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
			isSearch: true, // Flag to indicate this is a search link, not a direct video
		},
	];
};

/**
 * Try to find a trailer using OMDB data as fallback
 * @param {string} title - Movie title
 * @returns {object} Object with videos array and poster
 */
export const fetchTrailerFromOMDB = async (title) => {
	const omdbData = await fetchMovieFromOMDB(title);

	if (!omdbData) {
		return { videos: [], poster: null, omdbData: null };
	}

	// Create YouTube search trailer as fallback
	const videos = createYouTubeSearchTrailer(omdbData.title, omdbData.year);

	return {
		videos,
		poster: omdbData.poster,
		omdbData,
	};
};
