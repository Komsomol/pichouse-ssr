// server/api/picturehouseApi.js
import axios from 'axios';
import dotenv from 'dotenv';
import { picturehouseCache } from '../utils/cache.js';

dotenv.config(); // Load environment variables

// Configuration constants (pure data)
const COOKIE = process.env.COOKIE;
const CINEMA_ID = '031'; // Finsbury Park
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
		const response = await axios.post(url, requestBody, { headers });

		if (!isValidResponse(response)) {
			throw new Error('Invalid response from Picturehouse API');
		}

		const movies = response.data.movies;
		picturehouseCache.set(cacheKey, movies);
		return movies;
	}
	catch (error) {
		console.error('Error fetching from Picturehouse API:', error.message);
		throw new Error(`Failed to fetch movies from Picturehouse API: ${error.message}`);
	}
};
