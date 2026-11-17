import { describe, it, expect } from 'vitest';
import { groupByDay, selectOtherScreenFilms } from '../filterOtherScreens.js';

// Mon 16 Nov 2026, 12:00 London (GMT, so UTC+0)
const NOW = Date.UTC(2026, 10, 16, 12, 0);

const session = (Showtime, ScreenName = 'Screen 4', CinemaId = '029') => ({
	CinemaId,
	ScreenName,
	Showtime,
	SessionId: `${ScreenName}-${Showtime}`,
});

const film = (Title, show_times, extra = {}) => ({
	Title,
	Rating: '15',
	RunTime: '120',
	TrailerUrl: '',
	filter_class_names: '',
	show_times,
	...extra,
});

describe('selectOtherScreenFilms', () => {
	it('keeps weekday times from 6pm and weekend times all day', () => {
		const [result] = selectOtherScreenFilms([
			film('Wild Horse Nine', [
				session('2026-11-16T14:20:00'), // weekday afternoon: dropped
				session('2026-11-16T18:20:00'),
				session('2026-11-21T11:00:00', 'Screen 6'), // Saturday morning: kept
			]),
		], NOW);

		expect(result.cinemas.map(cinema => cinema.name)).toEqual(['Finsbury Park']);
		expect(result.cinemas[0].days).toEqual([
			{
				day: '2026-11-16',
				label: 'Mon 16 Nov',
				times: [{ time: '18:20', screen: 'Screen 4', url: 'https://web.picturehouses.com/order/showtimes/029-Screen 4-2026-11-16T18:20:00/seats' }],
			},
			{
				day: '2026-11-21',
				label: 'Sat 21 Nov',
				times: [{ time: '11:00', screen: 'Screen 6', url: 'https://web.picturehouses.com/order/showtimes/029-Screen 6-2026-11-21T11:00:00/seats' }],
			},
		]);
		expect(result.count).toBe(2);
	});

	it('leaves out Screen 1, cinemas other than Finsbury Park and Central, and past showings', () => {
		const result = selectOtherScreenFilms([
			film('Fjord', [
				session('2026-11-16T19:00:00', 'Screen 1'),
				session('2026-11-17T19:00:00', 'Screen 3', '016'), // The Gate
				session('2026-11-17T19:00:00', 'Screen 1', '022'), // Central's Screen 1
				session('2026-11-15T19:00:00'), // yesterday
				session('2026-11-17T20:00:00', 'Screen 3'),
			]),
		], NOW);

		expect(result).toHaveLength(1);
		expect(result[0].cinemas.flatMap(cinema => cinema.days).flatMap(day => day.times)).toEqual([
			expect.objectContaining({ time: '20:00', screen: 'Screen 3' }),
		]);
	});

	it('lists Central after Finsbury Park, with Central booking links', () => {
		const [result] = selectOtherScreenFilms([
			film('Hamnet', [
				session('2026-11-18T19:00:00', 'KIA Screen 2', '022'),
				session('2026-11-19T20:00:00', 'Screen 5'),
			]),
		], NOW);

		expect(result.cinemas.map(cinema => [cinema.name, cinema.days.map(day => day.label)])).toEqual([
			['Finsbury Park', ['Thu 19 Nov']],
			['Picturehouse Central', ['Wed 18 Nov']],
		]);
		expect(result.cinemas[1].days[0].times[0].url)
			.toBe('https://web.picturehouses.com/order/showtimes/022-KIA Screen 2-2026-11-18T19:00:00/seats');
		expect(result.nextKey).toBe('2026-11-18T19:00');
		expect(result.count).toBe(2);
	});

	it('lists a Central-only film', () => {
		const [result] = selectOtherScreenFilms([
			film('Sirat', [session('2026-11-17T18:30:00', 'Screen 7', '022')]),
		], NOW);

		expect(result.cinemas.map(cinema => cinema.name)).toEqual(['Picturehouse Central']);
	});

	it('drops a film that only plays Screen 1', () => {
		expect(selectOtherScreenFilms([film('Naza', [session('2026-11-19T19:00:00', 'Screen 1')])], NOW))
			.toEqual([]);
	});

	it('drops live broadcasts tagged screen_arts and Bar Trash, keeps other tagged films', () => {
		const evening = [session('2026-11-17T19:30:00')];
		const result = selectOtherScreenFilms([
			film('RBO Live 2026-27: Tosca', evening, { filter_class_names: 'ad_and_trailer_free live_via_satellite screen_arts' }),
			film('Bar Trash Presents: Mystery Film?!', evening),
			film('Elf', evening, { filter_class_names: 'kids_club rediscover' }),
		], NOW);

		expect(result.map(entry => entry.title)).toEqual(['Elf']);
	});

	it('orders films by next showing and lists each title once', () => {
		const result = selectOtherScreenFilms([
			film('Later', [session('2026-11-20T19:00:00')]),
			film('Sooner', [session('2026-11-17T19:00:00')]),
			film('Sooner', [session('2026-11-18T19:00:00')]),
		], NOW);

		expect(result.map(entry => [entry.title, entry.nextKey])).toEqual([
			['Sooner', '2026-11-17T19:00'],
			['Later', '2026-11-20T19:00'],
		]);
	});

	it('handles missing input', () => {
		expect(selectOtherScreenFilms(undefined, NOW)).toEqual([]);
	});
});

describe('groupByDay', () => {
	it('puts same-day times on one line, in order', () => {
		const days = groupByDay([
			{ key: '2026-11-16T18:20', screen: 'Screen 4', url: 'a' },
			{ key: '2026-11-16T20:50', screen: 'Screen 6', url: 'b' },
			{ key: '2026-11-17T19:00', screen: 'Club Room', url: 'c' },
		]);

		expect(days.map(day => [day.label, day.times.map(time => time.time)])).toEqual([
			['Mon 16 Nov', ['18:20', '20:50']],
			['Tue 17 Nov', ['19:00']],
		]);
	});
});
