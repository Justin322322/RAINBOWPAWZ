/**
 * Database Migration Utilities
 * Automatically checks and creates missing columns on-the-fly
 */

import { query } from "@/lib/db";

/**
 * Check if a column exists in a table
 */
async function columnExists(
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const result = (await query(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
      [tableName, columnName]
    )) as any[];

    return result && result.length > 0;
  } catch (error) {
    console.error(
      `Error checking if column exists: ${tableName}.${columnName}`,
      error
    );
    return false;
  }
}

/**
 * Check if an index exists on a table
 */
async function indexExists(
  tableName: string,
  indexName: string
): Promise<boolean> {
  try {
    const result = (await query(
      `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    `,
      [tableName, indexName]
    )) as any[];

    return result && result.length > 0;
  } catch (error) {
    console.error(
      `Error checking if index exists: ${tableName}.${indexName}`,
      error
    );
    return false;
  }
}

/**
 * Ensure cancellation_reason column exists in bookings table
 */
export async function ensureCancellationReasonColumn(): Promise<void> {
  try {
    const exists = await columnExists("bookings", "cancellation_reason");

    if (!exists) {
      console.log("Creating cancellation_reason column in bookings table...");

      // Add the column
      await query(`
        ALTER TABLE bookings 
        ADD COLUMN cancellation_reason TEXT NULL 
        AFTER status
      `);

      console.log("✅ cancellation_reason column created successfully");

      // Add index
      const hasIndex = await indexExists(
        "bookings",
        "idx_bookings_status_cancellation"
      );
      if (!hasIndex) {
        try {
          await query(`
            CREATE INDEX idx_bookings_status_cancellation 
            ON bookings(status, cancellation_reason(100))
          `);
          console.log(
            "✅ Index idx_bookings_status_cancellation created successfully"
          );
        } catch (indexError) {
          console.warn("Could not create index (non-critical):", indexError);
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring cancellation_reason column:", error);
    throw error;
  }
}

/**
 * Ensure images column exists in reviews table
 */
export async function ensureReviewImagesColumn(): Promise<void> {
  try {
    const exists = await columnExists("reviews", "images");

    if (!exists) {
      console.log("Creating images column in reviews table...");

      // Add the column
      await query(`
        ALTER TABLE reviews 
        ADD COLUMN images JSON NULL 
        AFTER comment
      `);

      console.log("✅ images column created successfully");

      // Add index (may not work on all MySQL versions with JSON)
      const hasIndex = await indexExists("reviews", "idx_reviews_images");
      if (!hasIndex) {
        try {
          await query(`
            CREATE INDEX idx_reviews_images 
            ON reviews((CAST(images AS CHAR(255))))
          `);
          console.log("✅ Index idx_reviews_images created successfully");
        } catch (indexError) {
          console.warn(
            "Could not create index on JSON column (non-critical):",
            indexError
          );
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring images column:", error);
    throw error;
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = (await query(
      `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
      [tableName]
    )) as any[];

    return result && result.length > 0 && result[0].count > 0;
  } catch (error) {
    console.error(`Error checking if table exists: ${tableName}`, error);
    return false;
  }
}

/**
 * Ensure password_reset_tokens table exists
 */
export async function ensurePasswordResetTokensTable(): Promise<void> {
  try {
    const exists = await tableExists("password_reset_tokens");

    if (!exists) {
      console.log("Creating password_reset_tokens table...");

      await query(`
        CREATE TABLE password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          UNIQUE KEY unique_token (token),
          INDEX idx_user_id (user_id),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_used (is_used),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      console.log("✅ password_reset_tokens table created successfully");
    }
  } catch (error) {
    console.error("Error ensuring password_reset_tokens table:", error);
    throw error;
  }
}

/**
 * Ensure supported_pet_types column exists in service_packages table
 */
export async function ensureSupportedPetTypesColumn(): Promise<void> {
  try {
    const exists = await columnExists("service_packages", "supported_pet_types");

    if (!exists) {
      console.log("Creating supported_pet_types column in service_packages table...");

      // Add the column
      await query(`
        ALTER TABLE service_packages 
        ADD COLUMN supported_pet_types JSON NULL 
        AFTER size_pricing
      `);

      console.log("✅ supported_pet_types column created successfully");

      // Add index for better query performance (optional, for JSON columns)
      const hasIndex = await indexExists("service_packages", "idx_packages_pet_types");
      if (!hasIndex) {
        try {
          await query(`
            CREATE INDEX idx_packages_pet_types 
            ON service_packages((CAST(supported_pet_types AS CHAR(255))))
          `);
          console.log("✅ Index idx_packages_pet_types created successfully");
        } catch (indexError) {
          console.warn(
            "Could not create index on JSON column (non-critical):",
            indexError
          );
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring supported_pet_types column:", error);
    throw error;
  }
}

/**
 * Run all migrations
 */
export async function runAllMigrations(): Promise<void> {
  console.log("🔄 Checking database schema...");

  try {
    await ensureCancellationReasonColumn();
    await ensureReviewImagesColumn();
    await ensurePasswordResetTokensTable();
    await ensureSupportedPetTypesColumn();
    console.log("✅ All database migrations completed successfully");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
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
    console.error("Migration failed but continuing:", error);
  }
}
