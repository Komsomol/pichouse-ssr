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
import { chooseWeekendChart, parseWeekends, parseWeekendChart } from './filterBoxOffice.js';

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
 * Lists the most recent UK weekends, newest first, enough to try.
 *
 * The index without a year serves the current one, which in the first days
 * of January holds one weekend or none - hence topping up from last year's.
 *
 * @param {number} [year] - Current year, for the January top-up
 * @returns {Promise<Array<{path: string, label: string}>>} Weekend chart locations
 */
export const fetchRecentWeekends = async (year = new Date().getFullYear()) => {
	const wanted = BOX_OFFICE_CONFIG.MAX_WEEKENDS_TO_TRY;
	const current = parseWeekends(await fetchPage(BOX_OFFICE_CONFIG.YEAR_INDEX_PATH));

	if (current.length >= wanted) return current.slice(0, wanted);

	console.warn('⚠️  [Box Office] Few weekends in the current year index, adding last year\'s');

	const previous = parseWeekends(
		await fetchPage(BOX_OFFICE_CONFIG.YEAR_INDEX_TEMPLATE.replace('{year}', year - 1)),
	);

	return [...current, ...previous].slice(0, wanted);
};

/**
 * Fetches weekend charts newest first, stopping at the first complete one.
 * @param {Array<{path: string, label: string}>} weekends - Newest first
 * @param {Array} [fetched] - Charts fetched so far
 * @returns {Promise<Array<{weekend: string, films: Array}>>} Charts fetched
 */
const fetchChartsUntilComplete = async (weekends, fetched = []) => {
	if (weekends.length === 0) return fetched;

	const [weekend, ...rest] = weekends;
	const chart = {
		weekend: weekend.label,
		films: parseWeekendChart(await fetchPage(weekend.path)),
	};
	const charts = [...fetched, chart];

	if (chart.films.length >= BOX_OFFICE_CONFIG.TOP_N) return charts;

	console.warn(
		`⚠️  [Box Office] ${weekend.label} has ${chart.films.length} films so far, `
		+ 'trying the weekend before',
	);

	return fetchChartsUntilComplete(rest, charts);
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

	const weekends = await fetchRecentWeekends();

	if (weekends.length === 0) {
		console.error('Error fetching box office chart: no weekend link found');
		return { weekend: null, films: [] };
	}

	const chart = chooseWeekendChart(await fetchChartsUntilComplete(weekends));

	if (!chart) {
		return { weekend: null, films: [] };
	}

	// Only cache a successful scrape, so a transient failure is retried
	boxOfficeCache.set(cacheKey, chart);

	return chart;
};
