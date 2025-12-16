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
