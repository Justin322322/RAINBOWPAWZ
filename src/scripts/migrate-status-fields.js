/**
 * Database Migration Script - service_providers table status fields
 * 
 * This script consolidates verification_status and application_status fields in service_providers
 * table and removes the redundant status field.
 * 
 * To run:
 * node src/scripts/migrate-status-fields.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('Running service_providers status field migration script...');
  
  // Create a connection to the database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: parseInt(process.env.DB_PORT || '3306')
  });
  
  try {
    console.log('Connected to database successfully');
    
    // First, check if the service_providers table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'service_providers'
    `);
    
    if (tables.length === 0) {
      console.error('service_providers table does not exist');
      return;
    }
    
    // Check which columns exist
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers
    `);
    
    const columnNames = columns.map(col => col.Field);
    
    // Check if we need to perform the migration
    const hasVerificationStatus = columnNames.includes('verification_status');
    const hasApplicationStatus = columnNames.includes('application_status');
    const hasStatus = columnNames.includes('status');
    
    console.log('Column check:', {
      hasVerificationStatus,
      hasApplicationStatus,
      hasStatus
    });
    
    // If no verification_status or application_status, we can't proceed
    if (!hasVerificationStatus && !hasApplicationStatus) {
      console.error('Neither verification_status nor application_status column exists');
      return;
    }
    
    // Start a transaction
    await connection.beginTransaction();
    
    // 1. If application_status doesn't exist, create it
    if (!hasApplicationStatus) {
      console.log('Creating application_status column');
      await connection.query(`
        ALTER TABLE service_providers 
        ADD COLUMN application_status ENUM(
          'pending', 'reviewing', 'documents_required',
          'approved', 'declined', 'verified', 'rejected', 'restricted'
        ) NOT NULL DEFAULT 'pending'
      `);
    }
    
    // 2. If both columns exist, migrate verification_status to application_status
    if (hasVerificationStatus && hasApplicationStatus) {
      console.log('Migrating verification_status values to application_status');
      
      // Get all records where verification_status and application_status might differ
      const [records] = await connection.query(`
        SELECT id, verification_status, application_status 
        FROM service_providers
        WHERE verification_status IS NOT NULL
      `);
      
      console.log(`Found ${records.length} records to check`);
      
      // Map the old values to new values
      const statusMap = {
        'pending': 'pending',
        'verified': 'verified',
        'rejected': 'declined',
        'restricted': 'restricted',
        'declined': 'declined'
      };
      
      // Update each record where needed
      for (const record of records) {
        const oldStatus = record.verification_status;
        const newStatus = statusMap[oldStatus] || 'pending';
        
        // Only update if current application_status is empty or different
        if (!record.application_status || record.application_status === 'pending') {
          console.log(`Updating record ${record.id}: ${oldStatus} -> ${newStatus}`);
          await connection.query(`
            UPDATE service_providers
            SET application_status = ?
            WHERE id = ?
          `, [newStatus, record.id]);
        }
      }
    }
    
    // 3. If status column exists, drop it (it's redundant)
    if (hasStatus) {
      console.log('Removing redundant status column');
      await connection.query(`
        ALTER TABLE service_providers
        DROP COLUMN status
      `);
    }
    
    // 4. If verification_status exists, we can optionally drop it or keep it for backward compatibility
    // Here we'll keep it for now but add a comment that it's deprecated
    if (hasVerificationStatus) {
      console.log('Marking verification_status as deprecated');
      // First add the COMMENT if it doesn't already have one
      await connection.query(`
        ALTER TABLE service_providers
        MODIFY COLUMN verification_status 
        ENUM('pending','verified','rejected','restricted','declined','documents_required')
        DEFAULT 'pending'
        COMMENT 'DEPRECATED: Use application_status instead'
      `);
    }
    
    // Commit the transaction
    await connection.commit();
    console.log('Migration completed successfully');
    
  } catch (error) {
    // Rollback the transaction if an error occurred
    await connection.rollback();
    console.error('Error during migration:', error);
  } finally {
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
  }
}

main().catch(console.error); 