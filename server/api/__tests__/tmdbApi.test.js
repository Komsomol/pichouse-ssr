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
