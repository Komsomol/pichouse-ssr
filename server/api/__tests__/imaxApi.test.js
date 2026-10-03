import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchImaxListings } from '../imaxApi.js';
import { imaxCache } from '../../utils/cache.js';

vi.mock('axios', () => ({
	default: { get: vi.fn() },
}));

const films = [{ title: 'Digger', performances: [] }];

describe('fetchImaxListings', () => {
	beforeEach(() => {
		imaxCache.clear();
		vi.mocked(axios.get).mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shares one download between callers that arrive while it is running', async () => {
		vi.mocked(axios.get).mockResolvedValue({ data: films });

		const [first, second] = await Promise.all([fetchImaxListings(), fetchImaxListings()]);

		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
	});

	it('serves a later call from the cache', async () => {
		vi.mocked(axios.get).mockResolvedValue({ data: films });

		await fetchImaxListings();
		await fetchImaxListings();

		expect(axios.get).toHaveBeenCalledTimes(1);
	});

	it('returns an empty list on failure and does not cache it', async () => {
		vi.mocked(axios.get)
			.mockRejectedValueOnce(Object.assign(new Error('fail'), { response: { status: 502 } }))
			.mockResolvedValue({ data: films });

		await expect(fetchImaxListings()).resolves.toEqual([]);
		await expect(fetchImaxListings()).resolves.toEqual(films);
		expect(axios.get).toHaveBeenCalledTimes(2);
	});
});
