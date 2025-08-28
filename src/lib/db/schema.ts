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

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Using INFORMATION_SCHEMA works with parameter binding; SHOW TABLES LIKE ? may not
    const sql = `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1
    `;
    const result = await query(sql, [tableName]);
    return Array.isArray(result) && (result as any[]).length > 0;
  } catch {
    return false;
  }
}


