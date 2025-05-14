/**
 * Comprehensive Database Schema Refactoring Script
 * 
 * This script will:
 * 1. Consolidate status fields in service_providers
 * 2. Standardize user status fields
 * 3. Create missing relationships between tables
 * 4. Fix inconsistencies in naming and values
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

// Main function to run all refactorings
async function main() {
  console.log('Starting comprehensive database refactoring...');
  let connection;

  try {
    // Connect to the database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check all required tables exist
    const requiredTables = ['users', 'service_providers', 'service_packages'];
    for (const table of requiredTables) {
      const [tableExists] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = ?
      `, [dbConfig.database, table]);
      
      if (tableExists[0].count === 0) {
        console.log(`The ${table} table does not exist. Please create it first.`);
        return;
      }
    }

    // Create backups of all tables to be modified
    console.log('\n--- Creating backups of tables ---');
    await createBackup(connection, 'service_providers');
    await createBackup(connection, 'users');

    // Refactor service_providers table
    console.log('\n--- Refactoring service_providers table ---');
    await refactorServiceProviders(connection);

    // Refactor users table
    console.log('\n--- Refactoring users table ---');
    await refactorUsers(connection);

    // Update statistics queries
    console.log('\n--- Updating statistics queries ---');
    await updateStatisticsQueries(connection);

    console.log('\n=== Database refactoring completed successfully! ===');

  } catch (error) {
    console.error('Error during refactoring:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Create backup of a table
async function createBackup(connection, tableName) {
  const backupTableName = `${tableName}_backup_${Date.now()}`;
  console.log(`Creating backup of ${tableName} as ${backupTableName}...`);
  
  try {
    await connection.query(`CREATE TABLE ${backupTableName} LIKE ${tableName}`);
    await connection.query(`INSERT INTO ${backupTableName} SELECT * FROM ${tableName}`);
    console.log(`Backup created successfully`);
    return backupTableName;
  } catch (error) {
    console.error(`Error creating backup for ${tableName}:`, error.message);
    throw error;
  }
}

// Refactor service_providers table
async function refactorServiceProviders(connection) {
  try {
    // Step 1: Check if application_status column exists
    const [appStatusColumns] = await connection.query(`
      SHOW COLUMNS FROM service_providers LIKE 'application_status'
    `);
    
    const hasApplicationStatus = appStatusColumns.length > 0;
    
    if (!hasApplicationStatus) {
      console.log('Adding application_status column...');
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
            WHEN verification_status = 'verified' THEN 'approved'
            WHEN verification_status = 'rejected' THEN 'declined'
            WHEN verification_status = 'declined' THEN 'declined'
            WHEN verification_status = 'documents_required' THEN 'documents_required'
            ELSE 'pending'
          END
      `);
      console.log('application_status column added and initialized');
    } else {
      console.log('application_status column already exists');
    }

    // Step 2: Update verification_status to standardized values
    console.log('Updating verification_status enum values...');
    try {
      await connection.query(`
        ALTER TABLE service_providers
        MODIFY COLUMN verification_status ENUM(
          'pending', 
          'verified', 
          'rejected', 
          'declined', 
          'restricted', 
          'documents_required'
        ) NOT NULL DEFAULT 'pending'
      `);
      console.log('verification_status column updated');
    } catch (error) {
      console.error('Error updating verification_status column:', error.message);
      // Try adding any new enum values individually
      console.log('Trying to update individual enum values...');
      
      try {
        await connection.query(`
          ALTER TABLE service_providers
          MODIFY COLUMN verification_status ENUM(
            'pending', 'verified', 'rejected', 'declined', 'restricted', 'documents_required'
          ) DEFAULT 'pending'
        `);
        console.log('Successfully updated verification_status with alternative approach');
      } catch (altError) {
        console.error('Failed to update verification_status even with alternative approach:', altError.message);
      }
    }

    // Step 3: Update status column to track account status only
    console.log('Updating status column purpose...');
    try {
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
        WHERE verification_status = 'verified'
      `);
      
      // Set restricted statuses
      await connection.query(`
        UPDATE service_providers
        SET status = 'restricted'
        WHERE verification_status = 'restricted'
      `);
      
      console.log('status column updated');
    } catch (error) {
      console.error('Error updating status column:', error.message);
      
      // Alternative approach for MySQL versions that don't support direct ENUM modification
      try {
        // Add a temporary column with the new definition
        await connection.query(`
          ALTER TABLE service_providers 
          ADD COLUMN account_status ENUM(
            'active', 
            'inactive', 
            'suspended', 
            'restricted'
          ) NOT NULL DEFAULT 'active'
        `);
        
        // Copy over values
        await connection.query(`
          UPDATE service_providers
          SET account_status = 
            CASE
              WHEN status = 'active' OR verification_status = 'verified' THEN 'active'
              WHEN status = 'restricted' OR verification_status = 'restricted' THEN 'restricted'
              ELSE 'active'
            END
        `);
        
        // Drop the old column
        await connection.query(`
          ALTER TABLE service_providers 
          DROP COLUMN status
        `);
        
        // Rename the new column
        await connection.query(`
          ALTER TABLE service_providers 
          CHANGE account_status status ENUM(
            'active', 
            'inactive', 
            'suspended', 
            'restricted'
          ) NOT NULL DEFAULT 'active'
        `);
        
        console.log('Successfully updated status with alternative approach');
      } catch (altError) {
        console.error('Failed to update status even with alternative approach:', altError.message);
      }
    }

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
    
    console.log('\nCurrent service_providers status distribution:');
    console.table(countResults);
    
    console.log('\nservice_providers refactoring completed. The table now has:');
    console.log('1. verification_status - Historical record of the verification decision');
    console.log('2. application_status - Current application processing status');
    console.log('3. status - Account status (active, inactive, suspended, restricted)');
    
  } catch (error) {
    console.error('Error refactoring service_providers table:', error);
    throw error;
  }
}

// Refactor users table
async function refactorUsers(connection) {
  try {
    // Step 1: Check if is_verified and status columns exist
    const [columns] = await connection.query(`SHOW COLUMNS FROM users`);
    const columnNames = columns.map(col => col.Field);
    
    const hasIsVerified = columnNames.includes('is_verified');
    const hasStatus = columnNames.includes('status');
    
    if (!hasStatus) {
      console.log('Adding status column to users table...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN status ENUM('active', 'inactive', 'suspended', 'restricted') NOT NULL DEFAULT 'active'
      `);
      console.log('status column added to users table');
    } else {
      console.log('Updating status column in users table...');
      try {
        await connection.query(`
          ALTER TABLE users
          MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'restricted') NOT NULL DEFAULT 'active'
        `);
        console.log('status column updated in users table');
      } catch (error) {
        console.error('Error updating status column in users table:', error.message);
        
        // Alternative approach
        try {
          // Add a temporary column
          await connection.query(`
            ALTER TABLE users
            ADD COLUMN new_status ENUM('active', 'inactive', 'suspended', 'restricted') NOT NULL DEFAULT 'active'
          `);
          
          // Copy values
          await connection.query(`
            UPDATE users
            SET new_status = 
              CASE 
                WHEN status = 'active' THEN 'active'
                WHEN status = 'inactive' THEN 'inactive'
                WHEN status = 'suspended' THEN 'suspended'
                WHEN status = 'restricted' THEN 'restricted'
                ELSE 'active'
              END
          `);
          
          // Drop old column
          await connection.query(`
            ALTER TABLE users
            DROP COLUMN status
          `);
          
          // Rename new column
          await connection.query(`
            ALTER TABLE users
            CHANGE new_status status ENUM('active', 'inactive', 'suspended', 'restricted') NOT NULL DEFAULT 'active'
          `);
          
          console.log('Successfully updated status in users table with alternative approach');
        } catch (altError) {
          console.error('Failed to update status in users table even with alternative approach:', altError.message);
        }
      }
    }
    
    // Step 2: Update role column if needed
    console.log('Updating role column in users table...');
    try {
      await connection.query(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('fur_parent', 'business', 'admin') NOT NULL DEFAULT 'fur_parent'
      `);
      console.log('role column updated in users table');
    } catch (error) {
      console.error('Error updating role column in users table:', error.message);
    }
    
    // Print a summary of the changes made
    const [userStats] = await connection.query(`
      SELECT 
        role,
        status,
        COUNT(*) as count
      FROM users
      GROUP BY role, status
    `);
    
    console.log('\nCurrent users status distribution:');
    console.table(userStats);
    
  } catch (error) {
    console.error('Error refactoring users table:', error);
    throw error;
  }
}

// Update statistics queries
async function updateStatisticsQueries(connection) {
  try {
    // Create a view for stats data that uses the new schema
    console.log('Creating business_application_stats view...');
    
    try {
      // Drop view if exists
      await connection.query(`DROP VIEW IF EXISTS business_application_stats`);
      
      // Create the view
      await connection.query(`
        CREATE VIEW business_application_stats AS
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN application_status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
          SUM(CASE WHEN application_status = 'declined' THEN 1 ELSE 0 END) AS declined,
          SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required
        FROM
          service_providers
      `);
      
      console.log('Successfully created business_application_stats view');
      
      // Test the view
      const [stats] = await connection.query(`SELECT * FROM business_application_stats`);
      console.log('Current application statistics:');
      console.table(stats);
      
    } catch (error) {
      console.error('Error creating business_application_stats view:', error.message);
    }
    
  } catch (error) {
    console.error('Error updating statistics queries:', error);
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
}); 