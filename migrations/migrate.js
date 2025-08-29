#!/usr/bin/env node

/**
 * Database Migration Runner
 * Safely executes database migrations with rollback capability
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5,
  acquireTimeoutMillis: 60000,
  connectTimeout: 60000,
};

async function createMigrationHistoryTable(connection) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migration_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      rollback_sql TEXT,
      checksum VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `;

  await connection.execute(createTableSQL);
  console.log('✓ Migration history table ready');
}

async function getExecutedMigrations(connection) {
  const [rows] = await connection.execute(
    'SELECT migration_name, checksum FROM migration_history WHERE success = TRUE ORDER BY executed_at ASC'
  );
  return rows;
}

async function calculateFileChecksum(filePath) {
  const crypto = require('crypto');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

async function executeMigration(connection, migrationFile) {
  const filePath = path.join(__dirname, migrationFile);
  const migrationName = path.basename(migrationFile, '.sql');

  console.log(`\n📄 Executing migration: ${migrationName}`);

  // Check if migration already executed
  const [existing] = await connection.execute(
    'SELECT id, checksum FROM migration_history WHERE migration_name = ?',
    [migrationName]
  );

  const currentChecksum = await calculateFileChecksum(filePath);

  if (existing.length > 0) {
    const existingChecksum = existing[0].checksum;
    if (existingChecksum === currentChecksum) {
      console.log(`  ⏭️  Migration already executed (same checksum)`);
      return true;
    } else {
      console.log(`  ⚠️  Migration checksum changed!`);
      console.log(`     Existing: ${existingChecksum.substring(0, 16)}...`);
      console.log(`     Current:  ${currentChecksum.substring(0, 16)}...`);
      return false;
    }
  }

  // Read and execute migration
  const migrationSQL = fs.readFileSync(filePath, 'utf8');

  // Split SQL into individual statements (basic approach)
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  const connectionForMigration = await connection.getConnection();

  try {
    await connectionForMigration.beginTransaction();

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await connectionForMigration.execute(statement);
      }
    }

    // Record successful migration
    await connectionForMigration.execute(
      'INSERT INTO migration_history (migration_name, success, checksum) VALUES (?, TRUE, ?)',
      [migrationName, currentChecksum]
    );

    await connectionForMigration.commit();
    console.log(`  ✅ Migration completed successfully`);
    return true;

  } catch (error) {
    await connectionForMigration.rollback();

    // Record failed migration
    await connection.execute(
      'INSERT INTO migration_history (migration_name, success, error_message, checksum) VALUES (?, FALSE, ?, ?)',
      [migrationName, error.message, currentChecksum]
    );

    console.error(`  ❌ Migration failed: ${error.message}`);
    return false;
  } finally {
    connectionForMigration.release();
  }
}

async function checkForEmailDuplicates(connection) {
  console.log('\n🔍 Checking for email duplicates...');

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
    console.log('\n⚠️  WARNING: Found email duplicates that must be resolved before migration:');
    duplicates.forEach((dup, index) => {
      console.log(`  ${index + 1}. ${dup.normalized_email} (${dup.count} duplicates): ${dup.original_emails}`);
    });
    console.log('\n📋 Please resolve these duplicates by:');
    console.log('   1. Updating one of the emails to a different address');
    console.log('   2. Deleting duplicate accounts (keeping only one)');
    console.log('   3. Merging duplicate accounts');
    console.log('\n❌ Migration cannot proceed until duplicates are resolved.');
    return false;
  } else {
    console.log('  ✅ No email duplicates found');
    return true;
  }
}

async function main() {
  console.log('🚀 Starting database migration process...\n');

  let connection;

  try {
    // Create connection pool
    const pool = mysql.createPool(dbConfig);
    connection = pool;

    // Create migration history table
    await createMigrationHistoryTable(connection);

    // Get list of migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql') && file !== 'rollback.sql')
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    console.log(`📂 Found ${migrationFiles.length} migration file(s)`);

    // Check for email duplicates before running migrations
    const noDuplicates = await checkForEmailDuplicates(connection);
    if (!noDuplicates) {
      process.exit(1);
    }

    // Execute migrations
    let successCount = 0;
    let failureCount = 0;

    for (const migrationFile of migrationFiles) {
      const success = await executeMigration(connection, migrationFile);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📁 Total: ${migrationFiles.length}`);

    if (failureCount > 0) {
      console.log('\n❌ Some migrations failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All migrations completed successfully!');
    }

  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, executeMigration, checkForEmailDuplicates };
