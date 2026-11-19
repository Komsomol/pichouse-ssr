import { describe, it, expect } from 'vitest';
import { groupShowtimesByCinema } from '../groupShowtimes.js';

const showtime = (CinemaId, cinemaName, Showtime) => ({ CinemaId, cinemaName, Showtime, SessionId: `${CinemaId}-${Showtime}` });

describe('groupShowtimesByCinema', () => {
	it('puts Finsbury Park first even when Central plays sooner', () => {
		const groups = groupShowtimesByCinema([
			showtime('022', 'Picturehouse Central', '2026-11-19T18:00:00'),
			showtime('029', 'Finsbury Park', '2026-11-20T19:00:00'),
			showtime('022', 'Picturehouse Central', '2026-11-21T20:00:00'),
		]);

		expect(groups.map(group => [group.cinemaName, group.showtimes.map(s => s.Showtime)])).toEqual([
			['Finsbury Park', ['2026-11-20T19:00:00']],
			['Picturehouse Central', ['2026-11-19T18:00:00', '2026-11-21T20:00:00']],
		]);
	});

	it('leaves out a cinema with no showtimes', () => {
		const groups = groupShowtimesByCinema([showtime('022', 'Picturehouse Central', '2026-11-19T18:00:00')]);

		expect(groups.map(group => group.cinemaId)).toEqual(['022']);
	});

	it('handles missing input', () => {
		expect(groupShowtimesByCinema(undefined)).toEqual([]);
	});
});
