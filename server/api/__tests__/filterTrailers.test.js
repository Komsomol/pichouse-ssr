import { describe, it, expect } from 'vitest';
import {
	getTrailersOnly,
	normalizeTitle,
	sortByDate,
	deduplicateTrailers,
	hasOutdatedReleaseYear,
} from '../filterTrailers.js';

// Builds a YouTube playlistItems-shaped response
const makeResponse = items => ({
	items: items.map(({ title, publishedAt, videoId = 'abc123' }) => ({
		snippet: {
			title,
			publishedAt,
			resourceId: { videoId },
			thumbnails: { high: { url: `https://i.ytimg.com/vi/${videoId}/hq.jpg` } },
		},
	})),
});

const daysAgo = (days) => {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString();
};

describe('getTrailersOnly', () => {
	it('keeps videos with "official trailer" in the title', () => {
		const response = makeResponse([
			{ title: 'Dune: Part Three - Official Trailer', publishedAt: daysAgo(2) },
		]);
		const result = getTrailersOnly(response, 'Warner Bros. Pictures');

		expect(result).toHaveLength(1);
		expect(result[0].channel).toBe('Warner Bros. Pictures');
		expect(result[0].link).toBe('abc123');
	});

	it('keeps videos with "final trailer" in the title', () => {
		const response = makeResponse([
			{ title: 'Wicked: For Good | Final Trailer', publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'Universal Pictures')).toHaveLength(1);
	});

	it('rejects videos without a search keyword', () => {
		const response = makeResponse([
			{ title: 'Behind the Scenes Featurette', publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'A24')).toHaveLength(0);
	});

	it('rejects excluded keywords even when the title says trailer', () => {
		const response = makeResponse([
			{ title: 'Some Film - Official Trailer (Teaser)', publishedAt: daysAgo(1) },
			{ title: 'Some Show Season 2 - Official Trailer', publishedAt: daysAgo(1) },
			{ title: 'Old Film - Official Trailer | Blu-ray', publishedAt: daysAgo(1) },
			{ title: 'Gore Fest - Official Trailer (Red Band)', publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'Lionsgate Movies')).toHaveLength(0);
	});

	it('rejects streaming series from channels kept for their film output', () => {
		const response = makeResponse([
			{ title: 'Marvel Television’s VisionQuest | Official Trailer', publishedAt: daysAgo(1) },
			{ title: 'LEGO Star Wars | Official Trailer | September 2 on Disney+', publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'Marvel Entertainment')).toHaveLength(0);
	});

	it('rejects back-catalogue re-uploads', () => {
		const response = makeResponse([
			{ title: 'Kickboxer 2 (1989) Official Trailer', publishedAt: daysAgo(1) },
			{ title: 'Sorority Row (2009) Official Trailer', publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'Lionsgate Movies')).toHaveLength(0);
	});

	it('keeps current releases that carry a year in the title', () => {
		const thisYear = new Date().getFullYear();
		const response = makeResponse([
			{ title: `Beware Boiúna (${thisYear}) Official Trailer`, publishedAt: daysAgo(1) },
			{ title: `Heart of the Beast | Official Trailer 2 (${thisYear} Movie)`, publishedAt: daysAgo(1) },
		]);
		expect(getTrailersOnly(response, 'Paramount Pictures')).toHaveLength(2);
	});

	it('rejects videos outside the date window', () => {
		const response = makeResponse([
			{ title: 'Old News - Official Trailer', publishedAt: daysAgo(45) },
		]);
		expect(getTrailersOnly(response, 'Neon')).toHaveLength(0);
	});

	it('respects a custom date window', () => {
		const response = makeResponse([
			{ title: 'Recent - Official Trailer', publishedAt: daysAgo(10) },
		]);
		expect(getTrailersOnly(response, 'Neon', 30)).toHaveLength(1);
		expect(getTrailersOnly(response, 'Neon', 7)).toHaveLength(0);
	});

	it('returns an empty array for invalid input', () => {
		expect(getTrailersOnly(null, 'A24')).toEqual([]);
		expect(getTrailersOnly({}, 'A24')).toEqual([]);
		expect(getTrailersOnly(makeResponse([]), '')).toEqual([]);
	});

	it('skips malformed items without throwing', () => {
		const response = { items: [{ snippet: { title: 'No date - Official Trailer' } }, null] };
		expect(getTrailersOnly(response, 'A24')).toEqual([]);
	});
});

describe('hasOutdatedReleaseYear', () => {
	it('flags a year older than the cutoff', () => {
		expect(hasOutdatedReleaseYear('Kickboxer 2 (1989) Official Trailer', 2025)).toBe(true);
		expect(hasOutdatedReleaseYear('THE PRODIGY (2019) | Official Trailer', 2025)).toBe(true);
	});

	it('allows the cutoff year and newer', () => {
		expect(hasOutdatedReleaseYear('Some Film (2025) Official Trailer', 2025)).toBe(false);
		expect(hasOutdatedReleaseYear('Some Film (2026) Official Trailer', 2025)).toBe(false);
	});

	it('reads a year followed by other words', () => {
		expect(hasOutdatedReleaseYear('Heart of the Beast (2001 Movie)', 2025)).toBe(true);
		expect(hasOutdatedReleaseYear('Heart of the Beast (2026 Movie)', 2025)).toBe(false);
	});

	it('ignores parenthesised text that is not a year', () => {
		expect(hasOutdatedReleaseYear('INSIDIOUS - Final Trailer (4K)', 2025)).toBe(false);
		expect(hasOutdatedReleaseYear('Some Film (HD)', 2025)).toBe(false);
	});

	it('handles missing titles', () => {
		expect(hasOutdatedReleaseYear('', 2025)).toBe(false);
		expect(hasOutdatedReleaseYear(null, 2025)).toBe(false);
	});
});

describe('normalizeTitle', () => {
	it('collapses punctuation differences between studio uploads', () => {
		expect(normalizeTitle('Spider-Man — Official Trailer'))
			.toBe(normalizeTitle('Spider-Man - Official Trailer'));
	});

	it('ignores quality tags', () => {
		expect(normalizeTitle('Avatar - Official Trailer 4K'))
			.toBe(normalizeTitle('Avatar - Official Trailer'));
	});

	it('drops the regional release clause', () => {
		expect(normalizeTitle('Wicked - Official Trailer | In Theaters December 18'))
			.toBe(normalizeTitle('Wicked - Official Trailer | In Cinemas Dec 18'));
	});

	it('keeps sequel markers distinct', () => {
		expect(normalizeTitle('Dune - Official Trailer 2'))
			.not.toBe(normalizeTitle('Dune - Official Trailer'));
	});

	it('drops a parenthesised studio credit', () => {
		expect(normalizeTitle('VIOLENT NIGHT 2 | Official Trailer (Universal Pictures) - HD'))
			.toBe(normalizeTitle('Violent Night 2 | Official Trailer'));
	});

	it('drops a trailing pipe-delimited studio credit', () => {
		expect(normalizeTitle('Primetime | Official Trailer HD | A24'))
			.toBe(normalizeTitle('Primetime | Official Trailer'));
		expect(normalizeTitle('Last Seen — Official Trailer | Apple TV'))
			.toBe(normalizeTitle('Last Seen - Official Trailer'));
	});

	it('keeps a trailing segment that is not a studio name', () => {
		expect(normalizeTitle('LEGO Star Wars | Official Trailer | September 2'))
			.not.toBe(normalizeTitle('LEGO Star Wars | Official Trailer'));
	});

	it('only strips the studio credit when it is the final segment', () => {
		// 'A24' here names the film, not the uploader
		expect(normalizeTitle('A24 | Official Trailer'))
			.not.toBe(normalizeTitle('Official Trailer'));
	});

	it('keeps parenthesised text that is not a studio name', () => {
		expect(normalizeTitle('RAMAYANA - Official Trailer (English)'))
			.not.toBe(normalizeTitle('RAMAYANA - Official Trailer (Hindi)'));
	});

	it('does not strip a studio name that is part of the film title', () => {
		// 'Star Wars' is a channel name, but only an exact parenthesised match
		// is removed, so these stay distinct films
		expect(normalizeTitle('LEGO Star Wars | Official Trailer'))
			.not.toBe(normalizeTitle('LEGO | Official Trailer'));
	});
});

describe('sortByDate', () => {
	it('orders newest first without mutating the input', () => {
		const input = [
			{ name: 'older', dateString: '2026-08-01T00:00:00.000Z' },
			{ name: 'newer', dateString: '2026-08-10T00:00:00.000Z' },
		];
		const sorted = sortByDate(input);

		expect(sorted.map(t => t.name)).toEqual(['newer', 'older']);
		expect(input[0].name).toBe('older');
	});
});

describe('deduplicateTrailers', () => {
	it('merges the same trailer posted by two studios', () => {
		const result = deduplicateTrailers([
			{ name: 'Spider-Man - Official Trailer', channel: 'Sony Pictures Entertainment', link: 'a' },
			{ name: 'Spider-Man — Official Trailer', channel: 'Marvel Entertainment', link: 'b' },
		]);

		expect(result).toHaveLength(1);
		expect(result[0].channel).toBe('Sony Pictures Entertainment');
		expect(result[0].alsoFrom).toEqual(['Marvel Entertainment']);
	});

	it('keeps the first (newest) occurrence', () => {
		const result = deduplicateTrailers([
			{ name: 'Film - Official Trailer', channel: 'A24', link: 'new' },
			{ name: 'Film - Official Trailer', channel: 'A24', link: 'old' },
		]);

		expect(result).toHaveLength(1);
		expect(result[0].link).toBe('new');
		expect(result[0].alsoFrom).toEqual([]);
	});

	it('does not list the same studio twice in alsoFrom', () => {
		const result = deduplicateTrailers([
			{ name: 'Film - Official Trailer', channel: 'A24', link: 'a' },
			{ name: 'Film - Official Trailer', channel: 'Neon', link: 'b' },
			{ name: 'Film - Official Trailer', channel: 'Neon', link: 'c' },
		]);

		expect(result[0].alsoFrom).toEqual(['Neon']);
	});

	it('keeps genuinely different trailers apart', () => {
		const result = deduplicateTrailers([
			{ name: 'Dune - Official Trailer', channel: 'Warner Bros. Pictures', link: 'a' },
			{ name: 'Wicked - Official Trailer', channel: 'Universal Pictures', link: 'b' },
		]);

		expect(result).toHaveLength(2);
	});

	it('falls back to the video ID when a title normalizes to nothing', () => {
		const result = deduplicateTrailers([
			{ name: '!!!', channel: 'A24', link: 'a' },
			{ name: '???', channel: 'Neon', link: 'b' },
		]);

		expect(result).toHaveLength(2);
	});
});
