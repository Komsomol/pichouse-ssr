import { describe, it, expect } from 'vitest';
import {
	createFallbackVideos,
	meetsTimeRequirement,
	generateBookingUrl,
	normalizeTitleKey,
} from '../helpers.js';

describe('createFallbackVideos', () => {
	it('should extract video ID from YouTube URL', () => {
		const result = createFallbackVideos('https://www.youtube.com/watch?v=abc123');
		expect(result).toEqual([
			{
				key: 'abc123',
				name: 'Official Trailer',
				site: 'YouTube',
			},
		]);
	});

	it('should return empty array for null/undefined URL', () => {
		expect(createFallbackVideos(null)).toEqual([]);
		expect(createFallbackVideos(undefined)).toEqual([]);
		expect(createFallbackVideos('')).toEqual([]);
	});

	it('should return empty array for invalid YouTube URL', () => {
		expect(createFallbackVideos('https://example.com')).toEqual([]);
	});
});

describe('meetsTimeRequirement', () => {
	const minHour = 18; // 6 PM

	describe('weekdays (Mon-Fri)', () => {
		it('should return true for times after 6 PM on Monday', () => {
			// Monday Dec 9, 2025 at 7:00 PM
			const monday7pm = '2025-12-08T19:00:00';
			expect(meetsTimeRequirement(monday7pm, minHour)).toBe(true);
		});

		it('should return true for times at exactly 6 PM on Wednesday', () => {
			// Wednesday Dec 10, 2025 at 6:00 PM
			const wednesday6pm = '2025-12-10T18:00:00';
			expect(meetsTimeRequirement(wednesday6pm, minHour)).toBe(true);
		});

		it('should return false for times before 6 PM on Friday', () => {
			// Friday Dec 12, 2025 at 2:00 PM
			const friday2pm = '2025-12-12T14:00:00';
			expect(meetsTimeRequirement(friday2pm, minHour)).toBe(false);
		});

		it('should return false for times before 6 PM on Tuesday', () => {
			// Tuesday Dec 9, 2025 at 10:00 AM
			const tuesday10am = '2025-12-09T10:00:00';
			expect(meetsTimeRequirement(tuesday10am, minHour)).toBe(false);
		});
	});

	describe('weekends (Sat-Sun)', () => {
		it('should return true for morning times on Saturday', () => {
			// Saturday Dec 13, 2025 at 10:00 AM
			const saturday10am = '2025-12-13T10:00:00';
			expect(meetsTimeRequirement(saturday10am, minHour)).toBe(true);
		});

		it('should return true for afternoon times on Saturday', () => {
			// Saturday Dec 13, 2025 at 2:00 PM
			const saturday2pm = '2025-12-13T14:00:00';
			expect(meetsTimeRequirement(saturday2pm, minHour)).toBe(true);
		});

		it('should return true for morning times on Sunday', () => {
			// Sunday Dec 14, 2025 at 11:00 AM
			const sunday11am = '2025-12-14T11:00:00';
			expect(meetsTimeRequirement(sunday11am, minHour)).toBe(true);
		});

		it('should return true for evening times on Sunday', () => {
			// Sunday Dec 14, 2025 at 8:00 PM
			const sunday8pm = '2025-12-14T20:00:00';
			expect(meetsTimeRequirement(sunday8pm, minHour)).toBe(true);
		});
	});
});

describe('generateBookingUrl', () => {
	it('should replace cinemaId and sessionId in template', () => {
		const template = 'https://example.com/order/showtimes/{cinemaId}-{sessionId}/seats';
		const result = generateBookingUrl('031', '12345', template);
		expect(result).toBe('https://example.com/order/showtimes/031-12345/seats');
	});

	it('should handle different templates', () => {
		const template = 'https://booking.com/{cinemaId}/{sessionId}';
		const result = generateBookingUrl('022', '99999', template);
		expect(result).toBe('https://booking.com/022/99999');
	});
});

describe('normalizeTitleKey', () => {
	it('lowercases and collapses punctuation to single spaces', () => {
		expect(normalizeTitleKey('Spider-Man: Brand New Day')).toBe('spider man brand new day');
		expect(normalizeTitleKey('  Wicked:  For Good!  ')).toBe('wicked for good');
	});

	it('folds accents so a listing meets a native title', () => {
		expect(normalizeTitleKey('Sir\u0101t')).toBe('sirat');
		expect(normalizeTitleKey('Cos\u00EC fan tutte')).toBe('cosi fan tutte');
		expect(normalizeTitleKey('Boi\u00FAna')).toBe('boiuna');
	});

	it('spells out "&" so it meets "and"', () => {
		expect(normalizeTitleKey('Sid & Nancy')).toBe(normalizeTitleKey('Sid and Nancy'));
		expect(normalizeTitleKey('UK & IE')).toBe('uk and ie');
	});

	it('handles empty input', () => {
		expect(normalizeTitleKey('')).toBe('');
		expect(normalizeTitleKey(null)).toBe('');
		expect(normalizeTitleKey(undefined)).toBe('');
	});
});
