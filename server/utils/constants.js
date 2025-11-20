/**
 * Application-wide constants and configuration
 */

// Cinema configuration
export const CINEMA_IDS = {
	FINSBURY_PARK: '001',
	PICTUREHOUSE_CENTRAL: '021',
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
};
