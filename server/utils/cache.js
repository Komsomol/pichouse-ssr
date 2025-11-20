// Simple in-memory cache with TTL (Time To Live)
// This prevents repeated API calls for the same data

class SimpleCache {
	constructor(ttlMinutes = 60) {
		this.cache = new Map();
		this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
	}

	// Get cached value if it exists and hasn't expired
	get(key) {
		const item = this.cache.get(key);
		if (!item) return null;

		const now = Date.now();
		if (now - item.timestamp > this.ttl) {
			// Cache expired, remove it
			this.cache.delete(key);
			return null;
		}

		return item.value;
	}

	// Set a value in cache with current timestamp
	set(key, value) {
		this.cache.set(key, {
			value,
			timestamp: Date.now(),
		});
	}

	// Clear all cache
	clear() {
		this.cache.clear();
	}

	// Get cache size
	size() {
		return this.cache.size;
	}
}

// Create cache instances for different data types
// TMDb data rarely changes, so cache for 6 hours
export const tmdbCache = new SimpleCache(360);

// Picturehouse data changes daily, cache for 1 hour
export const picturehouseCache = new SimpleCache(60);
