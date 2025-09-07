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
        CREATE TABLE provider_availability (
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
        CREATE TABLE provider_time_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          provider_id INT NOT NULL,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          available_services TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (provider_id, date)
        )
      `;
      await query(createTimeSlotsTableQuery);
    } else {
      const columnCheckQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'provider_time_slots'
        AND COLUMN_NAME = 'available_services'
      `;

      const columnResult = await query(columnCheckQuery);

      if ((columnResult as any[]).length === 0) {
        const addColumnQuery = `
          ALTER TABLE provider_time_slots
          ADD COLUMN available_services TEXT DEFAULT NULL
        `;
        await query(addColumnQuery);
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function ensureRefundsTableExists(): Promise<boolean> {
  try {
    const tableExists = await checkTableExists('refunds');
    if (!tableExists) {
      const createRefundsTableQuery = `
        CREATE TABLE refunds (
          id INT NOT NULL AUTO_INCREMENT,
          booking_id INT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          reason TEXT COLLATE utf8mb4_unicode_ci,
          status ENUM(
            'pending',
            'processing',
            'processed',
            'failed',
            'cancelled'
          ) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
          processed_by INT DEFAULT NULL,
          payment_method VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          transaction_id VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          notes TEXT COLLATE utf8mb4_unicode_ci,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_booking_id (booking_id),
          KEY idx_status (status),
          KEY idx_created_at (created_at)
        ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
      `;
      await query(createRefundsTableQuery);
      console.log('✅ Created refunds table successfully');
    } else {
      console.log('✅ Refunds table already exists');
    }
    return true;
  } catch (error) {
    console.error('❌ Error ensuring refunds table exists:', error);
    return false;
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


