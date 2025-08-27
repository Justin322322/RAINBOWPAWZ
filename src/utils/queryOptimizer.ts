/**
 * Database query optimization utilities
 * Provides optimized queries with proper indexing hints
 */

export const OptimizedQueries = {
  // User queries with proper indexing
  getUserById: `
    SELECT user_id as id, first_name, last_name, email, phone, address, gender, profile_picture,
           created_at, updated_at, is_otp_verified, role, status, is_verified
    FROM users 
    WHERE user_id = ? 
    LIMIT 1
  `,

  // Package queries with joins optimized
  getPackagesWithProvider: `
    SELECT 
      sp.package_id as id,
      sp.name,
      sp.description,
      sp.category,
      sp.cremation_type AS cremationType,
      sp.processing_time AS processingTime,
      sp.price,
      sp.conditions,
      sp.is_active AS isActive,
      svp.provider_id AS providerId,
      svp.name AS providerName
    FROM service_packages sp
    FORCE INDEX (PRIMARY)
    JOIN service_providers svp ON sp.provider_id = svp.provider_id
  `,

  // Notification queries optimized
  getNotificationsByUser: `
    SELECT id, title, message, type, is_read, link, created_at
    FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `,

  getUnreadNotificationCount: `
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `,

  // Package images with proper ordering
  getPackageImages: `
    SELECT package_id, image_path, display_order, image_data 
    FROM package_images 
    WHERE package_id IN (?) 
    ORDER BY package_id, display_order
  `,

  // Package inclusions and addons
  getPackageInclusions: `
    SELECT package_id, description 
    FROM package_inclusions 
    WHERE package_id IN (?)
  `,

  getPackageAddons: `
    SELECT package_id, addon_id as id, description, price 
    FROM package_addons 
    WHERE package_id IN (?)
  `,
};

/**
 * Query performance hints for common operations
 */
export const QueryHints = {
  // Use these hints for better performance
  forceIndex: (indexName: string) => `FORCE INDEX (${indexName})`,
  useIndex: (indexName: string) => `USE INDEX (${indexName})`,
  
  // Common index suggestions
  indexes: {
    users: {
      primary: 'PRIMARY',
      email: 'idx_users_email',
      role: 'idx_users_role',
      status: 'idx_users_status'
    },
    notifications: {
      user_id: 'idx_notifications_user_id',
      is_read: 'idx_notifications_is_read',
      created_at: 'idx_notifications_created_at'
    },
    service_packages: {
      provider_id: 'idx_packages_provider_id',
      is_active: 'idx_packages_is_active',
      category: 'idx_packages_category'
    },
    package_images: {
      package_id: 'idx_package_images_package_id',
      display_order: 'idx_package_images_display_order'
    }
  }
};

/**
 * Batch query utilities for better performance
 */
export class BatchQueryHelper {
  /**
   * Execute multiple queries in parallel for better performance
   */
  static async executeParallel<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(queries.map(query => query()));
  }

  /**
   * Batch process array items with size limit
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }
    
    return results;
  }
}

/**
 * Connection pool optimization settings
 */
export const ConnectionSettings = {
  // Recommended settings for production
  production: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
  },
  
  // Development settings
  development: {
    connectionLimit: 5,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    charset: 'utf8mb4'
  }
};