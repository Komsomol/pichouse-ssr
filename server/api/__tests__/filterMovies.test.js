import { describe, it, expect } from 'vitest';
import { sanitizeMovieTitle, filterMoviesByCinemaAndRemoveDuplicates, cleanTitleForSearch, stripStrandPrefix, filterByExactTitle } from '../filterMovies.js';

describe('cleanTitleForSearch', () => {
	it('should remove 35mm format indicator', () => {
		expect(cleanTitleForSearch('Kill Bill: The Whole Bloody Affair - 35mm')).toBe('Kill Bill: The Whole Bloody Affair');
	});

	it('should remove 70mm format indicator', () => {
		expect(cleanTitleForSearch('Aliens - 70mm')).toBe('Aliens');
	});

	it('should remove anniversary indicators', () => {
		expect(cleanTitleForSearch('The Shining (45th Anniversary)')).toBe('The Shining');
		expect(cleanTitleForSearch('Jaws (50th Anniversary)')).toBe('Jaws');
	});

	it('should remove 4K restoration indicator', () => {
		expect(cleanTitleForSearch('Blade Runner (4K Restoration)')).toBe('Blade Runner');
	});

	it('should remove NT Live prefix', () => {
		expect(cleanTitleForSearch('NT Live: Hamlet')).toBe('Hamlet');
	});

	it('should remove FILM CLUB prefix', () => {
		expect(cleanTitleForSearch('FILM CLUB: The Matrix')).toBe('The Matrix');
	});

	it('should not modify normal titles', () => {
		expect(cleanTitleForSearch('Wicked: For Good')).toBe('Wicked: For Good');
		expect(cleanTitleForSearch('The Godfather')).toBe('The Godfather');
	});

	it('should strip any event add-on after a "+"', () => {
		expect(cleanTitleForSearch('Pressure + Q&A')).toBe('Pressure');
		expect(cleanTitleForSearch('Pressure + Live Broadcast Q&A')).toBe('Pressure');
		expect(cleanTitleForSearch('Paddington + PJ Party')).toBe('Paddington');
		expect(cleanTitleForSearch('Elf + Mulled Wine & Festive Cakes')).toBe('Elf');
		// Any future add-on wording, without needing a pattern of its own
		expect(cleanTitleForSearch('Pressure + Director Introduction')).toBe('Pressure');
	});

	it('should keep a title that is only a "+" clause', () => {
		// Stripping would empty it, so the original stands
		expect(cleanTitleForSearch('+1')).toBe('+1');
	});

	it('should handle empty or null input', () => {
		expect(cleanTitleForSearch('')).toBe('');
		expect(cleanTitleForSearch(null)).toBe('');
	});
});

describe('stripStrandPrefix', () => {
	it('drops a season or strand prefix', () => {
		expect(stripStrandPrefix('Out at Clapham: Beautiful Thing')).toBe('Beautiful Thing');
		expect(stripStrandPrefix('Green Screen: Burning Skies')).toBe('Burning Skies');
		expect(stripStrandPrefix('Dog-Friendly Screening: The Odyssey')).toBe('The Odyssey');
		expect(stripStrandPrefix('CFS: Sirat')).toBe('Sirat');
	});

	it('splits on the first colon so a nested title survives', () => {
		expect(stripStrandPrefix('CFS: Pompei: Below the Clouds')).toBe('Pompei: Below the Clouds');
	});

	it('drops a presenter named without a colon', () => {
		expect(stripStrandPrefix('American Library presents Pressure')).toBe('Pressure');
		expect(stripStrandPrefix('Green Screen with UKELA Presents 2040')).toBe('2040');
	});

	it('returns an empty string when there is no prefix to drop', () => {
		expect(stripStrandPrefix('The Godfather')).toBe('');
		expect(stripStrandPrefix('')).toBe('');
		expect(stripStrandPrefix(null)).toBe('');
	});

	it('does not treat a leading colon as a prefix', () => {
		expect(stripStrandPrefix(': Pressure')).toBe('');
	});

	// It cannot tell a strand prefix from a real title's colon - that is why
	// fetchMovieFromTMDb only calls it after a search has already come back empty
	it('would also split a genuine title, hence retry-only use', () => {
		expect(stripStrandPrefix('Wicked: For Good')).toBe('For Good');
	});
});

