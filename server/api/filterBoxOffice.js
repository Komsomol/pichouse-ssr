/**
 * UK box office chart parsing.
 *
 * PURE FUNCTIONS: no side effects, no network. Everything here takes an HTML
 * string and returns plain data, so it is unit-testable against a saved
 * fixture.
 */

import * as cheerio from 'cheerio';
import { BOX_OFFICE_CONFIG } from '../utils/constants';

// A chart column is located by its header text rather than a fixed index, so an
// added or reordered column on the source page does not silently shift values.
const COLUMN_HEADERS = {
	rank: 'Rank',
	title: 'Release',
	weekendGross: 'Gross',
	totalGross: 'Total Gross',
	weeks: 'Weeks',
	distributor: 'Distributor',
};

/**
 * Reads a row's cells as trimmed text.
 * @param {object} $ - cheerio instance
 * @param {object} row - Row element
 * @returns {string[]} Cell text in document order
 */
const cellsOf = ($, row) =>
	$(row)
		.find('td, th')
		.map((_index, cell) => $(cell).text().trim())
		.get();

/**
 * Maps each known column name to its index in the header row.
 * @param {string[]} headers - Header cell text
 * @returns {object} Column name to index, omitting columns not present
 */
const indexColumns = headers =>
	Object.fromEntries(
		Object.entries(COLUMN_HEADERS)
			.map(([key, label]) => [key, headers.indexOf(label)])
			.filter(([, index]) => index >= 0),
	);

/**
 * Finds the newest weekend on a Box Office Mojo year index page.
 *
 * Rows are ordered newest first, so the first weekend link is the latest
 * published chart. The link text ("Aug 14-16") is the weekend's date range.
 *
 * @param {string} html - Year index page HTML
 * @returns {{path: string, label: string}|null} Weekend chart path and label
 */
export const parseLatestWeekend = (html) => {
	if (!html) return null;

	const $ = cheerio.load(html);
	const link = $('table a[href^="/weekend/"]').first();
	const path = link.attr('href');

	if (!path) return null;

	return { path, label: link.text().trim() };
};

/**
 * Parses a Box Office Mojo weekend chart into ranked films.
 *
 * Rows whose rank is not a number (spacer or annotation rows) are skipped, and
 * the result is capped at the top N.
 *
 * @param {string} html - Weekend chart page HTML
 * @param {number} [topN] - How many films to keep
 * @returns {Array} Films with rank, title, grosses, weeks and distributor
 */
export const parseWeekendChart = (html, topN = BOX_OFFICE_CONFIG.TOP_N) => {
	if (!html) return [];

	const $ = cheerio.load(html);
	const rows = $('table tr').get();

	if (rows.length === 0) return [];

	const columns = indexColumns(cellsOf($, rows[0]));

	if (columns.rank === undefined || columns.title === undefined) {
		return [];
	}

	const valueAt = (cells, key) =>
		columns[key] === undefined ? '' : cells[columns[key]] || '';

	return rows
		.slice(1)
		.map(row => cellsOf($, row))
		.filter(cells => /^\d+$/.test(cells[columns.rank] || ''))
		.map(cells => ({
			rank: Number(cells[columns.rank]),
			title: valueAt(cells, 'title'),
			weekendGross: valueAt(cells, 'weekendGross'),
			totalGross: valueAt(cells, 'totalGross'),
			weeks: valueAt(cells, 'weeks'),
			distributor: valueAt(cells, 'distributor'),
		}))
		.filter(film => film.title)
		.sort((a, b) => a.rank - b.rank)
		.slice(0, topN);
};
