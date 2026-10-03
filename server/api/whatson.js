/* eslint-disable no-console */
// Performance logging is intentional for server-side debugging

import { buildWhatsOn, fromImax, fromMovies } from './filterWhatsOn';

/**
 * "What's on", built from the Movies and IMAX endpoints rather than
 * re-fetching their sources. In a build both run in the same process, so the
 * Picturehouse, TMDb and Clusterflick caches mean this adds no upstream calls.
 */
export default defineEventHandler(async (_event) => {
	const startTime = Date.now();

	// One source failing still leaves the other's films on the page
	const [movies, imax] = await Promise.all([
		$fetch('/api/movies').catch((error) => {
			console.error('✗ [What\'s on] Movies unavailable:', error.message);
			return [];
		}),
		$fetch('/api/imax').catch((error) => {
			console.error('✗ [What\'s on] IMAX unavailable:', error.message);
			return { films: [] };
		}),
	]);

	const result = buildWhatsOn([...fromMovies(movies), ...fromImax(imax?.films)]);

	console.log(
		`🎬 [What's on] ${result.now.length} playing now, ${result.soon.length} `
		+ `coming soon in ${Date.now() - startTime}ms`,
	);

	return result;
});