describe('filterByExactTitle', () => {
	const movie = (title, original_title = title) => ({ title, original_title });

	it('rejects a longer film that merely contains the query', () => {
		// TMDb's first result for "Resurrection" is "Alien Resurrection"
		const results = [movie('Alien Resurrection', 'Alien: Resurrection')];
		expect(filterByExactTitle('Resurrection', results)).toEqual([]);
	});

	it('finds the exact match further down the results', () => {
		const results = [
			movie('Alien Resurrection', 'Alien: Resurrection'),
			movie('Resurrection'),
		];
		expect(filterByExactTitle('Resurrection', results)).toHaveLength(1);
		expect(filterByExactTitle('Resurrection', results)[0].title).toBe('Resurrection');
	});

	it('matches on the English title of a foreign film', () => {
		const results = [movie('Snake in the Monkey\'s Shadow', '\u7334\u5F62\u6263\u624B')];
		expect(filterByExactTitle('Snake in the Monkey\'s Shadow', results)).toHaveLength(1);
	});

	it('matches on the original title when the listing uses it', () => {
		const results = [movie('Diamonds', 'Diamanti')];
		expect(filterByExactTitle('Diamanti', results)).toHaveLength(1);
	});

	it('ignores accents and punctuation', () => {
		expect(filterByExactTitle('Sirat', [movie('Sir\u0101t')])).toHaveLength(1);
		expect(filterByExactTitle('Cosi Fan Tutte', [movie('Cos\u00EC fan tutte')])).toHaveLength(1);
	});

	it('treats "&" and "and" as the same word', () => {
		expect(filterByExactTitle('Sid & Nancy', [movie('Sid and Nancy')])).toHaveLength(1);
	});

	it('returns every same-name candidate so the caller still chooses', () => {
		const results = [movie('Pressure'), movie('Pressure'), movie('Under Pressure')];
		expect(filterByExactTitle('Pressure', results)).toHaveLength(2);
	});

	it('handles missing input', () => {
		expect(filterByExactTitle('', [movie('Pressure')])).toEqual([]);
		expect(filterByExactTitle('Pressure', null)).toEqual([]);
		expect(filterByExactTitle('Pressure', [null, undefined])).toEqual([]);
	});
});

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
			available_cinemas: ['029', '042'],
			ID: '1',
		},
		{
			Title: 'The Matrix PG',
			available_cinemas: ['029'],
			ID: '2',
		},
		{
			Title: 'Inception',
			available_cinemas: ['042'],
			ID: '3',
		},
		{
			Title: 'Interstellar',
			available_cinemas: ['029'],
			ID: '4',
		},
		{
			Title: 'Dawn of Impressionism - Paris 1874',
			available_cinemas: ['029'],
			ID: '5',
		},
	];

	it('should filter movies by cinema ID', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '029');
		const titles = result.map(m => m.Title);
		expect(titles).toContain('The Matrix');
		expect(titles).toContain('Interstellar');
		expect(titles).not.toContain('Inception'); // Not in cinema 029
	});

	it('should keep different screenings even if sanitized titles match', () => {
		// Different original titles are kept (e.g., "The Matrix (1999)" vs "The Matrix PG")
		// This ensures special screenings like "The Shining (45th Anniversary)"
		// and "The Shining - Original Cut" are both shown
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '029');
		const matrixMovies = result.filter(m => m.Title === 'The Matrix');
		expect(matrixMovies).toHaveLength(2); // Both Matrix screenings should be kept
	});

	it('should remove true duplicates with same original title', () => {
		const moviesWithDupes = [
			{ Title: 'The Matrix (1999)', available_cinemas: ['029'], ID: '1' },
			{ Title: 'The Matrix (1999)', available_cinemas: ['029'], ID: '2' }, // Same original title
		];
		const result = filterMoviesByCinemaAndRemoveDuplicates(moviesWithDupes, '029');
		expect(result).toHaveLength(1); // True duplicate removed
	});

	it('should exclude movies in exclusion list', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '029');
		const titles = result.map(m => m.Title);
		expect(titles).not.toContain('Dawn of Impressionism - Paris 1874');
	});

	it('should not mutate original movie objects', () => {
		const originalTitle = mockMovies[0].Title;
		filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '029');
		expect(mockMovies[0].Title).toBe(originalTitle); // Original should be unchanged
	});

	it('should return new objects with sanitized titles', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '029');
		const movie = result.find(m => m.ID === '1');
		expect(movie.Title).toBe('The Matrix');
		expect(movie._originalTitle).toBe('The Matrix (1999)');
	});

	it('should handle empty array', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates([], '029');
		expect(result).toEqual([]);
	});

	it('should handle movies with no matching cinema', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, '999');
		expect(result).toEqual([]);
	});

	it('should filter by multiple cinema IDs (array)', () => {
		const result = filterMoviesByCinemaAndRemoveDuplicates(mockMovies, ['029', '042']);
		const titles = result.map(m => m.Title);
		expect(titles).toContain('The Matrix');
		expect(titles).toContain('Interstellar');
		expect(titles).toContain('Inception'); // Now included because it's in cinema 042
	});

	it('should include movie if available at ANY target cinema', () => {
		const moviesWithExclusive = [
			{ Title: 'Cinema A Only', available_cinemas: ['001'], ID: '1' },
			{ Title: 'Cinema B Only', available_cinemas: ['002'], ID: '2' },
			{ Title: 'Both Cinemas', available_cinemas: ['001', '002'], ID: '3' },
			{ Title: 'Neither Cinema', available_cinemas: ['999'], ID: '4' },
		];
		const result = filterMoviesByCinemaAndRemoveDuplicates(moviesWithExclusive, ['001', '002']);
		const titles = result.map(m => m.Title);
		expect(titles).toContain('Cinema A Only');
		expect(titles).toContain('Cinema B Only');
		expect(titles).toContain('Both Cinemas');
		expect(titles).not.toContain('Neither Cinema');
	});
});
