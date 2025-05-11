/**
 * Cross-platform script to start the Rainbow Paws application
 * This script allows the app to run on any specified port
 *
 * Usage:
 * node start-app.js [port]
 *
 * If no port is specified, it will use the PORT from .env.local or default to 3000
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env.local');
  }
} catch (error) {
  console.warn('Warning: Could not load .env.local file', error.message);
}

// Get port from command line arguments or environment variables
const portArg = process.argv[2];
const port = portArg || process.env.PORT || 3000;

// Update the PORT in .env.local file
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');

    // Replace or add PORT line
    if (envContent.includes('PORT=')) {
      envContent = envContent.replace(/PORT=\d+/, `PORT=${port}`);
    } else {
      envContent = `PORT=${port}\n${envContent}`;
    }

    // Add or update HOST to listen on all interfaces
    if (envContent.includes('HOST=')) {
      envContent = envContent.replace(/HOST=.*/, 'HOST=0.0.0.0');
    } else {
      envContent = `${envContent}\nHOST=0.0.0.0`;
    }

    // Update NEXT_PUBLIC_APP_URL
    if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_APP_URL=.*/,
        `NEXT_PUBLIC_APP_URL=http://localhost:${port}`
      );
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env.local with PORT=${port} and HOST=0.0.0.0`);
  }
} catch (error) {
  console.warn('Warning: Could not update .env.local file', error.message);
}

console.log(`Starting Rainbow Paws application on port ${port}`);
console.log(`App will be available at: http://localhost:${port}`);

// Set environment variables for this process
process.env.PORT = port;
process.env.HOST = '0.0.0.0';
process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${port}`;

// Determine which npm command to run based on NODE_ENV
const isDev = process.env.NODE_ENV !== 'production';
const npmCommand = isDev ? 'dev' : 'start';

try {
  // Use execSync to run the command
  const command = `npx next ${npmCommand} -p ${port} -H 0.0.0.0`;
  console.log(`Executing: ${command}`);

  // Execute the command and pipe output to the console
  execSync(command, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting the application: ${error.message}`);
  process.exit(1);
}
