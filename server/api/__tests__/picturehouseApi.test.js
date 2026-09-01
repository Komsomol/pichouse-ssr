import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchMoviesFromPicturehouse } from '../picturehouseApi.js';
import { picturehouseCache } from '../../utils/cache.js';
import { PICTUREHOUSE_CONFIG } from '../../utils/constants.js';

vi.mock('axios', () => ({
	default: { post: vi.fn() },
}));

// A 5xx that arrives after a long wait is what Picturehouse's gateway returns
// when it gives up on the 3.5MB feed, so that is the shape worth simulating.
const gatewayError = status => Object.assign(new Error(`Request failed with status code ${status}`), {
	response: { status },
});

const timeoutError = () => Object.assign(new Error('timeout of 30000ms exceeded'), {
	code: 'ECONNABORTED',
});

const okResponse = { data: { movies: [{ Title: 'The Odyssey' }] } };

describe('fetchMoviesFromPicturehouse', () => {
	beforeEach(() => {
		picturehouseCache.clear();
		vi.mocked(axios.post).mockReset();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		// Fake timers so the backoff waits cost no wall-clock time; without them
		// the three-attempt case alone sleeps 6s and blows the default timeout.
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// Drains every pending backoff, then settles. The rejection handler is
	// attached before the timers advance, otherwise a failing fetch rejects
	// while nothing is listening and Vitest reports an unhandled error.
	const runWithTimers = async (promise) => {
		const settled = promise.then(
			value => () => value,
			error => () => { throw error; },
		);
		await vi.runAllTimersAsync();
		return (await settled)();
	};

	it('sends a bounded timeout so a hung request cannot stall the build', async () => {
		vi.mocked(axios.post).mockResolvedValue(okResponse);

		await runWithTimers(fetchMoviesFromPicturehouse('029'));

		expect(axios.post).toHaveBeenCalledWith(
			expect.any(String),
			expect.anything(),
			expect.objectContaining({ timeout: PICTUREHOUSE_CONFIG.REQUEST_TIMEOUT }),
		);
	});

	it('retries a gateway error and returns the movies once it succeeds', async () => {
		vi.mocked(axios.post)
			.mockRejectedValueOnce(gatewayError(504))
			.mockRejectedValueOnce(gatewayError(502))
			.mockResolvedValueOnce(okResponse);

		const movies = await runWithTimers(fetchMoviesFromPicturehouse('029'));

		expect(movies).toEqual(okResponse.data.movies);
		expect(axios.post).toHaveBeenCalledTimes(3);
	});

	it('retries a timeout', async () => {
		vi.mocked(axios.post)
			.mockRejectedValueOnce(timeoutError())
			.mockResolvedValueOnce(okResponse);

		await runWithTimers(fetchMoviesFromPicturehouse('029'));

		expect(axios.post).toHaveBeenCalledTimes(2);
	});

	it('gives up after MAX_ATTEMPTS rather than retrying forever', async () => {
		vi.mocked(axios.post).mockRejectedValue(gatewayError(502));

		await expect(runWithTimers(fetchMoviesFromPicturehouse('029'))).rejects.toThrow(/502/);
		expect(axios.post).toHaveBeenCalledTimes(PICTUREHOUSE_CONFIG.MAX_ATTEMPTS);
	});

	it('does not retry a 4xx, which repeating cannot fix', async () => {
		vi.mocked(axios.post).mockRejectedValue(gatewayError(403));

		await expect(runWithTimers(fetchMoviesFromPicturehouse('029'))).rejects.toThrow(/403/);
		expect(axios.post).toHaveBeenCalledTimes(1);
	});

	it('rejects a 200 that is not the expected movie payload', async () => {
		vi.mocked(axios.post).mockResolvedValue({ data: { response: 'success' } });

		await expect(runWithTimers(fetchMoviesFromPicturehouse('029'))).rejects.toThrow(/Invalid response/);
	});
});
