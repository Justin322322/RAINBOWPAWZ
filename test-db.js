/**
 * Database Test Script
 * This script tests the database connection in production mode
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Log environment variables
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: parseInt(process.env.DB_PORT || '3306'),
};

console.log('Database configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  port: dbConfig.port,
  database: dbConfig.database
});

async function testConnection() {
  let connection;
  try {
    console.log('Attempting to connect to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connection successful!');

    // Test query
    console.log('Testing query...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query result:', rows);

    // Check if users table exists
    try {
      console.log('Checking users table...');
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`Users table has ${users[0].count} records`);
    } catch (tableError) {
      console.error('Error checking users table:', tableError.message);
      
      // Check if database exists
      try {
        console.log('Checking if database exists...');
        const [databases] = await connection.execute('SHOW DATABASES');
        console.log('Available databases:', databases.map(db => db.Database).join(', '));
        
        // Create database if it doesn't exist
        if (!databases.some(db => db.Database === dbConfig.database)) {
          console.log(`Database '${dbConfig.database}' not found. Creating it...`);
          await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
          console.log(`Database '${dbConfig.database}' created successfully.`);
        }
      } catch (dbError) {
        console.error('Error checking databases:', dbError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.errno);
    console.error('SQL state:', error.sqlState);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Make sure MySQL is running on port 3306.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Check your MySQL username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist. Make sure the database name is correct.');
      
      // Try to connect without specifying a database
      try {
        console.log('Trying to connect without specifying a database...');
        const rootConfig = { ...dbConfig };
        delete rootConfig.database;
        
        const rootConnection = await mysql.createConnection(rootConfig);
        console.log('Connected to MySQL without specifying a database.');
        
        // Create the database
        console.log(`Creating database '${dbConfig.database}'...`);
        await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log(`Database '${dbConfig.database}' created successfully.`);
        
        await rootConnection.end();
      } catch (rootError) {
        console.error('Error connecting to MySQL without database:', rootError.message);
      }
    }
    
    return false;
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Connection closed.');
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
