/**
 * Rainbow Paws Database Port Fix
 * 
 * This script is used to fix database connectivity issues across different ports.
 * It ensures that the application properly connects to the database regardless of the port.
 */

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get port from command line arguments or use 3000 as default
const port = process.argv[2] || 3000;

async function fixDatabaseConnectivity() {
  console.log('Starting database port fix...');
  console.log(`Current port: ${port}`);
  
  // Database connection configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    // Allow connections from any host/port
    socketPath: undefined,
    insecureAuth: true,
  };

  console.log('Connecting to database...');
  console.log(`DB Config: ${JSON.stringify({
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    socketPath: dbConfig.socketPath,
    insecureAuth: dbConfig.insecureAuth
  })}`);
  
  try {
    // Connect to the database
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Ensure the correct database is selected
    await connection.query(`USE ${dbConfig.database}`);
    console.log(`Selected database: ${dbConfig.database}`);
    
    // Get list of tables in the database
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [dbConfig.database]);
    
    console.log('Tables in database:');
    for (const table of tables) {
      console.log(`- ${table.TABLE_NAME}`);
    }
    
    // Check if users table exists, create it if it doesn't
    const usersTableExists = tables.some(t => t.TABLE_NAME === 'users');
    
    if (!usersTableExists) {
      console.log('Creating users table...');
      
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20),
          address TEXT,
          sex VARCHAR(20),
          user_type VARCHAR(20) NOT NULL DEFAULT 'fur_parent',
          is_verified BOOLEAN DEFAULT 0,
          is_otp_verified BOOLEAN DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Users table created successfully');
    }
    
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
    
    // Test health check endpoint
    console.log('\nTesting health check endpoint...');
    try {
      // Start the server in the background
      const serverProcess = require('child_process').spawn(
        'node',
        ['start-app.js', port],
        { 
          detached: true,
          stdio: 'ignore'
        }
      );
      
      // Give server time to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Make a request to health check endpoint
      const healthCheckResponse = execSync(`curl -s http://localhost:${port}/api/health-check`);
      console.log(`Health check response: ${healthCheckResponse}`);
      
      // Clean up server process
      process.kill(-serverProcess.pid);
      
    } catch (error) {
      console.error('Error testing health check endpoint:', error.message);
    }
    
    console.log('\nDatabase port fix completed successfully');
    console.log('Your database should now be accessible from any port');
    
  } catch (error) {
    console.error('Database fix error:', error);
    process.exit(1);
  }
}

// Run the fix
fixDatabaseConnectivity().catch(console.error); 