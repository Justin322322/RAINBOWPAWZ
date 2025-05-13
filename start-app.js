/**
 * Custom Startup Script for Rainbow Paws
 * This script starts the application with a custom port
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Get port from command line argument or use default
// Avoid port 3000 which causes issues
const DEFAULT_PORT = 3001;
const port = process.argv[2] || DEFAULT_PORT;

console.log(`🚀 Starting Rainbow Paws on port ${port}`);

// Create or update .env.local with the port
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    console.log('Loading environment from .env.local');
    envContent = fs.readFileSync(envPath, 'utf8');

    // Update PORT for web server
    if (envContent.includes('PORT=')) {
      envContent = envContent.replace(/PORT=\d+/, `PORT=${port}`);
    } else {
      envContent += `\nPORT=${port}`;
    }

    // Update NEXT_PUBLIC_APP_URL to match the port
    if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_APP_URL=http:\/\/localhost:\d+/,
        `NEXT_PUBLIC_APP_URL=http://localhost:${port}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_APP_URL=http://localhost:${port}`;
    }

    // Make sure HOST is set
    if (!envContent.includes('HOST=')) {
      envContent += '\nHOST=0.0.0.0';
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env.local with port ${port}`);
    console.log(`App URL set to http://localhost:${port}`);
  } else {
    // Create a new .env.local file if it doesn't exist
    envContent = `PORT=${port}\nHOST=0.0.0.0\nNEXT_PUBLIC_APP_URL=http://localhost:${port}`;
    fs.writeFileSync(envPath, envContent);
    console.log(`Created new .env.local file with port ${port}`);
  }
} catch (error) {
  console.warn('Warning: Could not update .env.local file', error.message);
}

// Set environment variables
process.env.PORT = port;

// Start the Next.js development server
try {
  console.log(`Starting Next.js development server on port ${port}`);
  console.log(`App will be available at: http://localhost:${port}`);

  // Execute the command
  execSync(`npx next dev -p ${port}`, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting the development server: ${error.message}`);
  process.exit(1);
}