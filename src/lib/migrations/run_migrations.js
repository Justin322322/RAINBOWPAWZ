const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function runMigrations() {
  let connection;
  
  try {
    // Create a connection to the database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // Get the list of migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    console.log(`Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      
      // Read the SQL file
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split the SQL into individual statements
      const statements = sql.split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);
      
      // Execute each statement
      for (const statement of statements) {
        try {
          await connection.query(statement);
          console.log(`Executed statement successfully`);
        } catch (error) {
          console.error(`Error executing statement: ${error.message}`);
          // Continue with the next statement
        }
      }
      
      console.log(`Migration ${file} completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migrations
runMigrations(); 