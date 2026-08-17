// server/api/youtubeApi.js
//
// YouTube Data API v3 access for the studio trailers feed.
// Ported from the Movie-Trailers project (services/youtubeApi.js), trimmed to
// the one call this site needs and rewritten to match the axios-based style of
// the other API modules here.

import axios from 'axios';
import { youtubeCache } from '../utils/cache.js';
import { TRAILER_CONFIG } from '../utils/constants.js';

const YT_API_KEY = process.env.YT_API_KEY;
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT = 10000;

/**
 * Derives a channel's uploads playlist ID from its channel ID.
 *
 * Every YouTube channel's uploads playlist is its channel ID with the "UC"
 * prefix swapped for "UU". The source project spent a `channels` API call per
 * studio to look this up; deriving it halves the requests per build.
 *
 * @param {string} channelID - Channel ID starting with "UC"
 * @returns {string|null} Uploads playlist ID, or null if the ID is malformed
 */
export const toUploadsPlaylistId = channelID =>
	typeof channelID === 'string' && channelID.startsWith('UC')
		? `UU${channelID.slice(2)}`
		: null;

/**
 * Whether a YouTube API key is configured.
 * The trailers feed degrades to empty rather than failing the build without it.
 * @returns {boolean} True when YT_API_KEY is set
 */
export const hasApiKey = () => Boolean(YT_API_KEY);

/**
 * Fetches the most recent uploads for a single studio channel.
 *
 * @param {string} channelID - YouTube channel ID
 * @param {string} channelName - Studio name (used for logging and cache key)
 * @returns {Promise<object|null>} playlistItems response, or null on failure
 */
export const fetchChannelUploads = async (channelID, channelName) => {
	const playlistId = toUploadsPlaylistId(channelID);
	if (!playlistId) {
		return null;
	}

	const cacheKey = `youtube:uploads:${playlistId}`;
	const cached = youtubeCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/playlistItems`, {
			params: {
				key: YT_API_KEY,
				part: 'snippet',
				playlistId,
				maxResults: TRAILER_CONFIG.MAX_RESULTS,
			},
			timeout: REQUEST_TIMEOUT,
		});

		if (!response.data?.items) {
			return null;
		}

		youtubeCache.set(cacheKey, response.data);
		return response.data;
	}
	catch (error) {
		// One studio failing must not take down the whole feed
		console.error(
			`Error fetching YouTube uploads for ${channelName}:`,
			error.response?.data?.error?.message || error.message,
		);
		return null;
	}
};
