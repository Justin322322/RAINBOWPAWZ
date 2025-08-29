#!/usr/bin/env node

/**
 * Simple Migration Runner
 * Execute the email normalization migration
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🚀 Running email normalization migration...\n');

  // Database configuration - using same config as the project
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: process.env.DB_PORT || 3306,
    connectTimeout: 60000,
  };

  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('📄 Database connection established');

    // Read the migration file
    const migrationPath = path.join(__dirname, '001_add_case_insensitive_email_index.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('🔍 Checking for email duplicates...\n');

    // First, check for existing duplicates
    const [duplicates] = await connection.execute(`
      SELECT
        LOWER(email) as normalized_email,
        COUNT(*) as count,
        GROUP_CONCAT(email SEPARATOR ', ') as original_emails
      FROM users
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Found email duplicates that must be resolved:');
      duplicates.forEach((dup, index) => {
        console.log(`  ${index + 1}. ${dup.normalized_email} (${dup.count} duplicates): ${dup.original_emails}`);
      });
      console.log('\n❌ Migration cannot proceed until duplicates are resolved.');
      console.log('Please resolve duplicates manually before running this migration.');
      process.exit(1);
    }

    console.log('✅ No email duplicates found\n');
    console.log('🔧 Applying database changes...\n');

    // Split the migration SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    let failedCount = 0;

    for (const statement of statements) {
      if (!statement.trim()) continue;

      try {
        console.log(`Executing: ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
        await connection.execute(statement);
        executedCount++;
        console.log('  ✅ Success\n');
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
        failedCount++;
      }
    }

    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful statements: ${executedCount}`);
    console.log(`   ❌ Failed statements: ${failedCount}`);
    console.log(`   📁 Total statements: ${statements.length}`);

    if (failedCount > 0) {
      console.log('\n❌ Some statements failed. Please review the errors above.');
      process.exit(1);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 What was changed:');
    console.log('  • Dropped existing case-sensitive email unique constraint');
    console.log('  • Created case-insensitive unique index on LOWER(email)');
    console.log('  • Added normalized email index for efficient lookups');
    console.log('  • Updated composite index to use normalized email');
    console.log('\n🔄 Application code has been updated to use LOWER(email) for lookups');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
