/**
 * Movie filtering and sanitization utilities
 */

import { normalizeTitleKey } from '../utils/helpers.js';

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

		// Event add-ons. Picturehouse writes what comes with the screening after
		// a "+", so everything from there on is not part of the film's name:
		// "Pressure + Q&A", "Pressure + Live Broadcast Q&A", "Paddington + PJ
		// Party". Enumerating the add-ons missed each new wording, so the whole
		// trailing clause goes. A title that is only a "+" clause survives via
		// the empty-result fallback at the end of this function.
		/\s*\+.*$/s,

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
 * Strips a season or strand prefix, leaving the film's own name.
 *
 * Picturehouse files a screening under the season running it: "Out at Clapham:
 * Beautiful Thing", "Green Screen: Burning Skies", "American Library presents
 * Pressure". The prefix is not part of the film's name and TMDb finds nothing
 * with it attached.
 *
 * There is no syntactic difference between a strand prefix and a real title's
 * colon - "Green Screen: Burning Skies" and "Wicked: For Good" are the same
 * shape - so this must not be applied blindly. It is a *retry*: the caller
 * searches the full title first and only falls back to this when TMDb returns
 * nothing, which a genuine title never does.
 *
 * Splitting on the FIRST colon keeps a nested title intact: "CFS: Pompei:
 * Below the Clouds" leaves "Pompei: Below the Clouds".
 *
 * @param {string} title - Cleaned title
 * @returns {string} The name without its prefix, or '' if there is no prefix
 */
export const stripStrandPrefix = (title) => {
	const text = String(title || '').trim();

	// A leading colon segment: "Kung Fu Cinema: Snake in the Monkey's Shadow"
	const colonIndex = text.indexOf(':');
	if (colonIndex > 0) {
		return text.slice(colonIndex + 1).trim();
	}

	// No colon, but a presenter still names itself: "LMF presents Ish"
	const presents = text.match(/\bpresents?\b\s*/i);
	if (presents && presents.index > 0) {
		return text.slice(presents.index + presents[0].length).trim();
	}

	return '';
};

/**
 * Keeps only the TMDb results that are actually called `query`.
 *
 * TMDb's search is fuzzy and its first result is often a longer film that
 * merely contains the words: searching "Resurrection" leads with "Alien
 * Resurrection". Taking that blindly puts the wrong poster and trailer on a
 * screening, so a title recovered by stripping a strand prefix is only accepted
 * when a result carries that exact name.
 *
 * Both names are compared. A foreign film is listed under its English `title`
 * and its native `original_title`, and a UK listing may use either - "Snake in
 * the Monkey's Shadow" is the English title of "猴形扣手", while "Diamanti" is
 * the original of "Diamonds".
 *
 * Every match is returned rather than just the first, so the caller's existing
 * choice between them (latest release, or first) still applies - several films
 * genuinely share a name.
 *
 * @param {string} query - Title searched for
 * @param {Array} movies - TMDb search results
 * @returns {Array} Results whose title or original_title equals the query
 */
export const filterByExactTitle = (query, movies) => {
	const key = normalizeTitleKey(query);

	if (!key || !Array.isArray(movies)) return [];

	return movies.filter(
		movie =>
			normalizeTitleKey(movie?.title) === key
			|| normalizeTitleKey(movie?.original_title) === key,
	);
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
