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
 * Lists the weekends on a Box Office Mojo year index page, newest first.
 *
 * Each row links its weekend twice - from the date range ("Aug 14-16") and
 * from the week number - so links are kept once per path, first one winning:
 * the date range, which is the label shown on the page.
 *
 * @param {string} html - Year index page HTML
 * @returns {Array<{path: string, label: string}>} Weekend chart paths and labels
 */
export const parseWeekends = (html) => {
	if (!html) return [];

	const $ = cheerio.load(html);
	const links = $('table a[href^="/weekend/"]')
		.map((_index, link) => ({
			path: $(link).attr('href'),
			label: $(link).text().trim(),
		}))
		.get()
		.filter(link => link.path);

	return links.filter(
		(link, index) => links.findIndex(other => other.path === link.path) === index,
	);
};

/**
 * Finds the newest weekend on a Box Office Mojo year index page.
 * @param {string} html - Year index page HTML
 * @returns {{path: string, label: string}|null} Weekend chart path and label
 */
export const parseLatestWeekend = html => parseWeekends(html)[0] || null;

/**
 * Picks which weekend's chart to show.
 *
 * Mojo publishes a weekend's top films first and fills in the rest over the
 * following days, so the newest weekend can hold two films. The newest chart
 * with a full top N wins; if none is full, the one with the most films does,
 * the newer on a tie.
 *
 * @param {Array<{weekend: string, films: Array}>} charts - Newest first
 * @param {number} [topN] - Films a complete chart holds
 * @returns {{weekend: string, films: Array}|null} The chart to show
 */
export const chooseWeekendChart = (charts, topN = BOX_OFFICE_CONFIG.TOP_N) => {
	const usable = (Array.isArray(charts) ? charts : []).filter(chart => chart?.films?.length > 0);

	if (usable.length === 0) return null;

	return usable.find(chart => chart.films.length >= topN)
		|| usable.reduce((best, chart) => (chart.films.length > best.films.length ? chart : best));
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

	// The release cell holds the film's name as a link, with any label such as
	// "2026 Re-release" in a span after it. Reading the cell's text glued the
	// two into "Avengers: Endgame2026 Re-release", which TMDb cannot match.
	const releaseOf = (row) => {
		const cell = $(row).find('td, th').eq(columns.title);
		return {
			name: cell.find('a').first().text().trim(),
			label: cell.find('span').first().text().trim(),
		};
	};

	return rows
		.slice(1)
		.map(row => ({ cells: cellsOf($, row), release: releaseOf(row) }))
		.filter(({ cells }) => /^\d+$/.test(cells[columns.rank] || ''))
		.map(({ cells, release }) => ({
			rank: Number(cells[columns.rank]),
			title: release.name || valueAt(cells, 'title'),
			label: release.label,
			weekendGross: valueAt(cells, 'weekendGross'),
			totalGross: valueAt(cells, 'totalGross'),
			weeks: valueAt(cells, 'weeks'),
			distributor: valueAt(cells, 'distributor'),
		}))
		.filter(film => film.title)
		.sort((a, b) => a.rank - b.rank)
		.slice(0, topN);
};
