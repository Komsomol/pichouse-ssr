import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { parseMetascore, createMetacriticUrl, fetchMetascoreFromOMDB } from '../omdbApi.js';

vi.mock('axios');

describe('parseMetascore', () => {
	it('reads a score', () => {
		expect(parseMetascore('73')).toBe(73);
		expect(parseMetascore('0')).toBe(0);
	});

	it('returns null when Metacritic has no score', () => {
		expect(parseMetascore('N/A')).toBeNull();
		expect(parseMetascore(undefined)).toBeNull();
		expect(parseMetascore('')).toBeNull();
	});

	it('rejects values outside 0-100', () => {
		expect(parseMetascore('101')).toBeNull();
		expect(parseMetascore('-1')).toBeNull();
	});
});

describe('createMetacriticUrl', () => {
	it('links to a movie search for the title', () => {
		expect(createMetacriticUrl('Ghosts: The Possession of Button House'))
			.toBe('https://www.metacritic.com/search/Ghosts%3A%20The%20Possession%20of%20Button%20House/?category=2');
	});
});

describe('fetchMetascoreFromOMDB', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('makes no request without an API key', async () => {
		vi.stubEnv('OMDB_API_KEY', '');

		expect(await fetchMetascoreFromOMDB('tt0133093', 'The Matrix')).toBeNull();
		expect(axios.get).not.toHaveBeenCalled();
	});

	it('makes no request without an IMDb id', async () => {
		vi.stubEnv('OMDB_API_KEY', 'key');

		expect(await fetchMetascoreFromOMDB(null, 'The Matrix')).toBeNull();
		expect(axios.get).not.toHaveBeenCalled();
	});

	it('looks the film up by IMDb id and returns score and link', async () => {
		vi.stubEnv('OMDB_API_KEY', 'key');
		axios.get.mockResolvedValueOnce({ data: { Response: 'True', Metascore: '73' } });

		const result = await fetchMetascoreFromOMDB('tt0133093', 'The Matrix');

		expect(result).toEqual({
			score: 73,
			url: 'https://www.metacritic.com/search/The%20Matrix/?category=2',
		});
		expect(axios.get.mock.calls[0][1].params).toMatchObject({ i: 'tt0133093' });
	});

	it('returns null for a film Metacritic has not scored', async () => {
		vi.stubEnv('OMDB_API_KEY', 'key');
		axios.get.mockResolvedValueOnce({ data: { Response: 'True', Metascore: 'N/A' } });

		expect(await fetchMetascoreFromOMDB('tt0000001', 'Quiz Night')).toBeNull();
	});

	it('returns null and never logs the API key when the request fails', async () => {
		vi.stubEnv('OMDB_API_KEY', 'secret-key');
		const error = Object.assign(new Error('Request failed with status code 401'), {
			config: { params: { apikey: 'secret-key' } },
			response: { status: 401 },
		});
		axios.get.mockRejectedValueOnce(error);
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(await fetchMetascoreFromOMDB('tt0133093', 'The Matrix')).toBeNull();
		expect(JSON.stringify(logged.mock.calls)).not.toContain('secret-key');
		expect(logged.mock.calls[0][1]).toBe(401);
	});
});
