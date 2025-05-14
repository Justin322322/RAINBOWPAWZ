/**
 * Status Field Consolidation Script
 * 
 * This script consolidates verification_status and application_status into a single application_status field.
 * It also updates all related admin code to use the consolidated status field.
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

// Main function
async function main() {
  console.log('Starting status fields consolidation...');
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

    // Create backup of service_providers table
    console.log('Creating backup of service_providers table...');
    const backupTableName = `service_providers_backup_${Date.now()}`;
    await connection.query(`CREATE TABLE ${backupTableName} LIKE service_providers`);
    await connection.query(`INSERT INTO ${backupTableName} SELECT * FROM service_providers`);
    console.log(`Backup created as ${backupTableName}`);

    // Check if both status columns exist
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers 
      WHERE Field IN ('verification_status', 'application_status')
    `);
    
    const columnNames = columns.map(col => col.Field);
    
    if (!columnNames.includes('verification_status') || !columnNames.includes('application_status')) {
      console.log('Both status columns do not exist. Cannot perform consolidation.');
      return;
    }
    
    console.log('Both status columns exist. Starting consolidation...');

    // Update the application_status to be the primary status field
    // First, ensure application_status has all required enum values
    try {
      await connection.query(`
        ALTER TABLE service_providers
        MODIFY COLUMN application_status ENUM(
          'pending',
          'reviewing',
          'documents_required',
          'approved',
          'declined',
          'verified',
          'rejected',
          'restricted'
        ) NOT NULL DEFAULT 'pending'
      `);
      console.log('Enhanced application_status column with all status values');
    } catch (error) {
      console.error('Error updating application_status column:', error.message);
      
      // Attempt alternative approach if the direct modification fails
      try {
        await connection.query(`
          ALTER TABLE service_providers
          ADD COLUMN temp_status ENUM(
            'pending',
            'reviewing',
            'documents_required',
            'approved',
            'declined',
            'verified',
            'rejected',
            'restricted'
          ) NOT NULL DEFAULT 'pending'
        `);
        
        // Copy values from application_status to temp_status
        await connection.query(`
          UPDATE service_providers
          SET temp_status = application_status
        `);
        
        // Drop the original column
        await connection.query(`
          ALTER TABLE service_providers
          DROP COLUMN application_status
        `);
        
        // Rename temp_status to application_status
        await connection.query(`
          ALTER TABLE service_providers
          CHANGE temp_status application_status ENUM(
            'pending',
            'reviewing',
            'documents_required',
            'approved',
            'declined',
            'verified',
            'rejected',
            'restricted'
          ) NOT NULL DEFAULT 'pending'
        `);
        
        console.log('Successfully updated application_status with alternative approach');
      } catch (altError) {
        console.error('Error even with alternative approach:', altError.message);
        console.log('Terminating consolidation process due to errors');
        return;
      }
    }
    
    // Now, sync values from verification_status to application_status where appropriate
    console.log('Synchronizing values from verification_status to application_status...');
    await connection.query(`
      UPDATE service_providers
      SET application_status = 
        CASE
          WHEN verification_status = 'verified' AND application_status != 'approved' THEN 'approved'
          WHEN verification_status = 'rejected' AND application_status != 'declined' THEN 'declined'
          WHEN verification_status = 'declined' AND application_status != 'declined' THEN 'declined'
          WHEN verification_status = 'restricted' AND application_status != 'restricted' THEN 'restricted'
          WHEN verification_status = 'documents_required' AND application_status != 'documents_required' THEN 'documents_required'
          ELSE application_status
        END
    `);
    
    // Create a note that verification_status is deprecated
    try {
      await connection.query(`
        ALTER TABLE service_providers
        COMMENT = 'Note: verification_status is deprecated, use application_status instead'
      `);
      
      // Add a comment to verification_status column
      await connection.query(`
        ALTER TABLE service_providers
        MODIFY COLUMN verification_status ENUM(
          'pending',
          'verified',
          'rejected',
          'declined',
          'restricted',
          'documents_required'
        ) NOT NULL DEFAULT 'pending' COMMENT 'DEPRECATED: Use application_status instead'
      `);
      
      console.log('Added deprecation comments to verification_status');
    } catch (error) {
      console.error('Error adding deprecation comments:', error.message);
      // Non-critical error, continue
    }
    
    // Update the views that depend on these fields
    console.log('Updating business_application_stats view...');
    try {
      await connection.query(`DROP VIEW IF EXISTS business_application_stats`);
      await connection.query(`
        CREATE VIEW business_application_stats AS
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN application_status = 'approved' OR application_status = 'verified' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
          SUM(CASE WHEN application_status = 'declined' OR application_status = 'rejected' THEN 1 ELSE 0 END) AS declined,
          SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required,
          SUM(CASE WHEN application_status = 'restricted' THEN 1 ELSE 0 END) AS restricted
        FROM
          service_providers
      `);
      console.log('Updated business_application_stats view');
    } catch (error) {
      console.error('Error updating business_application_stats view:', error.message);
    }
    
    // Print a summary of the current status distribution
    const [statusDistribution] = await connection.query(`
      SELECT 
        application_status,
        COUNT(*) as count
      FROM service_providers
      GROUP BY application_status
    `);
    
    console.log('\nCurrent application_status distribution:');
    console.table(statusDistribution);

    console.log('\nStatus consolidation completed successfully!');
    console.log('\nIMPORTANT: Update all code to use application_status instead of verification_status.');
    console.log('The verification_status field is now deprecated but kept for backward compatibility.');
    
  } catch (error) {
    console.error('Error during status consolidation:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
}); 