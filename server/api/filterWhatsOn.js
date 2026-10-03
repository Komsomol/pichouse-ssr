/**
 * "What's on": every film at Screen 1 or BFI IMAX, once each, with its poster,
 * summary, trailer, where it is showing and its next bookable screening.
 * Films with a screening in the next seven days come first; those that only
 * start later sit below as "coming soon".
 *
 * PURE FUNCTIONS: no side effects, no network. Takes the Movies and IMAX
 * endpoints' output plus the current time.
 *
 * Both sources are reduced to London wall-clock keys ("2026-10-03T19:30")
 * before anything is compared. Picturehouse already gives London local time
 * with no zone; IMAX gives epoch milliseconds. Passing either through `new
 * Date()` on a build machine in UTC would move evening screenings an hour and
 * late ones onto the wrong day.
 */

import { normalizeTitleKey } from '../utils/helpers.js';
import { IMAX_CONFIG } from '../utils/constants.js';
import { cleanTitleForSearch } from './filterMovies.js';

// "Playing now" means a screening within this many days, today included
const NOW_WINDOW_DAYS = 7;

const londonParts = new Intl.DateTimeFormat('en-GB', {
	timeZone: IMAX_CONFIG.TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

/**
 * London wall-clock key for an instant.
 * @param {number} time - Epoch milliseconds
 * @returns {string} e.g. "2026-10-03T19:30"
 */
export const londonKey = (time) => {
	const parts = Object.fromEntries(
		londonParts.formatToParts(new Date(time)).map(({ type, value }) => [type, value]),
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

/**
 * Adds days to a London date key, by calendar date - DST does not shift it.
 * @param {string} dateKey - e.g. "2026-10-03"
 * @param {number} days - Days to add
 * @returns {string} e.g. "2026-10-10"
 */
export const addDays = (dateKey, days) => {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/**
 * Short date for a London date key.
 * @param {string} dateKey - e.g. "2026-10-03"
 * @returns {string} e.g. "Sat 3 Oct"
 */
export const formatDayLabel = (dateKey) => {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: 'UTC',
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	}).format(new Date(Date.UTC(year, month - 1, day)));
};

/**
 * Date and time for a London wall-clock key.
 * @param {string} key - e.g. "2026-10-03T19:30"
 * @returns {string} e.g. "Sat 3 Oct, 19:30"
 */
export const formatScreening = key =>
	`${formatDayLabel(key.slice(0, 10))}, ${key.slice(11, 16)}`;

// Picturehouse Central is "Central" here: the line has room for a word
const shortCinema = name => String(name || '').replace(/^Picturehouse\s+/i, '');

const runtimeMinutes = value => Number.parseInt(value, 10) || null;

/**
 * Reads Movies tab films as listings.
 * @param {Array} movies - /api/movies output
 * @returns {Array} Listings at Screen 1
 */
export const fromMovies = (movies = []) =>
	(Array.isArray(movies) ? movies : []).map(movie => ({
		title: movie._originalTitle || movie.Title,
		poster: movie.poster || null,
		overview: movie.overview || '',
		videos: movie.videos || [],
		certificate: movie.Rating || '',
		runtime: runtimeMinutes(movie.omdbData?.Runtime || movie.RunTime),
		venue: 'Screen 1',
		tab: '/',
		screenings: (movie.screen1Showtimes || [])
			.filter(showtime => showtime?.Showtime && showtime?.bookingUrl)
			.map(showtime => ({
				// Already London local time, no zone: keep the wall clock as-is
				key: String(showtime.Showtime).slice(0, 16),
				url: showtime.bookingUrl,
				place: shortCinema(showtime.cinemaName),
			})),
	}));

/**
 * Reads IMAX tab films as listings.
 * @param {Array} films - /api/imax `films`
 * @returns {Array} Listings at BFI IMAX
 */
export const fromImax = (films = []) =>
	(Array.isArray(films) ? films : []).map(film => ({
		title: film.title,
		poster: film.poster || null,
		overview: film.overview || '',
		videos: film.videos || [],
		certificate: film.certificate || '',
		runtime: film.runtime || null,
		venue: 'BFI IMAX',
		tab: '/imax',
		screenings: (film.screenings || [])
			.filter(screening => screening?.time && screening?.bookingUrl)
			.map(screening => ({
				key: londonKey(screening.time),
				url: screening.bookingUrl,
				place: screening.format || '',
			})),
	}));

// One film, however it is listed. cleanTitleForSearch drops format and event
// markers, so "The Odyssey (70mm)" at Picturehouse and "The Odyssey" at IMAX
// become one entry rather than two near-identical ones.
const filmKey = title => normalizeTitleKey(cleanTitleForSearch(title));

const unique = values => [...new Set(values.filter(Boolean))];

const firstWith = (listings, field) =>
	listings.find(listing => (Array.isArray(listing[field]) ? listing[field].length : listing[field]))?.[field];

/**
 * Builds the What's on page from Screen 1 and IMAX listings.
 *
 * Listings of the same film are merged into one entry with a line per venue.
 * The entry shows the shortest of its listing titles - the plain name, where
 * one listing adds "(70mm)" - and each venue line keeps its own listing title
 * when that differs, so an event ("+ Q&A with ...") is not lost.
 *
 * @param {Array} listings - From fromMovies and fromImax
 * @param {number} [now] - Current time in epoch milliseconds
 * @returns {{ now: Array, soon: Array }} Films, each ordered by next screening
 */
export const buildWhatsOn = (listings, now = Date.now()) => {
	const nowKey = londonKey(now);
	const lastNowDay = addDays(nowKey.slice(0, 10), NOW_WINDOW_DAYS - 1);

	const live = (Array.isArray(listings) ? listings : [])
		.map(listing => ({
			...listing,
			screenings: [...listing.screenings]
				.filter(screening => screening.key > nowKey)
				.sort((a, b) => a.key.localeCompare(b.key)),
		}))
		.filter(listing => listing.title && listing.screenings.length > 0);

	const groups = live.reduce((acc, listing) => {
		const key = filmKey(listing.title);
		return { ...acc, [key]: [...(acc[key] || []), listing] };
	}, {});

	const films = Object.entries(groups)
		.map(([key, group]) => {
			const title = group
				.map(listing => listing.title)
				.reduce((shortest, candidate) => (candidate.length < shortest.length ? candidate : shortest));

			const venues = group
				.map(listing => ({
					venue: listing.venue,
					tab: listing.tab,
					listingTitle: listing.title === title ? '' : listing.title,
					places: unique(listing.screenings.map(screening => screening.place)),
					count: listing.screenings.length,
					next: {
						key: listing.screenings[0].key,
						label: formatScreening(listing.screenings[0].key),
						url: listing.screenings[0].url,
					},
				}))
				.sort((a, b) => a.next.key.localeCompare(b.next.key));

			return {
				id: key,
				title,
				poster: firstWith(group, 'poster') || null,
				overview: firstWith(group, 'overview') || '',
				videos: (firstWith(group, 'videos') || []).slice(0, 1),
				certificate: firstWith(group, 'certificate') || '',
				runtime: firstWith(group, 'runtime') || null,
				venues,
				nextKey: venues[0].next.key,
			};
		})
		.sort((a, b) => a.nextKey.localeCompare(b.nextKey));

	const isNow = film => film.nextKey.slice(0, 10) <= lastNowDay;

	return {
		now: films.filter(isNow),
		soon: films.filter(film => !isNow(film)),
	};
};
