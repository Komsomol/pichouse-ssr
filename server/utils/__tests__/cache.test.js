import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tmdbCache, picturehouseCache } from '../cache.js';

describe('SimpleCache', () => {
	beforeEach(() => {
		tmdbCache.clear();
		picturehouseCache.clear();
	});

	it('should store and retrieve values', () => {
		tmdbCache.set('test-key', { data: 'test-value' });
		const result = tmdbCache.get('test-key');
		expect(result).toEqual({ data: 'test-value' });
	});

	it('should return null for non-existent keys', () => {
		const result = tmdbCache.get('non-existent');
		expect(result).toBeNull();
	});

	it('should handle different data types', () => {
		tmdbCache.set('string', 'hello');
		tmdbCache.set('number', 42);
		tmdbCache.set('object', { foo: 'bar' });
		tmdbCache.set('array', [1, 2, 3]);

		expect(tmdbCache.get('string')).toBe('hello');
		expect(tmdbCache.get('number')).toBe(42);
		expect(tmdbCache.get('object')).toEqual({ foo: 'bar' });
		expect(tmdbCache.get('array')).toEqual([1, 2, 3]);
	});

	it('should expire items after TTL', async () => {
		// Use fake timers to test TTL expiration
		vi.useFakeTimers();

		tmdbCache.set('test-key', 'test-value');
		expect(tmdbCache.get('test-key')).toBe('test-value');

		// Fast-forward time beyond TTL (360 minutes + 1 second)
		vi.advanceTimersByTime(360 * 60 * 1000 + 1000);

		expect(tmdbCache.get('test-key')).toBeNull();

		vi.useRealTimers();
	});

	it('should clear all cache', () => {
		tmdbCache.set('key1', 'value1');
		tmdbCache.set('key2', 'value2');
		tmdbCache.set('key3', 'value3');

		expect(tmdbCache.size()).toBe(3);

		tmdbCache.clear();

		expect(tmdbCache.size()).toBe(0);
		expect(tmdbCache.get('key1')).toBeNull();
		expect(tmdbCache.get('key2')).toBeNull();
	});

	it('should track cache size correctly', () => {
		expect(tmdbCache.size()).toBe(0);

		tmdbCache.set('key1', 'value1');
		expect(tmdbCache.size()).toBe(1);

		tmdbCache.set('key2', 'value2');
		expect(tmdbCache.size()).toBe(2);

		tmdbCache.clear();
		expect(tmdbCache.size()).toBe(0);
	});

	it('should have separate cache instances for different types', () => {
		tmdbCache.set('shared-key', 'tmdb-value');
		picturehouseCache.set('shared-key', 'picturehouse-value');

		expect(tmdbCache.get('shared-key')).toBe('tmdb-value');
		expect(picturehouseCache.get('shared-key')).toBe('picturehouse-value');
	});

	it('should overwrite existing keys', () => {
		tmdbCache.set('key', 'value1');
		expect(tmdbCache.get('key')).toBe('value1');

		tmdbCache.set('key', 'value2');
		expect(tmdbCache.get('key')).toBe('value2');
	});
});
