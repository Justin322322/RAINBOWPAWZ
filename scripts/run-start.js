/**
 * Script to run Next.js production server with the correct port
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

// Parse command line arguments
const args = process.argv.slice(2);
let cmdPort;

// Look for -p or --port argument
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    if (i + 1 < args.length) {
      cmdPort = args[i + 1];
      break;
    }
  } else if (args[i].startsWith('-p=')) {
    cmdPort = args[i].substring(3);
    break;
  } else if (args[i].startsWith('--port=')) {
    cmdPort = args[i].substring(7);
    break;
  }
}

// Get the port from command line, environment variable, or use default
const port = cmdPort || process.env.PORT || 3000;

console.log(`Starting Next.js production server on port ${port}`);
console.log(`App will be available at: http://localhost:${port}`);

try {
  // Execute the Next.js start command with the specified port
  execSync(`npx next start -p ${port}`, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error(`Error starting production server: ${error.message}`);
  process.exit(1);
}
