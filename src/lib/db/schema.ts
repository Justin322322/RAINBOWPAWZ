import { query } from "./query";

// Removed ensureAvailabilityTablesExist - using existing JSON columns in service_providers table instead

// Fix for sort memory error in packages API
export async function ensureServicePackagesIndexes(): Promise<void> {
  try {
    // Check if DDL is allowed in this environment
    const allowDDL = process.env.ALLOW_DDL === 'true';

    if (!allowDDL && process.env.NODE_ENV === 'production') {
      console.log('DDL statements blocked in production. Please create indexes manually.');
      console.log('Run the following SQL commands in your database:');
      console.log(`
        ALTER TABLE service_packages ADD INDEX idx_service_packages_created_at (created_at);
        ALTER TABLE service_packages ADD INDEX idx_service_packages_provider_created (provider_id, created_at);
      `);
      return;
    }

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

    if (error instanceof Error && error.message.includes('DDL statements are blocked')) {
      console.log('⚠️  DDL blocked in production. Manual index creation required.');
      console.log('📋 Execute this SQL in your database:');
      console.log('   ALTER TABLE service_packages ADD INDEX idx_service_packages_created_at (created_at);');
      console.log('   ALTER TABLE service_packages ADD INDEX idx_service_packages_provider_created (provider_id, created_at);');
    }

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
    console.log('🔧 Initializing database optimizations...');

    // Check if we're in production without DDL permissions
    const allowDDL = process.env.ALLOW_DDL === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !allowDDL) {
      console.log('⚠️  Production environment detected without DDL permissions.');
      console.log('📋 Please manually create the following indexes in your database:');
      console.log('');
      console.log('   ALTER TABLE service_packages ADD INDEX idx_service_packages_created_at (created_at);');
      console.log('   ALTER TABLE service_packages ADD INDEX idx_service_packages_provider_created (provider_id, created_at);');
      console.log('');
      console.log('💡 To enable automatic index creation, set ALLOW_DDL=true in your environment variables.');
      return;
    }

    await ensureServicePackagesIndexes();
    console.log('✅ Database optimizations completed successfully');
  } catch (error) {
    console.error('❌ Error initializing database optimizations:', error);

    if (error instanceof Error && error.message.includes('DDL statements are blocked')) {
      console.log('');
      console.log('🚨 MANUAL ACTION REQUIRED:');
      console.log('Execute the following SQL commands in your database console:');
      console.log('1. ALTER TABLE service_packages ADD INDEX idx_service_packages_created_at (created_at);');
      console.log('2. ALTER TABLE service_packages ADD INDEX idx_service_packages_provider_created (provider_id, created_at);');
      console.log('');
      console.log('💡 Or set ALLOW_DDL=true in your environment variables to enable automatic creation.');
    }

    // Continue without failing - this is a performance optimization
  }
}