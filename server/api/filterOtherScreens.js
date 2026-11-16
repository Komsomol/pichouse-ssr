/**
 * "Other screens": films at Finsbury Park outside Screen 1, with their
 * bookable times grouped by day.
 *
 * PURE FUNCTIONS: no side effects, no network. Takes the raw Picturehouse
 * feed plus the current time.
 *
 * Picturehouse's `Showtime` is London local time with no zone, so it is
 * compared as a wall-clock key ("2026-11-16T18:20") and never passed through
 * `new Date()` for comparison - see filterWhatsOn.js.
 */

import { OTHER_SCREENS_CONFIG, SCREENING_CONFIG } from '../utils/constants.js';
import { generateBookingUrl, meetsTimeRequirement } from '../utils/helpers.js';
import { formatDayLabel, londonKey } from './filterWhatsOn.js';

const { CINEMA_ID, EXCLUDED_CLASS, EXCLUDED_TITLE_PREFIXES } = OTHER_SCREENS_CONFIG;

const isLiveBroadcast = movie =>
	String(movie.filter_class_names || '').split(/\s+/).includes(EXCLUDED_CLASS);

const isExcludedTitle = title =>
	EXCLUDED_TITLE_PREFIXES.some(prefix => title.toLowerCase().startsWith(prefix.toLowerCase()));

/**
 * A film's bookable sessions outside Screen 1 at Finsbury Park, weekdays from
 * 6pm and any time at weekends, after `nowKey`.
 * @param {object} movie - Picturehouse feed film
 * @param {string} nowKey - London wall-clock key for now
 * @returns {Array} Sessions as { key, screen, url }, earliest first
 */
const otherScreenSessions = (movie, nowKey) =>
	(movie.show_times || [])
		.filter(showtime =>
			showtime.CinemaId === CINEMA_ID
			&& showtime.ScreenName
			&& showtime.ScreenName !== SCREENING_CONFIG.SCREEN_NAME
			&& String(showtime.Showtime).slice(0, 16) > nowKey
			&& meetsTimeRequirement(showtime.Showtime, SCREENING_CONFIG.MIN_HOUR))
		.map(showtime => ({
			key: String(showtime.Showtime).slice(0, 16),
			screen: showtime.ScreenName,
			url: generateBookingUrl(CINEMA_ID, showtime.SessionId, SCREENING_CONFIG.BOOKING_URL_TEMPLATE),
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
 *   nextKey, count, days }, ordered by next showing
 */
export const selectOtherScreenFilms = (movies, now = Date.now()) => {
	const nowKey = londonKey(now);
	const seen = new Set();

	return (Array.isArray(movies) ? movies : [])
		.filter(movie => movie?.Title && !isLiveBroadcast(movie) && !isExcludedTitle(movie.Title))
		.map(movie => ({ movie, sessions: otherScreenSessions(movie, nowKey) }))
		.filter(({ movie, sessions }) => {
			if (sessions.length === 0 || seen.has(movie.Title)) return false;
			seen.add(movie.Title);
			return true;
		})
		.map(({ movie, sessions }) => ({
			title: movie.Title,
			certificate: movie.Rating || '',
			runtime: Number.parseInt(movie.RunTime, 10) || null,
			trailerUrl: movie.TrailerUrl || '',
			nextKey: sessions[0].key,
			count: sessions.length,
			days: groupByDay(sessions),
		}))
		.sort((a, b) => a.nextKey.localeCompare(b.nextKey));
};
