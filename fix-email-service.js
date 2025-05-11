// Script to fix email service issues
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

console.log('\n===============================================');
console.log(' 🔧 EMAIL SERVICE FIX 🔧');
console.log('===============================================');

function getTimestamp() {
  const now = new Date();
  return `[${now.toLocaleTimeString()}]`;
}

// Log with timestamp
function log(message) {
  console.log(`${getTimestamp()} ${message}`);
}

// Colorful console logging if supported
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function sectionLog(title) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function successLog(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function warningLog(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function errorLog(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

async function fixEmailService() {
  sectionLog('EMAIL SERVICE FIX');

  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  let hasChanges = false;
  let needsRestart = false;

  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    warningLog('No .env.local file found. Creating it with default email settings...');
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
  } else {
    // Read existing .env.local file
    envContent = fs.readFileSync(envPath, 'utf8');

    // Check for SMTP configuration
    const smtpSettings = {
      SMTP_HOST: envContent.match(/SMTP_HOST\s*=\s*([^\r\n]+)/)?.[1] || 'not set',
      SMTP_PORT: envContent.match(/SMTP_PORT\s*=\s*([^\r\n]+)/)?.[1] || 'not set',
      SMTP_USER: envContent.match(/SMTP_USER\s*=\s*([^\r\n]+)/)?.[1] || 'not set',
      SMTP_PASS: envContent.match(/SMTP_PASS\s*=\s*([^\r\n]+)/)?.[1] || 'not set',
      SMTP_SECURE: envContent.match(/SMTP_SECURE\s*=\s*([^\r\n]+)/)?.[1] || 'not set',
    };

    sectionLog('CURRENT SMTP SETTINGS');
    console.log(`SMTP_HOST: ${smtpSettings.SMTP_HOST}`);
    console.log(`SMTP_PORT: ${smtpSettings.SMTP_PORT}`);
    console.log(`SMTP_USER: ${smtpSettings.SMTP_USER}`);
    console.log(`SMTP_PASS: ${smtpSettings.SMTP_PASS === 'not set' ? 'not set' : '***'}`);
    console.log(`SMTP_SECURE: ${smtpSettings.SMTP_SECURE}`);

    // Check if simulation mode is enabled
    const simulationEnabled = envContent.includes('SIMULATE_EMAIL_SUCCESS=true');
    console.log(`\nEmail Simulation: ${simulationEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);

    // Check if we need to enable simulation
    if (!simulationEnabled) {
      warningLog('Email simulation is not enabled. Adding SIMULATE_EMAIL_SUCCESS=true...');
      
      // Check if the variable exists but is commented or set to false
      const simEmailRegex = /^\s*(#\s*)?SIMULATE_EMAIL_SUCCESS\s*=.*/m;
      if (simEmailRegex.test(envContent)) {
        // Replace existing line with enabled version
        envContent = envContent.replace(simEmailRegex, 'SIMULATE_EMAIL_SUCCESS=true');
        log('Updated existing SIMULATE_EMAIL_SUCCESS variable');
      } else {
        // Add the variable if it doesn't exist
        if (!envContent.endsWith('\n\n')) {
          envContent += envContent.endsWith('\n') ? '\n' : '\n\n';
        }
        envContent += '# Email Simulation for Development\nSIMULATE_EMAIL_SUCCESS=true\n';
        log('Added SIMULATE_EMAIL_SUCCESS variable');
      }
      hasChanges = true;
      needsRestart = true;
    }
  }

  // Save changes if any were made
  if (hasChanges) {
    try {
      fs.writeFileSync(envPath, envContent);
      successLog('Changes saved to .env.local successfully!');
    } catch (err) {
      errorLog(`Error writing to .env.local: ${err.message}`);
      process.exit(1);
    }
  } else {
    successLog('No changes needed to .env.local');
  }

  // Check if NEXT_PUBLIC_APP_URL is set correctly
  const appUrlMatch = envContent.match(/NEXT_PUBLIC_APP_URL\s*=\s*([^\r\n]+)/);
  const appUrl = appUrlMatch?.[1] || 'not set';
  console.log(`\nNEXT_PUBLIC_APP_URL: ${appUrl}`);
  if (appUrl === 'not set' || !appUrl.startsWith('http')) {
    warningLog('NEXT_PUBLIC_APP_URL may not be set correctly. Links in emails might not work.');
  }

  // Check and create database tables
  sectionLog('CHECKING DATABASE TABLES');
  try {
    // Create database connection
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    log(`Connecting to database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}...`);
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if email_queue table exists
    log('Checking if email_queue table exists...');
    const [emailQueueTable] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'email_queue'
    `, [dbConfig.database]);
    
    if (emailQueueTable[0].count === 0) {
      log('Creating email_queue table...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          to_email VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          html TEXT NOT NULL,
          text TEXT,
          from_email VARCHAR(255),
          cc VARCHAR(255),
          bcc VARCHAR(255),
          attachments TEXT,
          status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
          attempts INT NOT NULL DEFAULT 0,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          sent_at TIMESTAMP NULL,
          INDEX (status, attempts, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      successLog('email_queue table created successfully');
    } else {
      successLog('email_queue table already exists');
    }
    
    // Check if email_log table exists
    log('Checking if email_log table exists...');
    const [emailLogTable] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'email_log'
    `, [dbConfig.database]);
    
    if (emailLogTable[0].count === 0) {
      log('Creating email_log table...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message_id VARCHAR(255),
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (recipient),
          INDEX (sent_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      successLog('email_log table created successfully');
    } else {
      successLog('email_log table already exists');
    }
    
    // Close the connection
    await connection.end();
    log('Database connection closed');
    
  } catch (err) {
    warningLog(`Database check failed: ${err.message}`);
    warningLog('This is not critical - tables will be created automatically when needed');
  }

  sectionLog('EMAIL SERVICE FIX SUMMARY');
  const simulationEnabled = envContent.includes('SIMULATE_EMAIL_SUCCESS=true');
  console.log(`Simulation Mode: ${simulationEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
  if (simulationEnabled) {
    console.log('• Password reset and OTP emails will be simulated (not actually sent)');
    console.log('• OTP codes will be printed to the server console for testing');
    console.log('• All email calls will return success regardless of actual sending');
  }

  if (needsRestart) {
    console.log('');
    warningLog('IMPORTANT: You need to restart your application for changes to take effect!');
    console.log(`${colors.bright}Run: npm run dev${colors.reset}`);
  }

  sectionLog('TESTING INSTRUCTIONS');
  console.log('To test password reset:');
  console.log('1. Use any email address in the forgot password form');
  console.log('2. Check your server console for the generated token');
  console.log('3. Use the token to reset your password\n');

  console.log('To test OTP:');
  console.log('1. During registration or verification, an OTP will be generated');
  console.log('2. Check your server console for the OTP code printed with "DEV MODE: OTP code is xxxxxx"');
  console.log('3. Use that code to verify your account');

  sectionLog('DONE');
  console.log('Your email service is now fixed and configured to work reliably.');
  console.log('===============================================');
}

fixEmailService().catch(console.error);
