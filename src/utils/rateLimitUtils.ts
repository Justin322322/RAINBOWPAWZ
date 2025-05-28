import { query } from '@/lib/db';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  identifier: string; // user_id, ip_address, etc.
  action: string; // 'notification_fetch', 'notification_mark_read', etc.
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

/**
 * Server-side rate limiting utility using database-backed tracking
 * This replaces the unreliable client-side timestamp approach
 */
export class RateLimiter {
  private static async ensureRateLimitTable(): Promise<boolean> {
    try {
      // Check if the rate_limits table exists
      const tableExists = await query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'rate_limits'`
      ) as any[];

      if (tableExists[0].count === 0) {
        // Create the rate_limits table
        await query(`
          CREATE TABLE rate_limits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            request_count INT DEFAULT 1,
            window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_identifier_action (identifier, action),
            INDEX idx_window_start (window_start)
          )
        `);
      }

      return true;
    } catch (error) {
      console.error('Error ensuring rate_limits table:', error);
      return false;
    }
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  static async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      // Ensure the rate_limits table exists
      const tableReady = await this.ensureRateLimitTable();
      if (!tableReady) {
        // If we can't create the table, allow the request but log the issue
        console.warn('Rate limiting disabled due to table creation failure');
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000)
        };
      }

      const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

      // Clean up old entries first (older than the current window)
      await query(
        'DELETE FROM rate_limits WHERE window_start < ?',
        [windowStart]
      );

      // Check current request count for this identifier and action
      const currentCount = await query(
        `SELECT request_count, window_start FROM rate_limits
         WHERE identifier = ? AND action = ? AND window_start >= ?
         ORDER BY window_start DESC LIMIT 1`,
        [config.identifier, config.action, windowStart]
      ) as any[];

      let requestCount = 0;
      let existingWindowStart = null;

      if (currentCount.length > 0) {
        requestCount = currentCount[0].request_count;
        existingWindowStart = currentCount[0].window_start;
      }

      // Check if we're within the rate limit
      if (requestCount >= config.maxRequests) {
        const resetTime = new Date(existingWindowStart.getTime() + config.windowMinutes * 60 * 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          error: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMinutes} minutes.`
        };
      }

      // Update or insert the rate limit record
      if (currentCount.length > 0) {
        // Update existing record
        await query(
          'UPDATE rate_limits SET request_count = request_count + 1, updated_at = CURRENT_TIMESTAMP WHERE identifier = ? AND action = ? AND window_start >= ?',
          [config.identifier, config.action, windowStart]
        );
      } else {
        // Insert new record
        await query(
          'INSERT INTO rate_limits (identifier, action, request_count, window_start) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
          [config.identifier, config.action]
        );
      }

      const remaining = config.maxRequests - (requestCount + 1);
      const resetTime = new Date(Date.now() + config.windowMinutes * 60 * 1000);

      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetTime
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
        error: 'Rate limiting temporarily unavailable'
      };
    }
  }

  /**
   * Convenience method for notification fetching rate limiting
   */
  static async checkNotificationFetchLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit({
      maxRequests: 30, // 30 requests per minute
      windowMinutes: 1,
      identifier: userId,
      action: 'notification_fetch'
    });
  }

  /**
   * Convenience method for notification mark-read rate limiting
   */
  static async checkNotificationMarkReadLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit({
      maxRequests: 20, // 20 mark-read requests per minute
      windowMinutes: 1,
      identifier: userId,
      action: 'notification_mark_read'
    });
  }

  /**
   * Convenience method for notification creation rate limiting
   */
  static async checkNotificationCreateLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit({
      maxRequests: 10, // 10 notification creations per minute
      windowMinutes: 1,
      identifier: userId,
      action: 'notification_create'
    });
  }
}

/**
 * Helper function to create standardized rate limit headers
 */
export function createRateLimitHeaders(rateLimitResult: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString()
  };

  if (!rateLimitResult.allowed) {
    headers['Retry-After'] = Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString();
  }

  return headers;
}

/**
 * Helper function to create standardized error responses
 */
export function createStandardErrorResponse(
  error: string,
  status: number = 500,
  additionalData: Record<string, any> = {}
): { error: string; success: boolean; timestamp: string } & Record<string, any> {
  return {
    error,
    success: false,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
}

/**
 * Helper function to create standardized success responses
 */
export function createStandardSuccessResponse(
  data: Record<string, any> = {},
  message?: string
): { success: boolean; timestamp: string; message?: string } & Record<string, any> {
  const response: { success: boolean; timestamp: string; message?: string } & Record<string, any> = {
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  };

  if (message) {
    response.message = message;
  }

  return response;
}
