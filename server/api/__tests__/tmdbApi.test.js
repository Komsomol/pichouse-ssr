import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { filterTrailerVideos, fetchVideosAndPosterFromTMDb, pickCurrentRelease } from '../tmdbApi.js';

vi.mock('axios');

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

describe('fetchVideosAndPosterFromTMDb', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('never logs the Authorization header when a request fails', async () => {
		// Shaped like a real axios 404: the request config rides along on it
		const error = Object.assign(new Error('Request failed with status code 404'), {
			config: { headers: { Authorization: 'Bearer secret-token' } },
			response: { status: 404, data: { status_code: 34 } },
		});
		axios.get.mockRejectedValueOnce(error);
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await fetchVideosAndPosterFromTMDb(1786842);

		expect(result).toEqual({ videos: [], poster: null, runtime: null, voteAverage: null });
		expect(logged).toHaveBeenCalledOnce();
		expect(JSON.stringify(logged.mock.calls)).not.toContain('secret-token');
		expect(logged.mock.calls[0][1]).toBe(404);
	});
});

describe('pickCurrentRelease', () => {
	// Mon 5 Oct 2026
	const NOW = Date.UTC(2026, 9, 5, 12);
	const result = (title, release_date) => ({ title, original_title: title, release_date });

	it('picks the newest released film of that exact title, not TMDb\'s first', () => {
		// TMDb's real order for this search, 1995 version first
		const movies = [
			result('Sense and Sensibility', '1995-12-13'),
			result('Sense and Sensibility', '2026-09-23'),
			result('Sense and Sensibility', '2023-11-25'),
			result('Sensibility and Sense', '1990-01-24'),
		];
		expect(pickCurrentRelease(movies, 'Sense and Sensibility', NOW).release_date).toBe('2026-09-23');
	});

	it('ignores newer films whose title only resembles the search', () => {
		const movies = [result('Alien', '1979-05-25'), result('Alien Spa', '2026-09-16')];
		expect(pickCurrentRelease(movies, 'Alien', NOW).title).toBe('Alien');
	});

	it('skips a same-titled film that is not out yet', () => {
		const movies = [result('Pressure', '2026-05-29'), result('Pressure', '2027-03-01')];
		expect(pickCurrentRelease(movies, 'Pressure', NOW).release_date).toBe('2026-05-29');
	});

	it('falls back to TMDb\'s first result when nothing matches exactly', () => {
		const movies = [result('The Paradise Club', '2026-01-01'), result('Paradise', '2020-01-01')];
		expect(pickCurrentRelease(movies, 'The Paradise', NOW).title).toBe('The Paradise Club');
	});
});
