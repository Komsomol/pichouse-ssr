/**
 * Movie filtering and sanitization utilities
 */

/**
 * Cleans movie title for API searches (TMDb, OMDB)
 * Removes Picturehouse-specific screening indicators that won't match in movie databases
 * @param {string} title - The original movie title
 * @returns {string} Cleaned title for API search
 */
export const cleanTitleForSearch = (title) => {
	if (!title) return '';

	let cleaned = title;

	// UK to US title mappings (UK cinemas use different names than TMDb/OMDB)
	const regionalTitleMappings = {
		'Zootropolis': 'Zootopia',
		'Paddington in Peru': 'Paddington in Peru', // Same, but kept for reference
	};

	// Apply regional title mappings
	Object.entries(regionalTitleMappings).forEach(([ukTitle, usTitle]) => {
		const regex = new RegExp(ukTitle, 'gi');
		cleaned = cleaned.replace(regex, usTitle);
	});

	// Remove format/screening indicators (order matters - specific patterns first)
	const patternsToRemove = [
		// Format indicators
		/\s*-\s*35\s*mm$/i,
		/\s*-\s*70\s*mm$/i,
		/\s*\(35\s*mm\)$/i,
		/\s*\(70\s*mm\)$/i,
		/\s*-\s*IMAX$/i,
		/\s*\(IMAX\)$/i,
		/\s*-\s*4K$/i,
		/\s*\(4K\)$/i,
		/\s*\(4K Restoration\)$/i,
		/\s*-\s*Digital$/i,

		// Anniversary/special editions
		/\s*\(\d+th Anniversary\)/i,
		/\s*\(\d+st Anniversary\)/i,
		/\s*\(\d+nd Anniversary\)/i,
		/\s*\(\d+rd Anniversary\)/i,
		/\s*\(Anniversary\)/i,
		/\s*\(Rerelease\)/i,
		/\s*\(Re-release\)/i,
		/\s*\(Restored\)/i,
		/\s*\(Director's Cut\)/i,
		/\s*-\s*Director's Cut$/i,
		/\s*\(Extended Edition\)/i,
		/\s*\(Special Edition\)/i,
		/\s*\(Original Cut\)/i,
		/\s*-\s*Original Cut$/i,

		// Screening types
		/\s*-\s*Preview$/i,
		/\s*\(Preview\)$/i,
		/^Preview Screening:\s*/i,
		/^Relaxed Screening:\s*/i,
		/^FILM CLUB:\s*/i,
		/^NT Live:\s*/i,
		/^EXHIBITION ON SCREEN:\s*/i,

		// Event add-ons
		/\s*\+\s*Q&A$/i,
		/\s*\+\s*Live Intro.*$/i,
		/\s*\+\s*Mulled Wine.*$/i,
		/\s*\+\s*Prosecco.*$/i,
		/\s*\+\s*PJ Party$/i,

		// Year in parentheses (keep for context but try without if no match)
		// /\s*\(\d{4}\)$/,
	];

	patternsToRemove.forEach((pattern) => {
		cleaned = cleaned.replace(pattern, '').trim();
	});

	// Remove any remaining content in parentheses at the end (ratings, etc.)
	cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '').trim();

	// Remove trailing hyphens or colons left over
	cleaned = cleaned.replace(/\s*[-:]\s*$/, '').trim();

	return cleaned || title; // Fall back to original if cleaning empties it
};

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
 * Filters movies by cinema(s), removes duplicates, and skips excluded titles
 * PURE FUNCTION: No side effects, returns new objects instead of mutating
 * @param {Array} movies - Array of movie objects
 * @param {string|string[]} cinemaIds - Cinema identifier(s) to filter by (single ID or array)
 * @returns {Array} Filtered and deduplicated movie array
 */
export const filterMoviesByCinemaAndRemoveDuplicates = (movies, cinemaIds) => {
	const uniqueTitles = new Set();
	const titleExclusionList = ['Dawn of Impressionism - Paris 1874'];

	// Normalize to array for consistent handling
	const targetCinemas = Array.isArray(cinemaIds) ? cinemaIds : [cinemaIds];

	return (
		movies
			// Step 1: Filter by cinema(s) and excluded titles
			.filter((movie) => {
				// Skip excluded movies
				if (
					titleExclusionList.some(excluded =>
						movie.Title.includes(excluded),
					)
				) {
					return false;
				}
				// Filter by cinema - include if available at ANY target cinema
				return movie.available_cinemas.some(cinema =>
					targetCinemas.includes(cinema),
				);
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
			// Use ORIGINAL title for deduplication to keep different screenings
			// (e.g., "The Shining - Original Cut" vs "The Shining (45th Anniversary)")
			.filter((movie) => {
				// Filter out if the sanitized title is null or already processed
				if (!movie.Title || uniqueTitles.has(movie._originalTitle)) {
					return false;
				}
				uniqueTitles.add(movie._originalTitle);
				return true;
			})
	);
};
