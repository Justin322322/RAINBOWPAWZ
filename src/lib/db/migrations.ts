/**
 * Database Migration Utilities
 * Automatically checks and creates missing columns on-the-fly
 */

import { query } from '@/lib/db';

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `, [tableName, columnName]) as any[];

    return result && result.length > 0;
  } catch (error) {
    console.error(`Error checking if column exists: ${tableName}.${columnName}`, error);
    return false;
  }
}

/**
 * Check if an index exists on a table
 */
async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    `, [tableName, indexName]) as any[];

    return result && result.length > 0;
  } catch (error) {
    console.error(`Error checking if index exists: ${tableName}.${indexName}`, error);
    return false;
  }
}

/**
 * Ensure cancellation_reason column exists in bookings table
 */
export async function ensureCancellationReasonColumn(): Promise<void> {
  try {
    const exists = await columnExists('bookings', 'cancellation_reason');
    
    if (!exists) {
      console.log('Creating cancellation_reason column in bookings table...');
      
      // Add the column
      await query(`
        ALTER TABLE bookings 
        ADD COLUMN cancellation_reason TEXT NULL 
        AFTER status
      `);
      
      console.log('✅ cancellation_reason column created successfully');
      
      // Add index
      const hasIndex = await indexExists('bookings', 'idx_bookings_status_cancellation');
      if (!hasIndex) {
        try {
          await query(`
            CREATE INDEX idx_bookings_status_cancellation 
            ON bookings(status, cancellation_reason(100))
          `);
          console.log('✅ Index idx_bookings_status_cancellation created successfully');
        } catch (indexError) {
          console.warn('Could not create index (non-critical):', indexError);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring cancellation_reason column:', error);
    throw error;
  }
}

/**
 * Ensure images column exists in reviews table
 */
export async function ensureReviewImagesColumn(): Promise<void> {
  try {
    const exists = await columnExists('reviews', 'images');
    
    if (!exists) {
      console.log('Creating images column in reviews table...');
      
      // Add the column
      await query(`
        ALTER TABLE reviews 
        ADD COLUMN images JSON NULL 
        AFTER comment
      `);
      
      console.log('✅ images column created successfully');
      
      // Add index (may not work on all MySQL versions with JSON)
      const hasIndex = await indexExists('reviews', 'idx_reviews_images');
      if (!hasIndex) {
        try {
          await query(`
            CREATE INDEX idx_reviews_images 
            ON reviews((CAST(images AS CHAR(255))))
          `);
          console.log('✅ Index idx_reviews_images created successfully');
        } catch (indexError) {
          console.warn('Could not create index on JSON column (non-critical):', indexError);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring images column:', error);
    throw error;
  }
}

/**
 * Run all migrations
 */
export async function runAllMigrations(): Promise<void> {
  console.log('🔄 Checking database schema...');
  
  try {
    await ensureCancellationReasonColumn();
    await ensureReviewImagesColumn();
    console.log('✅ All database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

/**
 * Safe migration runner - doesn't throw errors, just logs them
 */
export async function runMigrationsSafely(): Promise<void> {
  try {
    await runAllMigrations();
  } catch (error) {
    console.error('Migration failed but continuing:', error);
  }
}
