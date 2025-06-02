import { promises as fs } from 'fs';
import path from 'path';
import pool, { query } from './db';

async function initializeDatabase() {
  try {

    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');

    // Split the SQL statements by semicolons and filter out empty statements
    const statements = schemaSql.split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      await query(statement);
    }

    return true;
  } catch (error) {
    // Database initialization error
    throw error;
  }
  // Removed pool.end() to prevent closing the connection pool that might be used elsewhere
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase().catch(error => {
    process.exit(1);
  });
}

export default initializeDatabase;