/**
 * Efficient image caching utility that avoids localStorage quota issues
 * Uses memory cache with size limits and automatic cleanup
 */

interface CacheEntry {
  data: string;
  timestamp: number;
  size: number;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 50 * 1024 * 1024; // 50MB memory limit
  private currentSize = 0;
  private maxAge = 30 * 60 * 1000; // 30 minutes

  set(key: string, data: string): void {
    // Calculate approximate size (base64 is ~33% larger than binary)
    const size = data.length * 0.75;
    
    // Skip caching if single item is too large (>10MB)
    if (size > 10 * 1024 * 1024) {
      console.warn('Image too large for cache:', key);
      return;
    }

    // Clean up old entries if needed
    this.cleanup();

    // Make room if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Add to cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
    this.currentSize += size;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  getStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentSize,
      count: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Global cache instance
export const imageCache = new ImageCache();

/**
 * Safe localStorage wrapper that handles quota exceeded errors
 */
export class SafeStorage {
  static setItem(key: string, value: string): boolean {
    try {
      // For large values, use memory cache instead
      if (value.length > 1024 * 1024) { // 1MB threshold
        imageCache.set(key, value);
        return true;
      }

      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, using memory cache');
        imageCache.set(key, value);
        return true;
      }
      console.error('Error setting localStorage item:', error);
      return false;
    }
  }

  static getItem(key: string): string | null {
    try {
      // Check memory cache first
      const cached = imageCache.get(key);
      if (cached) return cached;

      // Fallback to localStorage
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      imageCache.delete(key);
    } catch (error) {
      console.error('Error removing localStorage item:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
      imageCache.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}