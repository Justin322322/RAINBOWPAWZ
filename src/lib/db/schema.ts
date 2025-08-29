import { query } from "./query";

export async function ensureAvailabilityTablesExist(): Promise<boolean> {
  try {
    const tablesCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('provider_availability', 'provider_time_slots')
    `;

    const tablesResult = await query(tablesCheckQuery);
    const existingTables = (tablesResult as any[]).map((row: any) => row.TABLE_NAME.toLowerCase());

    if (!existingTables.includes("provider_availability")) {
      const createAvailabilityTableQuery = `
        CREATE TABLE IF NOT EXISTS provider_availability (
          id INT AUTO_INCREMENT PRIMARY KEY,
          provider_id INT NOT NULL,
          date DATE NOT NULL,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY provider_date_unique (provider_id, date)
        )
      `;
      await query(createAvailabilityTableQuery);
    }

    if (!existingTables.includes("provider_time_slots")) {
      const createTimeSlotsTableQuery = `
        CREATE TABLE IF NOT EXISTS provider_time_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          provider_id INT NOT NULL,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          available_services TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (provider_id, date)
        )
      `;
      await query(createTimeSlotsTableQuery);
    } else {
      // Add column if it doesn't exist (race-safe for both MySQL 8.0+ and 5.7)
      const addColumnQuery = `
        ALTER TABLE provider_time_slots
        ADD COLUMN IF NOT EXISTS available_services TEXT
      `;

      try {
        await query(addColumnQuery);
      } catch (error: any) {
        // Handle ER_DUP_FIELDNAME error for MySQL 5.7 compatibility
        // This error occurs when the column already exists
        if (error?.code === 'ER_DUP_FIELDNAME') {
          // Column already exists, this is expected - continue silently
          console.log('Column available_services already exists, skipping...');
        } else {
          // Re-throw unexpected errors
          throw error;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
      [tableName]
    );
    return (result as any[]).length > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Ensures the users table has a functional index on LOWER(email) for optimal case-insensitive email lookups
 */
export async function ensureEmailIndex(): Promise<boolean> {
  try {
    // Check if the functional index on LOWER(email) already exists
    const indexCheckQuery = `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'idx_users_email_lower'
    `;

    const indexResult = await query(indexCheckQuery);

    if ((indexResult as any[]).length === 0) {
      // Before creating the unique index, check for case-only duplicate emails
      const duplicateCheckQuery = `
        SELECT LOWER(email) as email_lower, COUNT(*) as count,
               GROUP_CONCAT(email ORDER BY email SEPARATOR ', ') as examples
        FROM users
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
        LIMIT 5
      `;

      const duplicateResult = await query(duplicateCheckQuery) as any[];

      if (duplicateResult.length > 0) {
        const totalDuplicates = duplicateResult.reduce((sum, row) => sum + row.count, 0);
        const examples = duplicateResult.map(row => row.examples).join('; ');

        throw new Error(
          `Cannot create case-insensitive email index due to ${totalDuplicates} duplicate email addresses that differ only by case. ` +
          `Examples of conflicting emails: ${examples}. ` +
          `Please resolve these duplicates before running the migration.`
        );
      }

      // Check MySQL version to determine the best approach
      const versionQuery = `SELECT VERSION() as version`;
      const versionResult = await query(versionQuery) as any[];
      const mysqlVersion = versionResult[0]?.version || '';
      const isMySQL8Plus = mysqlVersion.startsWith('8.');

      let createIndexQuery: string;

      if (isMySQL8Plus) {
        // MySQL 8.0+ supports IF NOT EXISTS for indexes
        createIndexQuery = `
          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
          ON users ((LOWER(email)))
        `;
      } else {
        // For older MySQL versions, use try/catch approach
        createIndexQuery = `
          CREATE UNIQUE INDEX idx_users_email_lower
          ON users ((LOWER(email)))
        `;
      }

      try {
        await query(createIndexQuery);
        console.log('Created functional index on LOWER(email) for users table');
      } catch (indexError: any) {
        // Handle ER_DUP_ENTRY error for case-only duplicates that might have been created during execution
        if (indexError?.code === 'ER_DUP_ENTRY') {
          throw new Error(
            'Failed to create case-insensitive email index due to duplicate email addresses that differ only by case. ' +
            'This may have occurred if new duplicates were created during index creation. ' +
            'Please check for and resolve any case-only duplicate emails before retrying.'
          );
        }
        // Re-throw other unexpected errors
        throw indexError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring email index exists:', error);
    return false;
  }
}


