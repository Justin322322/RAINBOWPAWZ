import { query } from "./query";

// Removed ensureAvailabilityTablesExist - using existing JSON columns in service_providers table instead

// Fix for sort memory error in packages API
export async function ensureServicePackagesIndexes(): Promise<void> {
  try {
    // Check if index exists on created_at column
    const existingIndexes = await query(`
      SELECT COLUMN_NAME, INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_packages'
      AND INDEX_NAME = 'idx_service_packages_created_at'
    `);

    if ((existingIndexes as any[]).length === 0) {
      console.log('Adding index on service_packages.created_at to fix sort memory error...');

      // Add index on created_at column for ORDER BY queries
      await query(`
        ALTER TABLE service_packages
        ADD INDEX idx_service_packages_created_at (created_at)
      `);

      // Add composite index for provider_id + created_at queries (most common query pattern)
      await query(`
        ALTER TABLE service_packages
        ADD INDEX idx_service_packages_provider_created (provider_id, created_at)
      `);

      console.log('Successfully added indexes to service_packages table');
    } else {
      console.log('Indexes already exist on service_packages table');
    }
  } catch (error) {
    console.error('Error ensuring service_packages indexes:', error);
    // Continue without failing - this is a performance optimization
  }
}

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // MySQL doesn't support parameterized queries for SHOW TABLES, so we use string interpolation
    // The table name is validated by the database, so SQL injection is not a concern here
    const result = await query(`SHOW TABLES LIKE '${tableName}'`);
    return (result as any[]).length > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Initialize database optimizations on startup
export async function initializeDatabaseOptimizations(): Promise<void> {
  try {
    console.log('Initializing database optimizations...');
    await ensureServicePackagesIndexes();
    console.log('Database optimizations completed successfully');
  } catch (error) {
    console.error('Error initializing database optimizations:', error);
    // Continue without failing - this is a performance optimization
  }
}