import { describe, it, expect } from 'vitest';
import { filterTrailerVideos } from '../tmdbApi.js';

// Shapes a TMDb video result
const video = ({
	name,
	type = 'Trailer',
	official = true,
	site = 'YouTube',
	published_at = '2026-01-01T00:00:00.000Z',
	key = name,
}) => ({ name, type, official, site, published_at, key });

describe('filterTrailerVideos', () => {
	it('ignores a featurette whose name mentions a trailer', () => {
		// The End of Oak Street: a name match ranked this above the real trailer
		const videos = [
			video({ name: 'Have you experienced the new trailer?', type: 'Featurette' }),
			video({ name: 'Official Trailer' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('ignores a teaser, however it is named', () => {
		const videos = [
			video({ name: 'Dog Vision Trailer', type: 'Teaser' }),
			video({ name: 'Official Trailer' }),
		];
		expect(filterTrailerVideos(videos)).toHaveLength(1);
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('ranks a named trailer above a newer promo spot typed as one', () => {
		const videos = [
			video({ name: 'Tickets now on sale', published_at: '2026-07-22T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2026-06-01T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('prefers the newest when both name themselves a trailer', () => {
		const videos = [
			video({ name: 'Official Teaser Trailer', published_at: '2026-03-26T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2026-06-01T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('prefers an official upload over a fan submission', () => {
		const videos = [
			video({ name: 'Trailer', official: false, published_at: '2026-09-01T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2026-06-01T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('ranks a countdown promo below the main trailer', () => {
		// The Odyssey: the countdown is the newest thing it has
		const videos = [
			video({ name: 'Official Countdown Trailer', published_at: '2026-07-01T00:00:00.000Z' }),
			video({ name: 'Official New Trailer', published_at: '2026-05-05T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2025-12-22T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official New Trailer');
	});

	it('ranks a regional cut below the main trailer', () => {
		const videos = [
			video({ name: 'Official US Trailer', published_at: '2026-08-11T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2026-05-05T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Trailer');
	});

	it('does not treat a lowercase "us" as a regional marker', () => {
		const videos = [
			video({ name: 'Trailer - Bring us home', published_at: '2026-08-11T00:00:00.000Z' }),
			video({ name: 'Official Trailer', published_at: '2026-05-05T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Trailer - Bring us home');
	});

	it('lands on the final trailer without naming it a special case', () => {
		// A final trailer always postdates the official trailer it follows
		const videos = [
			video({ name: 'Official Trailer', published_at: '2026-02-19T00:00:00.000Z' }),
			video({ name: 'Final Trailer', published_at: '2026-05-26T00:00:00.000Z' }),
		];
		expect(filterTrailerVideos(videos)[0].name).toBe('Final Trailer');
	});

	it('still returns a promo cut when it is all a film has', () => {
		const videos = [video({ name: 'Official Countdown Trailer' })];
		expect(filterTrailerVideos(videos)).toHaveLength(1);
	});

	it('falls back to a name match when nothing is typed as a trailer', () => {
		// Keeps a film that only ever had a teaser rather than dropping it
		const videos = [
			video({ name: 'Official Teaser Trailer', type: 'Teaser' }),
			video({ name: 'Behind the scenes', type: 'Behind the Scenes' }),
		];
		expect(filterTrailerVideos(videos)).toHaveLength(1);
		expect(filterTrailerVideos(videos)[0].name).toBe('Official Teaser Trailer');
	});

	it('drops videos hosted anywhere but YouTube', () => {
		expect(filterTrailerVideos([video({ name: 'Official Trailer', site: 'Vimeo' })])).toEqual([]);
	});

	it('handles missing input', () => {
		expect(filterTrailerVideos([])).toEqual([]);
		expect(filterTrailerVideos()).toEqual([]);
	});
});
