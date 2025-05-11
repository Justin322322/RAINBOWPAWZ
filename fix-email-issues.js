// Script to fix email issues
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

console.log('\n===============================================');
console.log(' 🔧 EMAIL ISSUES FIX 🔧');
console.log('===============================================');

async function fixEmailIssues() {
  try {
    // 1. Check and update environment variables
    console.log('\n=== CHECKING ENVIRONMENT VARIABLES ===');
    const envPath = path.join(__dirname, '.env.local');
    let envContent = '';
    let hasChanges = false;

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('Found .env.local file');
    } else {
      console.log('Creating .env.local file with default settings');
      envContent = `# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws
DB_PORT=3306

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email Simulation for Development
SIMULATE_EMAIL_SUCCESS=true
`;
      hasChanges = true;
    }

    // Ensure SIMULATE_EMAIL_SUCCESS is set to true
    if (!envContent.includes('SIMULATE_EMAIL_SUCCESS=true')) {
      console.log('Setting SIMULATE_EMAIL_SUCCESS=true');
      
      // Check if the variable exists but is set to false
      if (envContent.includes('SIMULATE_EMAIL_SUCCESS=false')) {
        envContent = envContent.replace('SIMULATE_EMAIL_SUCCESS=false', 'SIMULATE_EMAIL_SUCCESS=true');
      } 
      // Check if it's commented out
      else if (envContent.includes('#SIMULATE_EMAIL_SUCCESS')) {
        envContent = envContent.replace(/#\s*SIMULATE_EMAIL_SUCCESS.*/, 'SIMULATE_EMAIL_SUCCESS=true');
      }
      // Otherwise add it
      else if (!envContent.includes('SIMULATE_EMAIL_SUCCESS')) {
        envContent += '\n# Email Simulation for Development\nSIMULATE_EMAIL_SUCCESS=true\n';
      }
      
      hasChanges = true;
    } else {
      console.log('SIMULATE_EMAIL_SUCCESS is already set to true');
    }

    // Save changes if needed
    if (hasChanges) {
      fs.writeFileSync(envPath, envContent);
      console.log('Updated .env.local file');
    }

    // 2. Check database tables
    console.log('\n=== CHECKING DATABASE TABLES ===');
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    console.log(`Connecting to database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}...`);
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if password_reset_tokens table exists
    console.log('Checking password_reset_tokens table...');
    const [resetTokensTable] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
    );

    if (resetTokensTable[0].count === 0) {
      console.log('Creating password_reset_tokens table...');
      await connection.execute(`
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
    } else {
      console.log('Password reset tokens table exists');
    }

    // Check if otp_codes table exists
    console.log('Checking otp_codes table...');
    const [otpCodesTable] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'otp_codes'`
    );

    if (otpCodesTable[0].count === 0) {
      console.log('Creating otp_codes table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          INDEX idx_user_id (user_id),
          INDEX idx_otp_code (otp_code),
          INDEX idx_expires_at (expires_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('OTP codes table created');
    } else {
      console.log('OTP codes table exists');
    }

    // Check if otp_attempts table exists
    console.log('Checking otp_attempts table...');
    const [otpAttemptsTable] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'otp_attempts'`
    );

    if (otpAttemptsTable[0].count === 0) {
      console.log('Creating otp_attempts table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS otp_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          attempt_type ENUM('generate', 'verify') NOT NULL,
          ip_address VARCHAR(45),
          attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_attempt_time (attempt_time),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('OTP attempts table created');
    } else {
      console.log('OTP attempts table exists');
    }

    // Close database connection
    await connection.end();
    console.log('Database connection closed');

    // 3. Summary and instructions
    console.log('\n=== SUMMARY ===');
    console.log('✅ Environment variables checked and updated');
    console.log('✅ Database tables checked and created if needed');
    console.log('\n=== INSTRUCTIONS ===');
    console.log('1. Restart your application for changes to take effect');
    console.log('2. For password reset testing:');
    console.log('   - Use a valid email that exists in your database');
    console.log('   - Check the console for the reset token and link');
    console.log('3. For OTP testing:');
    console.log('   - Check the console for the OTP code');
    console.log('4. If you still have issues:');
    console.log('   - Run `node test-password-reset.js` to test password reset');
    console.log('   - Run `node test-simple-email.js` to test email sending');
    console.log('\n===============================================');

  } catch (error) {
    console.error('Error fixing email issues:', error);
  }
}

fixEmailIssues();
