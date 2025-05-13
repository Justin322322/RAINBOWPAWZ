/**
 * Production Startup Script for Rainbow Paws
 * This script starts the application in production mode
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// IMPORTANT CONFIGURATION - MODIFY THESE VALUES IF NEEDED
const MYSQL_PORT = 3306;
// Use port 3001 as default to avoid conflicts with port 3000
const DEFAULT_SERVER_PORT = process.env.PORT || 3001;

console.log('🚀 Starting Rainbow Paws in PRODUCTION mode');

// Get port from command line argument or use default
const port = process.argv[2] || process.env.PORT || DEFAULT_SERVER_PORT;

// Load environment variables from .env.local if it exists
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment from .env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
  } else {
    console.log('No .env.local file found, creating one with default values');
    const defaultEnv = `PORT=${port}\nHOST=0.0.0.0\nNEXT_PUBLIC_APP_URL=http://localhost:${port}\nDB_PORT=${MYSQL_PORT}`;
    fs.writeFileSync(envPath, defaultEnv);
  }
} catch (error) {
  console.warn('Warning: Could not load/create .env.local file', error.message);
}

// Update the .env.local file with correct production settings
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');

    // Update PORT for web server
    if (envContent.includes('PORT=')) {
      envContent = envContent.replace(/PORT=\d+/, `PORT=${port}`);
    } else {
      envContent += `\nPORT=${port}`;
    }

    // Set HOST to listen on all interfaces
    if (envContent.includes('HOST=')) {
      envContent = envContent.replace(/HOST=.*/, 'HOST=0.0.0.0');
    } else {
      envContent += `\nHOST=0.0.0.0`;
    }

    // Update DB_PORT to always use MySQL port
    if (envContent.includes('DB_PORT=')) {
      envContent = envContent.replace(/DB_PORT=\d+/, `DB_PORT=${MYSQL_PORT}`);
    } else {
      envContent += `\nDB_PORT=${MYSQL_PORT}`;
    }

    // Update app URL
    if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_APP_URL=.*/,
        `NEXT_PUBLIC_APP_URL=http://localhost:${port}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_APP_URL=http://localhost:${port}`;
    }

    // Set NODE_ENV to production
    if (envContent.includes('NODE_ENV=')) {
      envContent = envContent.replace(/NODE_ENV=.*/, 'NODE_ENV=production');
    } else {
      envContent += `\nNODE_ENV=production`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env.local with production settings`);
  } else {
    // Create a new .env.local file if it doesn't exist
    envContent = `PORT=${port}\nHOST=0.0.0.0\nDB_PORT=${MYSQL_PORT}\nNEXT_PUBLIC_APP_URL=http://localhost:${port}\nNODE_ENV=production`;
    fs.writeFileSync(envPath, envContent);
    console.log('Created new .env.local file with production settings');
  }
} catch (error) {
  console.warn('Warning: Could not update .env.local file', error.message);
}

console.log(`Starting Rainbow Paws production server on port ${port}`);
console.log(`App will be available at: http://localhost:${port}`);
console.log(`MySQL connection will use standard port: ${MYSQL_PORT}`);

// Set environment variables for this process
process.env.PORT = port;
process.env.HOST = '0.0.0.0'; // Bind to all interfaces
process.env.DB_PORT = MYSQL_PORT.toString();
process.env.NODE_ENV = 'production';

// Use the same host for both localhost and IP access
// This ensures consistency between how the app is accessed
process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${port}`;

// Start the Next.js production server
try {
  console.log(`Starting Next.js production server on port ${port}`);

  // Set debug environment variable for more verbose logging
  process.env.NODE_OPTIONS = '--trace-warnings';
  process.env.DEBUG = '*';

  // Execute the command
  execSync(`npx next start -p ${port} -H 0.0.0.0`, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting the production server: ${error.message}`);
  process.exit(1);
}
