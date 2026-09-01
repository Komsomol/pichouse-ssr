// server/api/picturehouseApi.js
import axios from 'axios';
import { picturehouseCache } from '../utils/cache.js';
import { PICTUREHOUSE_CONFIG } from '../utils/constants.js';

// Configuration constants (pure data)
// Nuxt loads .env before a server route runs, which is why the other API
// clients here read process.env without loading anything themselves.
const COOKIE = process.env.COOKIE;
const CINEMA_ID = '029'; // Finsbury Park
const API_BASE_URL = 'https://www.picturehouses.com';

// Pure function: Create API headers
const createHeaders = cookie => ({
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	'Accept': '*/*',
	'Referer': `${API_BASE_URL}/cinema/finsbury-park`,
	'Origin': API_BASE_URL,
	'Sec-Fetch-Dest': 'empty',
	'Sec-Fetch-Mode': 'cors',
	'Sec-Fetch-Site': 'same-origin',
	'Sec-Gpc': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest',
	'Cookie': cookie,
});

// Pure function: Create API URL
const createApiUrl = cinemaId =>
	`${API_BASE_URL}/api/get-movies-ajax?start_date=show_all_dates&cinema_id=${cinemaId}`;

// Pure function: Validate API response
const isValidResponse = response =>
	response?.data?.movies && Array.isArray(response.data.movies);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Retry gateway failures and timeouts only. A 4xx means the request itself is
// wrong, so repeating it just burns another timeout's worth of build time.
const isRetryable = error =>
	!error.response || error.code === 'ECONNABORTED' || error.response.status >= 500;

// Recursive rather than a loop so there is no unreachable throw after it:
// every path either returns a response or rethrows.
const postWithRetry = async (url, body, headers, attempt = 1) => {
	try {
		return await axios.post(url, body, {
			headers,
			timeout: PICTUREHOUSE_CONFIG.REQUEST_TIMEOUT,
		});
	}
	catch (error) {
		if (attempt >= PICTUREHOUSE_CONFIG.MAX_ATTEMPTS || !isRetryable(error)) {
			throw error;
		}

		const wait = PICTUREHOUSE_CONFIG.RETRY_DELAY_MS * attempt;
		console.warn(`⚠ [Picturehouse] Attempt ${attempt}/${PICTUREHOUSE_CONFIG.MAX_ATTEMPTS} failed (${error.message}), retrying in ${wait}ms`);
		await delay(wait);

		return postWithRetry(url, body, headers, attempt + 1);
	}
};

// Main fetch function with functional composition
export const fetchMoviesFromPicturehouse = async (cinemaId = CINEMA_ID) => {
	const cacheKey = `picturehouse:movies:${cinemaId}`;

	// Check cache first (cinema data changes infrequently)
	const cachedMovies = picturehouseCache.get(cacheKey);
	if (cachedMovies) {
		return cachedMovies;
	}

	const headers = createHeaders(COOKIE);
	const url = createApiUrl(cinemaId);
	const requestBody = new URLSearchParams();
	requestBody.append('', '');

	try {
		const response = await postWithRetry(url, requestBody, headers);

		if (!isValidResponse(response)) {
			throw new Error('Invalid response from Picturehouse API');
		}

		const movies = response.data.movies;
		picturehouseCache.set(cacheKey, movies);
		return movies;
	}
	catch (error) {
		console.error('Error fetching from Picturehouse API:', error.message);
		throw new Error(`Failed to fetch movies from Picturehouse API: ${error.message}`, { cause: error });
	}
};
