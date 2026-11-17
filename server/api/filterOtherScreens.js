/**
 * "Other screens": films at Finsbury Park and Picturehouse Central outside
 * Screen 1, with their bookable times grouped by cinema, then by day.
 *
 * PURE FUNCTIONS: no side effects, no network. Takes the raw Picturehouse
 * feed plus the current time.
 *
 * Picturehouse's `Showtime` is London local time with no zone, so it is
 * compared as a wall-clock key ("2026-11-16T18:20") and never passed through
 * `new Date()` for comparison - see filterWhatsOn.js.
 */

import { CINEMA_NAMES, OTHER_SCREENS_CONFIG, SCREENING_CONFIG } from '../utils/constants.js';
import { generateBookingUrl, meetsTimeRequirement } from '../utils/helpers.js';
import { formatDayLabel, londonKey } from './filterWhatsOn.js';

const { CINEMA_IDS, EXCLUDED_CLASS, EXCLUDED_TITLE_PREFIXES } = OTHER_SCREENS_CONFIG;

const isLiveBroadcast = movie =>
	String(movie.filter_class_names || '').split(/\s+/).includes(EXCLUDED_CLASS);

const isExcludedTitle = title =>
	EXCLUDED_TITLE_PREFIXES.some(prefix => title.toLowerCase().startsWith(prefix.toLowerCase()));

/**
 * A film's bookable sessions outside Screen 1 at one cinema, weekdays from
 * 6pm and any time at weekends, after `nowKey`.
 * @param {object} movie - Picturehouse feed film
 * @param {string} cinemaId - Picturehouse cinema id
 * @param {string} nowKey - London wall-clock key for now
 * @returns {Array} Sessions as { key, screen, url }, earliest first
 */
const otherScreenSessions = (movie, cinemaId, nowKey) =>
	(movie.show_times || [])
		.filter(showtime =>
			showtime.CinemaId === cinemaId
			&& showtime.ScreenName
			&& showtime.ScreenName !== SCREENING_CONFIG.SCREEN_NAME
			&& String(showtime.Showtime).slice(0, 16) > nowKey
			&& meetsTimeRequirement(showtime.Showtime, SCREENING_CONFIG.MIN_HOUR))
		.map(showtime => ({
			key: String(showtime.Showtime).slice(0, 16),
			screen: showtime.ScreenName,
			url: generateBookingUrl(cinemaId, showtime.SessionId, SCREENING_CONFIG.BOOKING_URL_TEMPLATE),
		}))
		.sort((a, b) => a.key.localeCompare(b.key));

/**
 * Groups sessions into one line per day.
 * @param {Array} sessions - From otherScreenSessions, earliest first
 * @returns {Array} [{ day, label, times: [{ time, screen, url }] }]
 */
export const groupByDay = sessions =>
	sessions.reduce((days, session) => {
		const day = session.key.slice(0, 10);
		const time = { time: session.key.slice(11, 16), screen: session.screen, url: session.url };
		const last = days.at(-1);
		return last?.day === day
			? [...days.slice(0, -1), { ...last, times: [...last.times, time] }]
			: [...days, { day, label: formatDayLabel(day), times: [time] }];
	}, []);

/**
 * Picks the films for the Other screens tab from the raw feed.
 * @param {Array} movies - Picturehouse feed films
 * @param {number} [now] - Current time in epoch milliseconds
 * @returns {Array} Films as { title, certificate, runtime, trailerUrl,
 *   nextKey, count, cinemas: [{ id, name, days }] }, ordered by next showing
 *   at either cinema
 */
export const selectOtherScreenFilms = (movies, now = Date.now()) => {
	const nowKey = londonKey(now);
	const seen = new Set();

	return (Array.isArray(movies) ? movies : [])
		.filter(movie => movie?.Title && !isLiveBroadcast(movie) && !isExcludedTitle(movie.Title))
		.map(movie => ({
			movie,
			cinemas: CINEMA_IDS
				.map(id => ({ id, sessions: otherScreenSessions(movie, id, nowKey) }))
				.filter(cinema => cinema.sessions.length > 0),
		}))
		.filter(({ movie, cinemas }) => {
			if (cinemas.length === 0 || seen.has(movie.Title)) return false;
			seen.add(movie.Title);
			return true;
		})
		.map(({ movie, cinemas }) => {
			const sessions = cinemas.flatMap(cinema => cinema.sessions);
			return {
				title: movie.Title,
				certificate: movie.Rating || '',
				runtime: Number.parseInt(movie.RunTime, 10) || null,
				trailerUrl: movie.TrailerUrl || '',
				nextKey: sessions.map(session => session.key).sort()[0],
				count: sessions.length,
				cinemas: cinemas.map(({ id, sessions: own }) => ({
					id,
					name: CINEMA_NAMES[id],
					days: groupByDay(own),
				})),
			};
		})
		.sort((a, b) => a.nextKey.localeCompare(b.nextKey));
};
