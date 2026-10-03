import { describe, it, expect } from 'vitest';
import {
	bookablePerformances,
	formatImaxDate,
	formatImaxTime,
	formatLabel,
	toImaxFilms,
} from '../filterImax.js';

// Sat 3 Oct 2026, 12:00 London (BST, UTC+1)
const NOW = Date.UTC(2026, 9, 3, 11, 0);
const HOUR = 60 * 60 * 1000;

// Shapes a Clusterflick performance
const performance = ({ time, soldOut = false, format = { presentation: 'imax' }, bookingUrl = 'https://whatson.bfi.org.uk/imax/film' }) => ({
	time,
	status: { soldOut },
	format,
	bookingUrl,
	screen: 'BFI IMAX',
});

// Shapes a Clusterflick film
const film = ({ title, performances, tmdbId = 1, showingId = title }) => ({
	title,
	showingId,
	overview: { classification: '15', duration: 7740000 },
	themoviedb: { id: tmdbId, summary: `${title} synopsis`, releaseDate: '2026-09-28' },
	performances,
});

describe('formatImaxDate / formatImaxTime', () => {
	it('formats in London time, not the build machine\'s zone', () => {
		// 18:30 UTC is 19:30 in London during BST
		const time = Date.UTC(2026, 9, 3, 18, 30);
		expect(formatImaxDate(time)).toBe('Sat 03 Oct, 2026');
		expect(formatImaxTime(time)).toBe('07:30 PM');
	});

	it('keeps a late London screening on its London date', () => {
		// 23:30 UTC on Sat is 00:30 Sunday in London
		expect(formatImaxDate(Date.UTC(2026, 9, 3, 23, 30))).toBe('Sun 04 Oct, 2026');
	});
});

describe('formatLabel', () => {
	it('labels the 70mm print and nothing else', () => {
		expect(formatLabel({ presentation: 'imax', source: 'imax-70mm' })).toBe('IMAX 70mm');
		expect(formatLabel({ presentation: 'imax' })).toBe('');
		expect(formatLabel({})).toBe('');
		expect(formatLabel(undefined)).toBe('');
	});
});

describe('bookablePerformances', () => {
	it('drops sold-out and already-started performances, earliest first', () => {
		const result = bookablePerformances(
			[
				performance({ time: NOW + 5 * HOUR }),
				performance({ time: NOW + 2 * HOUR, soldOut: true }),
				performance({ time: NOW - HOUR }),
				performance({ time: NOW + 3 * HOUR }),
			],
			NOW,
		);
		expect(result.map(p => p.time)).toEqual([NOW + 3 * HOUR, NOW + 5 * HOUR]);
	});

	it('drops a performance with no booking link', () => {
		expect(bookablePerformances([performance({ time: NOW + HOUR, bookingUrl: '' })], NOW)).toEqual([]);
	});

	it('handles missing input', () => {
		expect(bookablePerformances(undefined, NOW)).toEqual([]);
	});
});

describe('toImaxFilms', () => {
	it('removes films left with no bookable screening', () => {
		const result = toImaxFilms(
			[
				film({ title: 'Sold Out Film', performances: [performance({ time: NOW + HOUR, soldOut: true })] }),
				film({ title: 'Digger', performances: [performance({ time: NOW + HOUR })] }),
			],
			NOW,
		);
		expect(result.map(f => f.title)).toEqual(['Digger']);
	});

	it('orders films by their next bookable screening', () => {
		const result = toImaxFilms(
			[
				film({ title: 'Later', performances: [performance({ time: NOW + 9 * HOUR })] }),
				film({
					title: 'Sooner',
					performances: [
						// Its earliest performance is sold out; the next one still beats "Later"
						performance({ time: NOW + HOUR, soldOut: true }),
						performance({ time: NOW + 4 * HOUR }),
					],
				}),
			],
			NOW,
		);
		expect(result.map(f => f.title)).toEqual(['Sooner', 'Later']);
	});

	it('keeps the BFI title and passes through TMDb id, certificate and runtime', () => {
		const [result] = toImaxFilms(
			[film({ title: 'Bardo + intro by Ian Haydn Smith', tmdbId: 668461, performances: [performance({ time: NOW + HOUR, format: { presentation: 'imax', source: 'imax-70mm' } })] })],
			NOW,
		);
		expect(result).toMatchObject({
			title: 'Bardo + intro by Ian Haydn Smith',
			tmdbId: 668461,
			certificate: '15',
			runtime: 129,
		});
		expect(result.screenings[0]).toMatchObject({ format: 'IMAX 70mm', timeFormat: '01:00 PM' });
	});

	it('returns an empty list for unusable input', () => {
		expect(toImaxFilms(null, NOW)).toEqual([]);
		expect(toImaxFilms({}, NOW)).toEqual([]);
	});
});
