#!/usr/bin/env node

/**
 * Migration Script: Add Size Pricing to Bookings
 * Adds columns to the bookings table to support pet size-based pricing
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
    console.log('🚀 Starting bookings size pricing migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Add columns to bookings table
    console.log('📝 Adding size pricing columns to bookings table...');
    
    const alterStatements = [
      'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selected_size_category VARCHAR(50) NULL',
      'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selected_size_price DECIMAL(10,2) NULL',
      'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS has_size_pricing TINYINT(1) DEFAULT 0',
      'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pet_weight DECIMAL(8,2) NULL'
    ];
    
    for (const statement of alterStatements) {
      try {
        await connection.execute(statement);
        console.log(`  ✅ ${statement.split(' ')[5]} column added successfully`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`  ℹ️  ${statement.split(' ')[5]} column already exists`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  • Added selected_size_category column to bookings table');
    console.log('  • Added selected_size_price column to bookings table');
    console.log('  • Added has_size_pricing column to bookings table');
    console.log('  • Added pet_weight column to bookings table');
    
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
