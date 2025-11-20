/**
 * Movie filtering and sanitization utilities
 */

/**
 * Removes unwanted strings and patterns from movie titles
 * @param {string} title - The original movie title
 * @returns {string|null} Sanitized title or null if invalid
 */
export const sanitizeMovieTitle = (title) => {
	const stringsToRemove = [
		' - Original Cut',
		'\\+ Q&A',
		'Family Special:',
		'(Rerelease)',
		'(Paddington Day)',
		'FILM CLUB:',
		'Doc\'n Roll Film Festival Presents:',
		'Atomic Origins:',
		'(4K Restoration)',
		'(40th Anniversary)',
		'(Anniversary)',
		'EXHIBITION ON SCREEN:',
		'NT Live:',
		'\\: The Wrong Trousers + A Matter of Loaf and Death',
		'Relaxed Screening:',
		'Aardman Double Bill: The Wrong Trousers + A Matter of Loaf and Death',
		'\\+ Live Intro and Q&A', // Escaped the '+' character
		'Re-release', // Remove "Re-release"
		// Special event screenings
		'\\+ Mulled Wine & Festive Cakes',
		'\\+ Mulled Wine & Festive Cake',
		'\\+ Prosecco & Popcorn',
		'\\+ PJ Party',
		'- Preview',
		'Preview Screening:',
	];

	// Regex patterns to match unwanted strings like movie ratings, parentheses, etc.
	const regexPatternsToRemove = [
		/\(\d+\)/g, // Matches strings like (1984)
		/\(.*?\)/g, // Matches any content inside parentheses like (PG) (U)
		/\s+[A-Z]{1,2}$/, // Matches ratings at the end like (PG) (U)
	];

	// Remove exact unwanted substrings
	let sanitizedTitle = title;

	stringsToRemove.forEach((str) => {
		sanitizedTitle = sanitizedTitle
			.replace(new RegExp(str, 'gi'), '')
			.trim();
	});

	// Remove unwanted patterns (like parentheses and ratings)
	regexPatternsToRemove.forEach((regex) => {
		sanitizedTitle = sanitizedTitle.replace(regex, '').trim();
	});

	// Return null if the sanitized title is empty or invalid after removing unwanted content
	if (!sanitizedTitle || sanitizedTitle === '') {
		return null;
	}

	return sanitizedTitle;
};

/**
 * Filters movies by cinema, removes duplicates, and skips excluded titles
 * PURE FUNCTION: No side effects, returns new objects instead of mutating
 * @param {Array} movies - Array of movie objects
 * @param {string} cinemaId - Cinema identifier to filter by
 * @returns {Array} Filtered and deduplicated movie array
 */
export const filterMoviesByCinemaAndRemoveDuplicates = (movies, cinemaId) => {
	const uniqueTitles = new Set();
	const titleExclusionList = ['Dawn of Impressionism - Paris 1874'];

	return movies
		// Step 1: Filter by cinema and excluded titles
		.filter((movie) => {
			// Skip excluded movies
			if (titleExclusionList.some(excluded => movie.Title.includes(excluded))) {
				return false;
			}
			// Filter by cinema
			return movie.available_cinemas.includes(cinemaId);
		})
		// Step 2: Sanitize titles and create new objects (immutable transformation)
		.map((movie) => {
			const sanitizedTitle = sanitizeMovieTitle(movie.Title);
			return {
				...movie,
				Title: sanitizedTitle || movie.Title, // Use sanitized or original
				_originalTitle: movie.Title, // Keep original for reference
			};
		})
		// Step 3: Filter out invalid titles and duplicates
		.filter((movie) => {
			// Filter out if the sanitized title is null or already processed
			if (!movie.Title || uniqueTitles.has(movie.Title)) {
				return false;
			}
			uniqueTitles.add(movie.Title);
			return true;
		});
};
