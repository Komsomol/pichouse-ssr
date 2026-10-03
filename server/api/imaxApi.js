// server/api/imaxApi.js
//
// BFI IMAX listings, via Clusterflick.
//
// whatson.bfi.org.uk is behind a Cloudflare challenge that blocks datacenter
// requests, so the build cannot read BFI directly - and must not try to get
// round the challenge. Clusterflick scrapes it daily and publishes the result
// as a GitHub release asset (CC BY 4.0), which is plain JSON with no challenge.

import axios from 'axios';
import { imaxCache } from '../utils/cache.js';
import { IMAX_CONFIG } from '../utils/constants.js';

const CACHE_KEY = 'imax:listings';

// The request still running, if any. The IMAX and What's on pages prerender at
// the same time; this lets the second join the first's download.
let inFlight = null;

/**
 * Downloads Clusterflick's BFI IMAX asset.
 * @returns {Promise<Array>} Films, or [] on failure
 */
const requestListings = async () => {
	try {
		const { data } = await axios.get(IMAX_CONFIG.SOURCE_URL, {
			timeout: IMAX_CONFIG.REQUEST_TIMEOUT,
			// The release asset is served as application/octet-stream
			responseType: 'json',
		});

		const films = Array.isArray(data) ? data : [];

		// Only cache a usable result, so a transient failure is retried
		if (films.length > 0) {
			imaxCache.set(CACHE_KEY, films);
		}

		return films;
	}
	catch (error) {
		console.error(
			'Error fetching BFI IMAX listings:',
			error.response?.status || error.message,
		);
		return [];
	}
};

/**
 * Fetches Clusterflick's BFI IMAX films.
 *
 * A failure returns an empty list rather than throwing: the page renders its
 * own empty state and the rest of the build carries on.
 *
 * @returns {Promise<Array>} Clusterflick films for bfi.org.uk-imax
 */
export const fetchImaxListings = async () => {
	const cached = imaxCache.get(CACHE_KEY);
	if (cached) return cached;

	// Join a download already running rather than starting a second one
	if (!inFlight) {
		inFlight = requestListings().finally(() => {
			inFlight = null;
		});
	}

	return inFlight;
};
