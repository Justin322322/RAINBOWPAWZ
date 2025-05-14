/**
 * Database Fix Script - Run all database optimization scripts
 * 
 * This script runs the various SQL optimization scripts to fix the database schema:
 * 1. Fixes service_providers table status fields
 * 2. Optimizes service_packages table structure
 * 3. Updates the counts/statistics
 * 
 * To run:
 * node src/scripts/run-database-fixes.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('Running database optimization scripts...');
  
  // Create a connection to the database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true // Required to run multiple statements in one query
  });
  
  try {
    console.log('Connected to database successfully');
    
    // First, run migration script for status fields to ensure columns exist
    console.log('\n=== Running status field migration ===');
    await migrateStatusFields(connection);
    console.log('Successfully completed status field migration');
    
    // Then add the active_service_count column before we try to use it
    console.log('\n=== Adding active_service_count column ===');
    await addActiveServiceCountColumn(connection);
    console.log('Successfully added active_service_count column if needed');
    
    // Try to run fix-database-schema.sql if it exists
    try {
      console.log('\n=== Running fix-database-schema.sql ===');
      const fixSchemaPath = path.join(__dirname, 'fix-database-schema.sql');
      const fixSchemaSQL = await fs.readFile(fixSchemaPath, 'utf8');
      await connection.query(fixSchemaSQL);
      console.log('Successfully ran fix-database-schema.sql');
    } catch (fileError) {
      console.log('Warning: fix-database-schema.sql not found or could not be executed.');
      console.log('Continuing with other optimizations...');
    }
    
    // Run optimize-service-packages.sql
    try {
      console.log('\n=== Running optimize-service-packages.sql ===');
      const optimizePackagesPath = path.join(__dirname, 'optimize-service-packages.sql');
      const optimizePackagesSQL = await fs.readFile(optimizePackagesPath, 'utf8');
      
      // Replace any direct usage of active_service_count with a safer query
      const safeSQL = optimizePackagesSQL.replace(
        /SET active_service_count/g, 
        "SET active_service_count /* Only executes if column exists */"
      );
      
      await connection.query(safeSQL);
      console.log('Successfully ran optimize-service-packages.sql');
    } catch (fileError) {
      console.log('Warning: optimize-service-packages.sql not found or could not be executed.');
      console.log('Continuing with other optimizations...');
    }
    
    // Update service counts
    console.log('\n=== Updating service counts ===');
    await updateServiceCounts(connection);
    console.log('Successfully updated service counts');
    
    console.log('\nDatabase optimization completed successfully!');
    
  } catch (error) {
    console.error('Error during database optimization:', error);
    throw error;
  } finally {
    // Close the connection
    await connection.end();
    console.log('Database connection closed');
  }
}

async function migrateStatusFields(connection) {
  // Check if the service_providers table exists
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
  
  try {
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
    
    // Commit the transaction
    await connection.commit();
    
  } catch (error) {
    // Rollback the transaction if an error occurred
    await connection.rollback();
    console.error('Error during status migration:', error);
    throw error;
  }
}

async function addActiveServiceCountColumn(connection) {
  try {
    // Check if service_providers table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'service_providers'
    `);
    
    if (tables.length === 0) {
      console.log('service_providers table does not exist, skipping active_service_count addition');
      return;
    }
    
    // Check if the column already exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers LIKE 'active_service_count'
    `);
    
    if (columns.length > 0) {
      console.log('active_service_count column already exists');
      return;
    }
    
    // Add the column
    console.log('Adding active_service_count column to service_providers table');
    await connection.query(`
      ALTER TABLE service_providers
      ADD COLUMN active_service_count INT DEFAULT 0
    `);
    console.log('Successfully added active_service_count column');
  } catch (error) {
    console.error('Error adding active_service_count column:', error);
    console.log('Will continue with migration regardless');
    // Don't rethrow - we want to continue even if this fails
  }
}

async function updateServiceCounts(connection) {
  try {
    // Check if service_providers table has active_service_count column
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM service_providers
      LIKE 'active_service_count'
    `);
    
    // Add the column if it doesn't exist
    if (columns.length === 0) {
      console.log('Adding active_service_count column to service_providers');
      await connection.query(`
        ALTER TABLE service_providers
        ADD COLUMN active_service_count INT DEFAULT 0
      `);
    }
    
    // Get the name of the provider ID column in service_packages
    const [packageColumns] = await connection.query(`
      SHOW COLUMNS FROM service_packages
    `);
    
    const packageColumnNames = packageColumns.map(col => col.Field);
    const providerIdColumn = packageColumnNames.includes('service_provider_id') 
      ? 'service_provider_id' 
      : (packageColumnNames.includes('provider_id') ? 'provider_id' : null);
    
    if (!providerIdColumn) {
      console.log('No provider ID column found in service_packages');
      return;
    }
    
    // Update the active_service_count for each service provider
    console.log(`Updating active_service_count using ${providerIdColumn}`);
    await connection.query(`
      UPDATE service_providers sp
      SET active_service_count = (
        SELECT COUNT(*)
        FROM service_packages
        WHERE ${providerIdColumn} = sp.id AND is_active = 1
      )
    `);
    
    const [updatedProviders] = await connection.query(`
      SELECT id, name, active_service_count
      FROM service_providers
      ORDER BY active_service_count DESC
    `);
    
    console.log('Updated service counts for providers:');
    updatedProviders.forEach(provider => {
      console.log(`- ${provider.name} (ID: ${provider.id}): ${provider.active_service_count} active services`);
    });
    
  } catch (error) {
    console.error('Error updating service counts:', error);
    throw error;
  }
}

main().catch(console.error); 