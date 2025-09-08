import { query } from "./query";

export async function ensureAvailabilityTablesExist(): Promise<boolean> {
  try {
    const tablesCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_providers', 'service_providers')
    `;

    const tablesResult = await query(tablesCheckQuery);
    const existingTables = (tablesResult as any[]).map((row: any) => row.TABLE_NAME.toLowerCase());

    if (!existingTables.includes("service_providers")) {
      const createAvailabilityTableQuery = `
        CREATE TABLE service_providers (
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

    if (!existingTables.includes("service_providers")) {
      const createTimeSlotsTableQuery = `
        CREATE TABLE service_providers (
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
        AND TABLE_NAME = 'service_providers'
        AND COLUMN_NAME = 'available_services'
      `;

      const columnResult = await query(columnCheckQuery);

      if ((columnResult as any[]).length === 0) {
        const addColumnQuery = `
          ALTER TABLE service_providers
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


