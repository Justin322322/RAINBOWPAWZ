/**
 * Custom Start Script
 * This script starts the application using the custom server.js file
 */

const { execSync } = require('child_process');

console.log('🚀 Starting Rainbow Paws with custom server...');

// Execute the command
try {
  execSync('node server.js', {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting the server: ${error.message}`);
  process.exit(1);
}
