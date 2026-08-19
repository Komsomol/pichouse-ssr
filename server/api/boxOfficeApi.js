// server/api/boxOfficeApi.js
//
// Box Office Mojo client for the UK weekend top 10.
//
// Ported from the uk_top_10_scraper project, which scraped britinfo.net. That
// source stopped publishing in September 2025, so the same two-step scrape now
// runs against Mojo's British chart: read the year index for the newest
// weekend, then read that weekend's chart.

import axios from 'axios';
import { boxOfficeCache } from '../utils/cache.js';
import { BOX_OFFICE_CONFIG } from '../utils/constants.js';
import { parseLatestWeekend, parseWeekendChart } from './filterBoxOffice.js';

/**
 * Fetches a Mojo page as HTML.
 * @param {string} path - Path relative to the Mojo base URL
 * @returns {Promise<string|null>} Page HTML, or null on failure
 */
const fetchPage = async (path) => {
	try {
		const response = await axios.get(`${BOX_OFFICE_CONFIG.BASE_URL}${path}`, {
			timeout: BOX_OFFICE_CONFIG.REQUEST_TIMEOUT,
		});
		return response.data;
	}
	catch (error) {
		console.error(
			`Error fetching box office page ${path}:`,
			error.response?.status || error.message,
		);
		return null;
	}
};

/**
 * Finds the most recently published UK weekend chart.
 *
 * The index without a year serves the current one, which is empty in the first
 * days of January - hence the fall back to last year's index.
 *
 * @param {number} [year] - Current year, for the January fallback
 * @returns {Promise<{path: string, label: string}|null>} Weekend chart location
 */
export const fetchLatestWeekend = async (year = new Date().getFullYear()) => {
	const current = parseLatestWeekend(
		await fetchPage(BOX_OFFICE_CONFIG.YEAR_INDEX_PATH),
	);
	if (current) return current;

	console.warn('⚠️  [Box Office] No weekend in the current year index, trying last year');

	return parseLatestWeekend(
		await fetchPage(
			BOX_OFFICE_CONFIG.YEAR_INDEX_TEMPLATE.replace('{year}', year - 1),
		),
	);
};

/**
 * Fetches the UK box office top 10 for the latest published weekend.
 *
 * A scrape failure returns an empty film list rather than throwing: the page
 * renders its own empty state and the rest of the build carries on.
 *
 * @returns {Promise<{weekend: string|null, films: Array}>} Chart data
 */
export const fetchUkTop10 = async () => {
	const cacheKey = 'boxoffice:uk-top-10';
	const cached = boxOfficeCache.get(cacheKey);
	if (cached) return cached;

	const weekend = await fetchLatestWeekend();

	if (!weekend) {
		console.error('Error fetching box office chart: no weekend link found');
		return { weekend: null, films: [] };
	}

	const films = parseWeekendChart(await fetchPage(weekend.path));
	const result = { weekend: weekend.label, films };

	// Only cache a successful scrape, so a transient failure is retried
	if (films.length > 0) {
		boxOfficeCache.set(cacheKey, result);
	}

	return result;
};
