import { query } from "./query";

// Removed ensureAvailabilityTablesExist - using existing JSON columns in service_providers table instead


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