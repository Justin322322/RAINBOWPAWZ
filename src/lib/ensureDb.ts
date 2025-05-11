import { query } from './db';

// Track if the database has been initialized
let isDbInitialized = false;

/**
 * This function ensures that the database is initialized properly
 * and verifies that all required tables exist. It will only
 * run the initialization once per server instance.
 */
export async function ensureDatabaseInitialized() {
  // Skip if already initialized during this server instance
  if (isDbInitialized) {
    return true;
  }

  try {
    console.log('Verifying database structures...');

    // Check if we can connect to the database
    const dbCheck = await query('SELECT 1 as test');
    if (!dbCheck) {
      console.error('Failed to connect to database');
      return false;
    }

    // Check for the existence of core tables
    const requiredTables = ['users', 'business_profiles', 'pets', 'password_reset_tokens'];
    let allTablesExist = true;

    // Get all tables in the database
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `) as any[];

    const existingTables = tablesResult.map(table =>
      table.table_name || table.TABLE_NAME
    );

    console.log('Existing tables:', existingTables);

    // Check which required tables don't exist
    const missingTables = requiredTables.filter(
      table => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables);
      allTablesExist = false;
    }

    // If all tables exist, mark as initialized
    if (allTablesExist) {
      isDbInitialized = true;
      return true;
    }

    // If tables are missing, try to run the initialization
    console.log('Running database initialization...');

    // Execute database schema based on missing tables
    if (missingTables.includes('users')) {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
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
      console.log('Users table created');
    }

    if (missingTables.includes('business_profiles')) {
      await query(`
        CREATE TABLE IF NOT EXISTS business_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          business_name VARCHAR(100) NOT NULL,
          business_type VARCHAR(50) NOT NULL,
          contact_first_name VARCHAR(50) NOT NULL,
          contact_last_name VARCHAR(50) NOT NULL,
          business_phone VARCHAR(20) NOT NULL,
          business_address TEXT NOT NULL,
          province VARCHAR(50),
          city VARCHAR(50),
          zip VARCHAR(20),
          business_hours TEXT,
          service_description TEXT,
          verification_status VARCHAR(20) DEFAULT 'pending',
          verification_date TIMESTAMP NULL,
          verification_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Business profiles table created');
    }

    if (missingTables.includes('pets')) {
      await query(`
        CREATE TABLE IF NOT EXISTS pets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          species VARCHAR(50) NOT NULL,
          breed VARCHAR(50),
          age INT,
          gender VARCHAR(20),
          weight DECIMAL(5,2),
          photo_path VARCHAR(255),
          special_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Pets table created');
    }

    // Create password_reset_tokens table if it doesn't exist
    if (missingTables.includes('password_reset_tokens')) {
      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          UNIQUE KEY unique_token (token),
          INDEX idx_user_id (user_id),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_used (is_used),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Password reset tokens table created');
    }

    isDbInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}