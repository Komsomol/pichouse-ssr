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

/**
 * Fetches Clusterflick's BFI IMAX films.
 *
 * A failure returns an empty list rather than throwing: the page renders its
 * own empty state and the rest of the build carries on.
 *
 * @returns {Promise<Array>} Clusterflick films for bfi.org.uk-imax
 */
export const fetchImaxListings = async () => {
	const cacheKey = 'imax:listings';
	const cached = imaxCache.get(cacheKey);
	if (cached) return cached;

	try {
		const { data } = await axios.get(IMAX_CONFIG.SOURCE_URL, {
			timeout: IMAX_CONFIG.REQUEST_TIMEOUT,
			// The release asset is served as application/octet-stream
			responseType: 'json',
		});

		const films = Array.isArray(data) ? data : [];

		// Only cache a usable result, so a transient failure is retried
		if (films.length > 0) {
			imaxCache.set(cacheKey, films);
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
