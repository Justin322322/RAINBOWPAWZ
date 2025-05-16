require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  console.log('Starting package schema update migration...');
  
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbowpaws',
      multipleStatements: true // Important for running multiple SQL statements
    });
    
    console.log('Connected to the database');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'src', 'lib', 'update_packages_schema.sql');
    console.log(`Reading SQL file: ${sqlPath}`);
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    // Execute the SQL statements
    console.log('Executing SQL migration...');
    const [results] = await connection.query(sql);
    
    console.log('SQL migration executed successfully');
    console.log('Results:', results);
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    console.log('Package schema update migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration(); 