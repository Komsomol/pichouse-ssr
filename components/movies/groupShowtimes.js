import { TARGET_CINEMA_IDS } from '../../server/utils/constants.js';

/**
 * Splits a film's Screen 1 showtimes into one group per cinema, Finsbury Park
 * first (the order of TARGET_CINEMA_IDS), so each cinema's times sit under
 * its own heading. Times keep the order they arrive in, earliest first.
 * @param {Array} showtimes - screen1Showtimes from /api/movies
 * @returns {Array} [{ cinemaId, cinemaName, showtimes }], empty cinemas left out
 */
export const groupShowtimesByCinema = (showtimes) => {
	if (!Array.isArray(showtimes)) return [];

	const rank = (id) => {
		const index = TARGET_CINEMA_IDS.indexOf(id);
		return index === -1 ? TARGET_CINEMA_IDS.length : index;
	};

	return [...new Set(showtimes.map(showtime => showtime.CinemaId))]
		.sort((a, b) => rank(a) - rank(b))
		.map((cinemaId) => {
			const own = showtimes.filter(showtime => showtime.CinemaId === cinemaId);
			return { cinemaId, cinemaName: own[0].cinemaName, showtimes: own };
		});
};
