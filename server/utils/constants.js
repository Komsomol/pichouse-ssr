/**
 * Application-wide constants and configuration
 */

// Cinema configuration
// Cinema IDs verified from picturehouses.com booking URLs
// Format: https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats
export const CINEMA_IDS = {
	FINSBURY_PARK: '029',
	PICTUREHOUSE_CENTRAL: '022',
};

export const CINEMA_NAMES = {
	[CINEMA_IDS.FINSBURY_PARK]: 'Finsbury Park',
	[CINEMA_IDS.PICTUREHOUSE_CENTRAL]: 'Picturehouse Central',
};

// Target cinemas for Screen 1 filtering
export const TARGET_CINEMA_IDS = [
	CINEMA_IDS.FINSBURY_PARK,
	CINEMA_IDS.PICTUREHOUSE_CENTRAL,
];

// Screening configuration
export const SCREENING_CONFIG = {
	SCREEN_NAME: 'Screen 1',
	MIN_HOUR: 18, // 6 PM
	BOOKING_URL_TEMPLATE: 'https://web.picturehouses.com/order/showtimes/{cinemaId}-{sessionId}/seats',
};

// Performance configuration
export const PERFORMANCE_CONFIG = {
	MAX_CONCURRENT_TMDB_REQUESTS: 5,
	MAX_CONCURRENT_YOUTUBE_REQUESTS: 8,
};

// Studio trailers configuration (ported from the Movie-Trailers project)
export const TRAILER_CONFIG = {
	// A title must contain one of these to count as a trailer
	SEARCH_KEYWORDS: ['official trailer', 'final trailer'],
	// ...and none of these, which mark content we don't want
	EXCLUDED_KEYWORDS: [
		'blu-ray',
		'season',
		'episode',
		'marvel comics',
		'teaser trailer',
		'teaser',
		'red band',
		// Streaming series posted by channels we keep for their theatrical output
		'disney+',
		'marvel television',
	],
	DAYS_RANGE: 30, // Lookback window
	// Studios re-upload back-catalogue trailers, which pass the date window
	// because the *upload* is recent. Reject a parenthesised release year older
	// than this many years back, so "(1989)" goes and "(2026)" stays.
	MAX_RELEASE_YEAR_AGE: 1,
	PER_PAGE: 20, // Trailers per page in the UI
	MAX_RESULTS: 50, // Videos requested per channel (YouTube API max)
};
