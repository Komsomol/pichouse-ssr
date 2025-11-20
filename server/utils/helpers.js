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
 * Checks if a showtime is after the minimum hour
 * @param {string} showtimeString - ISO datetime string
 * @param {number} minHour - Minimum hour (24-hour format)
 * @returns {boolean} True if showtime is after or equal to the minimum hour
 */
export const isAfterMinHour = (showtimeString, minHour) => {
	const showtimeDate = new Date(showtimeString);
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
