interface CacheItem {
	data: any;
	timestamp: number;
	expiresAt: number;
}

class CacheService {
	private cache: Map<string, CacheItem> = new Map();
	private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

	set(key: string, data: any): void {
		const now = Date.now();
		const expiresAt = now + this.CACHE_DURATION;
		
		this.cache.set(key, {
			data,
			timestamp: now,
			expiresAt
		});
		
		console.log(`Cached data for key: ${key}, expires at: ${new Date(expiresAt).toISOString()}`);
	}

	get(key: string): any | null {
		const item = this.cache.get(key);
		
		if (!item) {
			console.log(`Cache miss for key: ${key}`);
			return null;
		}
		
		const now = Date.now();
		if (now > item.expiresAt) {
			console.log(`Cache expired for key: ${key}, removing from cache`);
			this.cache.delete(key);
			return null;
		}
		
		console.log(`Cache hit for key: ${key}, age: ${Math.round((now - item.timestamp) / 1000)}s`);
		return item.data;
	}

	clear(): void {
		console.log('Clearing all cache entries');
		this.cache.clear();
	}

	clearExpired(): void {
		const now = Date.now();
		let clearedCount = 0;
		
		for (const [key, item] of this.cache.entries()) {
			if (now > item.expiresAt) {
				this.cache.delete(key);
				clearedCount++;
			}
		}
		
		if (clearedCount > 0) {
			console.log(`Cleared ${clearedCount} expired cache entries`);
		}
	}

	getCacheInfo(): { totalEntries: number; expiredEntries: number; validEntries: number } {
		const now = Date.now();
		let expiredCount = 0;
		let validCount = 0;
		
		for (const item of this.cache.values()) {
			if (now > item.expiresAt) {
				expiredCount++;
			} else {
				validCount++;
			}
		}
		
		return {
			totalEntries: this.cache.size,
			expiredEntries: expiredCount,
			validEntries: validCount
		};
	}
}

// Export singleton instance
export const cacheService = new CacheService();

// Clean up expired entries every 5 minutes
setInterval(() => {
	cacheService.clearExpired();
}, 5 * 60 * 1000);
