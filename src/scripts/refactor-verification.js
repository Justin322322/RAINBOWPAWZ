/**
 * Database Refactoring Script for Service Providers
 * This script fixes the issues with the service_providers table having two status fields
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function main() {
  console.log('Starting service_providers table refactoring...');
  let connection;

  try {
    // Connect to the database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if service_providers table exists
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'service_providers'
    `, [dbConfig.database]);

    if (tables[0].count === 0) {
      console.log('The service_providers table does not exist');
      return;
    }

    // Get the current schema
    console.log('Checking current service_providers schema...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers
    `);

    // Check if both status and verification_status exist
    const hasStatus = columns.some(col => col.Field === 'status');
    const hasVerificationStatus = columns.some(col => col.Field === 'verification_status');

    if (!hasStatus || !hasVerificationStatus) {
      console.log('The service_providers table does not have both status and verification_status columns');
      return;
    }

    console.log('Both status and verification_status columns found. Proceeding with refactoring...');

    // 1. First, update any mismatched statuses to ensure consistency
    console.log('Updating mismatched statuses...');
    await connection.query(`
      UPDATE service_providers
      SET status = verification_status
      WHERE status != verification_status
    `);

    // 2. Create a backup of the original table
    console.log('Creating backup of service_providers table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_providers_backup LIKE service_providers
    `);
    
    await connection.query(`
      INSERT INTO service_providers_backup
      SELECT * FROM service_providers
    `);
    console.log('Backup created successfully');

    // 3. Update the verification_status enum to include all possible states
    console.log('Modifying verification_status column to consolidate statuses...');
    await connection.query(`
      ALTER TABLE service_providers
      MODIFY COLUMN verification_status ENUM(
        'pending', 
        'verified', 
        'rejected', 
        'restricted', 
        'declined', 
        'documents_required', 
        'reviewing', 
        'approved', 
        'active'
      ) NOT NULL DEFAULT 'pending'
    `);

    // 4. Add a new column for application_status that's separate from account status
    console.log('Adding application_status column...');
    try {
      // Check if application_status column already exists
      const [appStatusCheck] = await connection.query(`
        SHOW COLUMNS FROM service_providers LIKE 'application_status'
      `);
      
      if (appStatusCheck.length === 0) {
        await connection.query(`
          ALTER TABLE service_providers
          ADD COLUMN application_status ENUM(
            'pending', 
            'reviewing', 
            'documents_required', 
            'approved', 
            'declined'
          ) NOT NULL DEFAULT 'pending' AFTER verification_status
        `);
        
        // Initialize application_status based on verification_status
        await connection.query(`
          UPDATE service_providers
          SET application_status = 
            CASE 
              WHEN verification_status = 'verified' OR verification_status = 'approved' THEN 'approved'
              WHEN verification_status = 'declined' OR verification_status = 'rejected' THEN 'declined'
              WHEN verification_status = 'documents_required' THEN 'documents_required'
              WHEN verification_status = 'reviewing' THEN 'reviewing'
              ELSE 'pending'
            END
        `);
      } else {
        console.log('application_status column already exists');
      }
    } catch (error) {
      console.error('Error adding application_status column:', error.message);
    }

    // 5. Update the status column to represent account status only
    console.log('Updating status column purpose...');
    await connection.query(`
      ALTER TABLE service_providers
      MODIFY COLUMN status ENUM(
        'active', 
        'inactive', 
        'suspended', 
        'restricted'
      ) NOT NULL DEFAULT 'active'
    `);

    // Set all status values to 'active' initially
    await connection.query(`
      UPDATE service_providers
      SET status = 'active'
      WHERE verification_status = 'verified' OR verification_status = 'approved'
    `);

    // Set restricted statuses
    await connection.query(`
      UPDATE service_providers
      SET status = 'restricted'
      WHERE verification_status = 'restricted'
    `);

    console.log('Schema refactoring completed successfully!');
    
    // Print a summary of the changes made
    const [countResults] = await connection.query(`
      SELECT 
        application_status,
        verification_status,
        status,
        COUNT(*) as count
      FROM service_providers
      GROUP BY application_status, verification_status, status
    `);
    
    console.log('\nCurrent status distribution:');
    console.table(countResults);
    
    console.log('\nTable refactoring completed successfully. The service_providers table now has:');
    console.log('1. verification_status - Historical record of the verification decision');
    console.log('2. application_status - Current application processing status');
    console.log('3. status - Account status (active, inactive, suspended, restricted)');

  } catch (error) {
    console.error('Error during refactoring:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

main();
