import { describe, it, expect } from 'vitest';
import { sanitizeMovieTitle, filterMoviesByCinemaAndRemoveDuplicates } from '../filterMovies.js';

describe('sanitizeMovieTitle', () => {
	it('should remove year in parentheses', () => {
		expect(sanitizeMovieTitle('The Matrix (1999)')).toBe('The Matrix');
	});

	it('should remove ratings at the end', () => {
		expect(sanitizeMovieTitle('The Matrix PG')).toBe('The Matrix');
		expect(sanitizeMovieTitle('The Matrix U')).toBe('The Matrix');
	});

	it('should remove special prefixes', () => {
		expect(sanitizeMovieTitle('FILM CLUB: The Matrix')).toBe('The Matrix');
		expect(sanitizeMovieTitle('NT Live: Hamlet')).toBe('Hamlet');
	});

	it('should remove rerelease indicators', () => {
		expect(sanitizeMovieTitle('The Matrix (Rerelease)')).toBe('The Matrix');
		expect(sanitizeMovieTitle('The Matrix Re-release')).toBe('The Matrix');
	});

	it('should remove anniversary indicators', () => {
		expect(sanitizeMovieTitle('The Matrix (40th Anniversary)')).toBe('The Matrix');
		expect(sanitizeMovieTitle('The Matrix (Anniversary)')).toBe('The Matrix');
	});

	it('should remove 4K restoration indicator', () => {
		expect(sanitizeMovieTitle('The Matrix (4K Restoration)')).toBe('The Matrix');
	});

	it('should handle multiple patterns at once', () => {
		expect(sanitizeMovieTitle('FILM CLUB: The Matrix (1999) (Rerelease) PG')).toBe('The Matrix');
	});

	it('should return null for empty titles', () => {
		expect(sanitizeMovieTitle('')).toBeNull();
	});

	it('should handle edge cases with only metadata', () => {
		// These might return shortened strings after removing metadata
		const result = sanitizeMovieTitle('(1999) PG');
		// After removing year and rating, we get "PG" -> then rating removal happens
		// But our regex doesn't match standalone "PG" at the beginning
		expect(result).toBeTruthy(); // Should return something, not null
	});

	it('should handle titles with no patterns to remove', () => {
		expect(sanitizeMovieTitle('The Matrix')).toBe('The Matrix');
		expect(sanitizeMovieTitle('Inception')).toBe('Inception');
	});
});

describe('filterMoviesByCinemaAndRemoveDuplicates', () => {
	const mockMovies = [
		{
			Title: 'The Matrix (1999)',
			available_cinemas: ['031', '042'],
			ID: '1',
		},
		{
			Title: 'The Matrix PG',
			available_cinemas: ['031'],
			ID: '2',
		},
		{
			Title: 'Inception',
			available_cinemas: ['042'],
			ID: '3',
		},
		{
			Title: 'Interstellar',
			available_cinemas: ['031'],
			ID: '4',
		},
		{
			Title: 'Dawn of Impressionism - Paris 1874',
			available_cinemas: ['031'],
			ID: '5',
		},
	];

	it('should filter movies by cinema ID', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '031');
		const titles = result.map(m => m.Title);
		expect(titles).toContain('The Matrix');
		expect(titles).toContain('Interstellar');
		expect(titles).not.toContain('Inception'); // Not in cinema 031
	});

	it('should remove duplicate titles after sanitization', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '031');
		const matrixMovies = result.filter(m => m.Title === 'The Matrix');
		expect(matrixMovies).toHaveLength(1); // Should only have one "The Matrix"
	});

	it('should exclude movies in exclusion list', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '031');
		const titles = result.map(m => m.Title);
		expect(titles).not.toContain('Dawn of Impressionism - Paris 1874');
	});

	it('should not mutate original movie objects', () => {
		const originalTitle = mockMovies[0].Title;
		filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '031');
		expect(mockMovies[0].Title).toBe(originalTitle); // Original should be unchanged
	});

	it('should return new objects with sanitized titles', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '031');
		const movie = result.find(m => m.ID === '1');
		expect(movie.Title).toBe('The Matrix');
		expect(movie._originalTitle).toBe('The Matrix (1999)');
	});

	it('should handle empty array', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates([], '031');
		expect(result).toEqual([]);
	});

	it('should handle movies with no matching cinema', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '999');
		expect(result).toEqual([]);
	});
});
