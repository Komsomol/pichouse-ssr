/**
 * Helper utility functions for movie data processing
 */

/**
 * Creates a fallback video object from a YouTube trailer URL
 * @param {string} trailerUrl - YouTube URL
 * @returns {Array} Array with single video object or empty array
 */
export const createFallbackVideos = (trailerUrl) => {
	if (!trailerUrl) return [];

	const videoId = trailerUrl.split('v=')[1];
	if (!videoId) return [];

	return [
		{
			key: videoId,
			name: 'Official Trailer',
			site: 'YouTube',
		},
	];
};

/**
 * Checks if a showtime meets time requirements
 * - Weekends (Sat/Sun): All times allowed
 * - Weekdays (Mon-Fri): Must be after minimum hour
 * @param {string} showtimeString - ISO datetime string
 * @param {number} minHour - Minimum hour for weekdays (24-hour format)
 * @returns {boolean} True if showtime meets requirements
 */
export const meetsTimeRequirement = (showtimeString, minHour) => {
	const showtimeDate = new Date(showtimeString);
	const dayOfWeek = showtimeDate.getDay();
	const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

	// Weekends: all times allowed
	if (isWeekend) return true;

	// Weekdays: must be after minimum hour
	return showtimeDate.getHours() >= minHour;
};

/**
 * Generates a booking URL for a cinema showtime
 * @param {string} cinemaId - Cinema identifier
 * @param {string} sessionId - Session identifier
 * @param {string} template - URL template
 * @returns {string} Complete booking URL
 */
export const generateBookingUrl = (cinemaId, sessionId, template) =>
	template
		.replace('{cinemaId}', cinemaId)
		.replace('{sessionId}', sessionId);

/**
 * Reduces a title to a comparison key: lowercase words separated by single
 * spaces, with accents folded, "&" spelled out and punctuation dropped.
 *
 * Shared by the two places that compare titles coming from different sources -
 * checking a TMDb result against a listing, and collapsing the same trailer
 * posted by two studios. Both need "Sid & Nancy" to meet "Sid and Nancy" and
 * "Sirāt" to meet "Sirat"; keeping one copy stops the two drifting apart.
 *
 * Callers that need domain-specific removals (studio credits, quality tags) do
 * those first and pass the result through here.
 *
 * @param {string} title - Any title
 * @returns {string} Comparison key
 */
export const normalizeTitleKey = title =>
	String(title || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036F]/g, '') // combining marks
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
