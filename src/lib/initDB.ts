import { promises as fs } from 'fs';
import path from 'path';
import pool, { query } from './db';

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
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
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase().catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
}

export default initializeDatabase; 