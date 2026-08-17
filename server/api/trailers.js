/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import pLimit from 'p-limit';
import { fetchChannelUploads, hasApiKey } from './youtubeApi';
import {
	getTrailersOnly,
	sortByDate,
	deduplicateTrailers,
} from './filterTrailers';
import { STUDIO_CHANNELS } from '../utils/channels';
import { PERFORMANCE_CONFIG, TRAILER_CONFIG } from '../utils/constants';

// Limit concurrent YouTube calls so a 54-channel fan-out stays polite
const limit = pLimit(PERFORMANCE_CONFIG.MAX_CONCURRENT_YOUTUBE_REQUESTS);

export default defineEventHandler(async (_event) => {
	const startTime = Date.now();

	// No key configured: return an empty feed rather than failing the build.
	// The trailers page renders its own "not configured" state.
	if (!hasApiKey()) {
		console.warn('⚠️  [Trailers] YT_API_KEY is not set - returning empty feed');
		return [];
	}

	console.log(`🎬 [Trailers] Fetching from ${STUDIO_CHANNELS.length} studio channels...`);

	// Fetch every channel in parallel; a failed channel yields null, not a throw
	const responses = await Promise.all(
		STUDIO_CHANNELS.map(channel =>
			limit(async () => ({
				channel,
				data: await fetchChannelUploads(channel.channelID, channel.name),
			})),
		),
	);

	const succeeded = responses.filter(result => result.data);
	const failed = responses.length - succeeded.length;

	if (failed > 0) {
		console.warn(`⚠️  [Trailers] ${failed}/${responses.length} channels returned no data`);
	}

	// Filter each channel's uploads down to trailers inside the date window
	const allTrailers = succeeded.flatMap(({ channel, data }) =>
		getTrailersOnly(data, channel.name, TRAILER_CONFIG.DAYS_RANGE),
	);

	// Sort before dedupe: the survivor of a duplicate pair should be the newest
	const sorted = sortByDate(allTrailers);
	const deduplicated = deduplicateTrailers(sorted);

	const duration = Date.now() - startTime;
	console.log(
		`✓ [Trailers] ${deduplicated.length} trailers from ${succeeded.length} channels `
		+ `(${allTrailers.length - deduplicated.length} duplicates merged) in ${duration}ms`,
	);

	return deduplicated;
});
