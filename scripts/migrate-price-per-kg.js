#!/usr/bin/env node

/**
 * Migration Script: Add Price Per Kg
 * Adds price_per_kg column to service_packages table
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting price per kg migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Add price_per_kg column to service_packages table
    console.log('📝 Adding price_per_kg column to service_packages table...');
    
    try {
      await connection.execute(`
        ALTER TABLE service_packages 
        ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 0 AFTER price
      `);
      console.log('  ✅ price_per_kg column added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('  ℹ️  price_per_kg column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  • Added price_per_kg column to service_packages table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
