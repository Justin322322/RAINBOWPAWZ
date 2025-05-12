/**
 * Script to run Next.js development server with the correct port
 * This script handles the PORT environment variable properly on all platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try to load dotenv if available
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (error) {
  // If dotenv is not available, try to load manually
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');

      for (const line of envLines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';

          // Remove quotes if present
          if (value.length > 1 &&
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }

          process.env[key] = value;
        }
      }
    }
  } catch (manualError) {
    // Ignore errors in manual loading
  }
}

// Get the port from environment variable or use default
// Try to use 3001 as a fallback if 3000 is taken
const port = process.env.PORT || 3001;

console.log(`Starting Next.js development server on port ${port}`);
console.log(`App will be available at: http://localhost:${port}`);

try {
  // Execute the Next.js dev command with the specified port
  execSync(`npx next dev -p ${port}`, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting development server: ${error.message}`);
  process.exit(1);
}
