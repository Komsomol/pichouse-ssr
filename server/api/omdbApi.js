import axios from 'axios';
import { tmdbCache } from '../utils/cache.js';
import { cleanTitleForSearch } from './filterMovies.js';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
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
 * Reads OMDB's Metascore field as a 0-100 number.
 * OMDB writes "N/A" when Metacritic has not scored the film.
 * @param {string} value - OMDB `Metascore`
 * @returns {number|null} Score, or null when there is none
 */
export const parseMetascore = (value) => {
	const score = Number.parseInt(value, 10);
	return score >= 0 && score <= 100 ? score : null;
};

/**
 * Links to Metacritic's search for the film. OMDB gives no page URL, and
 * guessing Metacritic's slug fails for namesakes ("...-2026").
 * @param {string} title - Film title
 * @returns {string} Metacritic movie search URL
 */
export const createMetacriticUrl = title =>
	`https://www.metacritic.com/search/${encodeURIComponent(title)}/?category=2`;

/**
 * Fetches a film's Metacritic score from OMDB by IMDb id. The id comes off
 * TMDb's details, so the score belongs to the same film - no title search.
 * @param {string} imdbId - IMDb id, e.g. "tt0133093"
 * @param {string} title - Title for the Metacritic link
 * @returns {Promise<{score: number, url: string}|null>} Null when unscored,
 *   unknown, or OMDB is unavailable
 */
export const fetchMetascoreFromOMDB = async (imdbId, title) => {
	// Read at call time so tests can set it; absent locally until added to .env
	const apiKey = process.env.OMDB_API_KEY;
	if (!apiKey || !imdbId) return null;

	try {
		const { data } = await axios.get(OMDB_BASE_URL, {
			params: { apikey: apiKey, i: imdbId },
			timeout: 10000,
		});
		const score = data?.Response === 'True' ? parseMetascore(data.Metascore) : null;
		return score === null ? null : { score, url: createMetacriticUrl(title) };
	}
	catch (error) {
		// Status or message only: the error's config carries the API key
		console.error(
			`Error fetching Metascore for ${imdbId}:`,
			error.response?.status || error.message,
		);
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
