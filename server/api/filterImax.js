/**
 * BFI IMAX listing filtering.
 *
 * PURE FUNCTIONS: no side effects, no network. Input is Clusterflick's per-venue
 * JSON for BFI IMAX - an array of films, each with its performances - and the
 * current time, so the output is fully determined by the arguments.
 */

import { IMAX_CONFIG } from '../utils/constants.js';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: IMAX_CONFIG.TIME_ZONE,
	weekday: 'short',
	day: '2-digit',
	month: 'short',
	year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: IMAX_CONFIG.TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
	hour12: true,
});

/**
 * Formats a performance's date as the Movies tab shows Picturehouse dates.
 * @param {number} time - Epoch milliseconds
 * @returns {string} e.g. "Sat 03 Oct, 2026", in London time
 */
export const formatImaxDate = (time) => {
	const parts = Object.fromEntries(
		dateFormat.formatToParts(new Date(time)).map(({ type, value }) => [type, value]),
	);
	return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.year}`;
};

/**
 * Formats a performance's time as the Movies tab shows Picturehouse times.
 * @param {number} time - Epoch milliseconds
 * @returns {string} e.g. "07:30 PM", in London time
 */
export const formatImaxTime = time =>
	timeFormat.format(new Date(time)).toUpperCase();

/**
 * Names a performance's format when it is worth calling out. Every screening
 * is IMAX, so only a distinct source - the 70mm film print - earns a label.
 * @param {object} format - Clusterflick format, e.g. { presentation, source }
 * @returns {string} e.g. "IMAX 70mm", or an empty string
 */
export const formatLabel = format =>
	format?.source === 'imax-70mm' ? 'IMAX 70mm' : '';

/**
 * Keeps the performances still worth showing: not sold out, not started.
 * @param {Array} performances - Clusterflick performances
 * @param {number} now - Current time in epoch milliseconds
 * @returns {Array} Bookable performances, earliest first
 */
export const bookablePerformances = (performances = [], now = Date.now()) =>
	performances
		.filter(performance => !performance?.status?.soldOut)
		.filter(performance => Number(performance?.time) > now)
		.filter(performance => performance?.bookingUrl)
		.sort((a, b) => a.time - b.time);

/**
 * Shapes Clusterflick's BFI IMAX films for the IMAX tab.
 *
 * Sold-out and past performances are dropped, then any film left with none.
 * Films are ordered by their next bookable screening. The BFI title is kept
 * for display - like the Movies tab, it carries the event ("+ Q&A with ...")
 * - and the TMDb id is passed through so enrichment needs no title search.
 *
 * @param {Array} films - Clusterflick films for bfi.org.uk-imax
 * @param {number} [now] - Current time in epoch milliseconds
 * @returns {Array} Films with their bookable screenings
 */
export const toImaxFilms = (films, now = Date.now()) => {
	if (!Array.isArray(films)) return [];

	return films
		.map((film) => {
			const screenings = bookablePerformances(film?.performances, now).map(
				performance => ({
					id: `${film.showingId}-${performance.time}`,
					time: performance.time,
					date: formatImaxDate(performance.time),
					timeFormat: formatImaxTime(performance.time),
					format: formatLabel(performance.format),
					bookingUrl: performance.bookingUrl,
				}),
			);

			const durationMs = Number(film?.overview?.duration) || 0;

			return {
				id: film?.showingId || film?.title,
				title: film?.title || '',
				tmdbId: film?.themoviedb?.id || null,
				overview: film?.themoviedb?.summary || '',
				certificate: film?.overview?.classification || '',
				runtime: durationMs > 0 ? Math.round(durationMs / 60000) : null,
				releaseDate: film?.themoviedb?.releaseDate || '',
				screenings,
			};
		})
		.filter(film => film.title && film.screenings.length > 0)
		.sort((a, b) => a.screenings[0].time - b.screenings[0].time);
};
