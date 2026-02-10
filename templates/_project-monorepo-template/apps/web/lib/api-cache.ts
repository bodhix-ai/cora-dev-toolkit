/**
 * API Request Deduplication and Caching System
 *
 * This module prevents redundant API calls by:
 * 1. Caching responses for a configurable time period
 * 2. Deduplicating identical requests that happen concurrently
 * 3. Providing a simple interface to wrap existing API calls
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

type PendingRequest<T> = Promise<T>;

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, PendingRequest<unknown>>();

  // Default cache duration: 5 minutes for profiles, 2 minutes for other data
  private defaultTTL = 2 * 60 * 1000; // 2 minutes
  private profileTTL = 5 * 60 * 1000; // 5 minutes for user profiles

  /**
   * Get cache key for a request
   */
  private getCacheKey(fn: Function, args: unknown[]): string {
    const functionName = fn.name || "anonymous";
    const argsString = JSON.stringify(args);
    return `${functionName}:${argsString}`;
  }

  /**
   * Get TTL based on function name
   */
  private getTTL(functionName: string): number {
    if (functionName.includes("Profile") || functionName.includes("profile")) {
      return this.profileTTL;
    }
    return this.defaultTTL;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Get cached data if available and valid
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCacheEntry(entry)) {
      console.log(`🟢 Cache HIT for ${key}`);
      return entry.data as T;
    }

    if (entry) {
      console.log(`🟡 Cache EXPIRED for ${key}`);
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Store data in cache
   */
  private setCachedData<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
    console.log(`🟢 Cache SET for ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Wrap an async API function with caching and deduplication
   */
  async cachedRequest<T>(
    fn: (...args: unknown[]) => Promise<T>,
    ...args: unknown[]
  ): Promise<T> {
    const key = this.getCacheKey(fn, args);
    const functionName = fn.name || "anonymous";

    // Check cache first
    const cachedData = this.getCachedData<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Check if there's already a pending request for this exact call
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      console.log(`🟡 Request DEDUPLICATION for ${key}`);
      return pendingRequest as Promise<T>;
    }

    // Make the actual API call
    console.log(`🔴 Cache MISS for ${key} - making API call`);
    const requestPromise = fn(...args);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;

      // Cache the result
      const ttl = this.getTTL(functionName);
      this.setCachedData(key, result, ttl);

      return result;
    } catch (error) {
      console.error(`❌ API call failed for ${key}:`, error);
      throw error;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Clear cache for specific function/args combination
   */
  invalidate(fn: Function, ...args: unknown[]): void {
    const key = this.getCacheKey(fn, args);
    this.cache.delete(key);
    console.log(`🗑️ Cache INVALIDATED for ${key}`);
  }

  /**
   * Clear all cache entries for a specific function
   */
  invalidateFunction(fn: Function): void {
    const functionName = fn.name || "anonymous";
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${functionName}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      console.log(`🗑️ Cache INVALIDATED for ${key}`);
    });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log("🗑️ All cache CLEARED");
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now < entry.expiresAt) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Export singleton instance
export const apiCache = new ApiCache();

/**
 * Convenience wrapper for caching API calls
 *
 * Usage:
 * const profiles = await cached(getProfiles, token);
 * const profile = await cached(getProfile, token);
 */
export const cached = <T>(
  fn: (...args: unknown[]) => Promise<T>,
  ...args: unknown[]
): Promise<T> => {
  return apiCache.cachedRequest(fn, ...args);
};

/**
 * Clear cache for specific function calls
 */
export const invalidateCache = {
  profile: (token: string) => apiCache.invalidate(cached, token),
  profiles: (token: string) => apiCache.invalidate(cached, token),
  organizations: (token: string) => apiCache.invalidate(cached, token),
  projects: (token: string, orgId: string) =>
    apiCache.invalidate(cached, token, orgId),
  clear: () => apiCache.clear(),
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => apiCache.getStats();
