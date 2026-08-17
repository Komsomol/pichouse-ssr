/**
 * Trailer filtering, sorting and deduplication.
 *
 * Ported from the Movie-Trailers project (filterTrailers.js + the dedup half of
 * getContent.js). The logic is unchanged; date-fns has been swapped for native
 * Date/Intl so no new dependency is needed.
 *
 * PURE FUNCTIONS: no side effects, no network, no reliance on module state.
 */

import { TRAILER_CONFIG } from '../utils/constants';

/**
 * Checks if a video title matches the search criteria.
 * @param {string} title - Lowercase video title
 * @returns {boolean} True if the title contains a search keyword
 */
const matchesSearchKeywords = title =>
	TRAILER_CONFIG.SEARCH_KEYWORDS.some(keyword => title.includes(keyword));

/**
 * Checks if a video title contains any excluded keyword (teaser, blu-ray, etc).
 * @param {string} title - Lowercase video title
 * @returns {boolean} True if the title should be rejected
 */
const containsExcludedKeyword = title =>
	TRAILER_CONFIG.EXCLUDED_KEYWORDS.some(keyword => title.includes(keyword));

/**
 * Formats a date for display, e.g. "Friday, 15 August 2026".
 * Fixed to UTC so the output does not shift with the build machine's timezone.
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatTrailerDate = date =>
	new Intl.DateTimeFormat('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date);

/**
 * Transforms a YouTube playlist item into a trailer object.
 * @param {object} item - YouTube playlistItems entry
 * @param {string} channelName - Name of the source studio channel
 * @param {Date} videoDate - Parsed publish date
 * @returns {object} Trailer object
 */
const createTrailerObject = (item, channelName, videoDate) => ({
	channel: channelName,
	name: item.snippet.title,
	date: formatTrailerDate(videoDate),
	dateString: videoDate.toISOString(),
	link: item.snippet.resourceId?.videoId || '',
	thumbnail:
		item.snippet.thumbnails?.high?.url
		|| item.snippet.thumbnails?.default?.url
		|| '',
});

/**
 * Filters a channel's videos down to official trailers inside the date window.
 *
 * @param {object} response - YouTube API response with an items array
 * @param {string} channelName - Studio channel name (also used in the output)
 * @param {number} [daysRange] - Lookback window in days
 * @returns {Array} Array of trailer objects (empty on invalid input)
 */
export const getTrailersOnly = (
	response,
	channelName,
	daysRange = TRAILER_CONFIG.DAYS_RANGE,
) => {
	if (!response?.items || !Array.isArray(response.items) || !channelName) {
		return [];
	}

	// Calculate the window once rather than per video
	const now = Date.now();
	const cutoff = now - daysRange * 24 * 60 * 60 * 1000;

	return response.items.reduce((trailers, item) => {
		if (!item?.snippet?.title || !item.snippet.publishedAt) {
			return trailers;
		}

		const title = item.snippet.title.toLowerCase();

		// Early exits: must match a search keyword and no excluded keyword
		if (!matchesSearchKeywords(title) || containsExcludedKeyword(title)) {
			return trailers;
		}

		const videoDate = new Date(item.snippet.publishedAt);
		const timestamp = videoDate.getTime();

		if (Number.isNaN(timestamp) || timestamp < cutoff || timestamp > now) {
			return trailers;
		}

		trailers.push(createTrailerObject(item, channelName, videoDate));
		return trailers;
	}, []);
};

/**
 * Normalizes a trailer title into a comparison key.
 *
 * Co-released films are uploaded by more than one studio channel (e.g. Marvel
 * and Sony both post the Spider-Man trailer). The wording is the same but the
 * punctuation varies between uploads - smart quotes, en-dashes, separators and
 * quality tags like "4K". This strips that noise so the two collapse to one key.
 *
 * It also drops the trailing release clause, which is how studios label the
 * regional cuts of one trailer ("In Theaters December 18" vs "In Cinemas Dec
 * 18"). Any sequel marker sits before that clause, so "Official Trailer 2"
 * stays distinct from "Official Trailer" - digits are otherwise preserved.
 *
 * @param {string} title - Raw video title
 * @returns {string} Normalized comparison key
 */
export const normalizeTitle = title =>
	String(title || '')
		.toLowerCase()
		.replace(/[‘’]/g, '\'') // curly apostrophes -> straight
		.replace(/[–—]/g, '-') // en/em dash -> hyphen
		.replace(/\b(?:4k|uhd|hd|60fps|dolby vision)\b/g, '') // quality tags
		.replace(/[^a-z0-9]+/g, ' ') // remaining punctuation -> space
		.replace(/\b(?:only )?in (?:theaters|theatres|cinemas)\b.*$/, '') // release clause
		.trim();

/**
 * Sorts trailers by publish date, newest first.
 * @param {Array} trailers - Trailer objects
 * @returns {Array} New sorted array
 */
export const sortByDate = trailers =>
	[...trailers].sort(
		(a, b) => new Date(b.dateString) - new Date(a.dateString),
	);

/**
 * Removes duplicate trailers, matching on the normalized title across ALL
 * channels. Keeps the first occurrence (newest, since the array is pre-sorted).
 *
 * When a duplicate comes from a *different* studio, that studio is recorded on
 * the surviving trailer as `alsoFrom` - the release genuinely belongs to both,
 * so it must still appear under either studio's filter.
 *
 * @param {Array} trailers - Sorted trailer objects
 * @returns {Array} Deduplicated trailers, each with an `alsoFrom` array
 */
export const deduplicateTrailers = (trailers) => {
	const byKey = new Map();

	trailers.forEach((trailer) => {
		// Fall back to the video ID if a title normalizes to nothing
		const key = normalizeTitle(trailer.name) || trailer.link;
		const existing = byKey.get(key);

		if (!existing) {
			byKey.set(key, { ...trailer, alsoFrom: [] });
			return;
		}

		if (
			trailer.channel !== existing.channel
			&& !existing.alsoFrom.includes(trailer.channel)
		) {
			existing.alsoFrom.push(trailer.channel);
		}
	});

	return [...byKey.values()];
};
