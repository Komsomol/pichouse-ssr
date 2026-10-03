import { describe, it, expect } from 'vitest';
import {
	addDays,
	buildWhatsOn,
	formatDayLabel,
	formatScreening,
	fromImax,
	fromMovies,
	londonKey,
} from '../filterWhatsOn.js';

// Sat 3 Oct 2026, 12:00 London (BST, UTC+1)
const NOW = Date.UTC(2026, 9, 3, 11, 0);

// Shapes a listing as fromMovies / fromImax produce them
const listing = ({ title, venue = 'Screen 1', keys, places = [], overview = `${title} synopsis` }) => ({
	title,
	poster: `https://img/${title}.jpg`,
	overview,
	videos: [{ key: `${title}-trailer`, name: 'Official Trailer' }],
	certificate: '15',
	runtime: 120,
	venue,
	tab: venue === 'Screen 1' ? '/' : '/imax',
	screenings: keys.map((key, index) => ({ key, url: `https://book/${title}/${key}`, place: places[index] || '' })),
});

describe('London time helpers', () => {
	it('reads an instant as London wall-clock time', () => {
		expect(londonKey(Date.UTC(2026, 9, 3, 18, 30))).toBe('2026-10-03T19:30');
	});

	it('puts a late-night UTC instant on the next London day', () => {
		expect(londonKey(Date.UTC(2026, 9, 3, 23, 30))).toBe('2026-10-04T00:30');
	});

	it('adds calendar days across the October clock change', () => {
		expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
	});

	it('formats dates and screenings briefly', () => {
		expect(formatDayLabel('2026-10-03')).toBe('Sat 3 Oct');
		expect(formatScreening('2026-10-03T19:30')).toBe('Sat 3 Oct, 19:30');
	});
});

describe('fromMovies', () => {
	it('keeps Picturehouse wall-clock time, the display title and a short cinema name', () => {
		const [result] = fromMovies([
			{
				Title: 'Digger',
				_originalTitle: 'Digger (35mm)',
				Rating: '15',
				RunTime: '129',
				overview: 'Synopsis',
				poster: 'https://img/d.jpg',
				videos: [],
				screen1Showtimes: [
					{ Showtime: '2026-10-03T19:30:00', cinemaName: 'Picturehouse Central', bookingUrl: 'https://b/1' },
				],
			},
		]);
		expect(result).toMatchObject({ title: 'Digger (35mm)', venue: 'Screen 1', runtime: 129, certificate: '15' });
		expect(result.screenings).toEqual([{ key: '2026-10-03T19:30', url: 'https://b/1', place: 'Central' }]);
	});

	it('handles missing input', () => {
		expect(fromMovies(undefined)).toEqual([]);
	});
});

describe('fromImax', () => {
	it('converts epoch times to London and carries the 70mm format as the place', () => {
		const [result] = fromImax([
			{
				title: 'The Odyssey',
				screenings: [{ time: Date.UTC(2026, 9, 3, 18, 30), format: 'IMAX 70mm', bookingUrl: 'https://b/i' }],
			},
		]);
		expect(result.venue).toBe('BFI IMAX');
		expect(result.screenings).toEqual([{ key: '2026-10-03T19:30', url: 'https://b/i', place: 'IMAX 70mm' }]);
	});
});

describe('buildWhatsOn', () => {
	it('splits films into playing this week and coming soon by next screening', () => {
		const result = buildWhatsOn(
			[
				listing({ title: 'Tonight', keys: ['2026-10-03T19:30'] }),
				listing({ title: 'Day seven', keys: ['2026-10-09T20:00'] }),
				listing({ title: 'December', keys: ['2026-12-18T19:00'] }),
			],
			NOW,
		);
		expect(result.now.map(film => film.title)).toEqual(['Tonight', 'Day seven']);
		expect(result.soon.map(film => film.title)).toEqual(['December']);
	});

	it('ignores screenings that have started, and drops films left with none', () => {
		const result = buildWhatsOn(
			[
				listing({ title: 'Gone', keys: ['2026-10-03T10:00'] }),
				listing({ title: 'Digger', keys: ['2026-10-03T11:30', '2026-10-03T17:30'] }),
			],
			NOW,
		);
		expect(result.now.map(film => film.title)).toEqual(['Digger']);
		expect(result.now[0].venues[0]).toMatchObject({ count: 1, next: { label: 'Sat 3 Oct, 17:30' } });
	});

	it('merges one film listed at both venues into one entry, a line per venue', () => {
		const { now } = buildWhatsOn(
			[
				listing({ title: 'The Odyssey (70mm)', keys: ['2026-10-04T12:30'], places: ['Central'] }),
				listing({ title: 'The Odyssey', venue: 'BFI IMAX', keys: ['2026-10-03T14:15', '2026-10-05T14:15'] }),
			],
			NOW,
		);
		expect(now).toHaveLength(1);
		expect(now[0].title).toBe('The Odyssey');
		expect(now[0].venues.map(venue => [venue.venue, venue.count, venue.listingTitle])).toEqual([
			['BFI IMAX', 2, ''],
			['Screen 1', 1, 'The Odyssey (70mm)'],
		]);
	});

	it('merges titles that differ only in punctuation', () => {
		const { soon } = buildWhatsOn(
			[
				listing({ title: 'Ken Russell\'s The Devils', keys: ['2026-10-30T20:30'] }),
				listing({ title: 'Ken Russell’s The Devils', venue: 'BFI IMAX', keys: ['2026-11-01T14:30'] }),
			],
			NOW,
		);
		expect(soon).toHaveLength(1);
		expect(soon[0].venues).toHaveLength(2);
	});

	it('keeps one trailer and the first available summary', () => {
		const { now } = buildWhatsOn(
			[
				listing({ title: 'Digger', keys: ['2026-10-04T10:30'], overview: '' }),
				listing({ title: 'Digger', venue: 'BFI IMAX', keys: ['2026-10-04T14:30'] }),
			],
			NOW,
		);
		expect(now[0].overview).toBe('Digger synopsis');
		expect(now[0].videos).toHaveLength(1);
	});

	it('returns empty sections for no listings', () => {
		expect(buildWhatsOn([], NOW)).toEqual({ now: [], soon: [] });
		expect(buildWhatsOn(undefined, NOW)).toEqual({ now: [], soon: [] });
	});
});
