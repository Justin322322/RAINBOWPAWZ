/**
 * Rainbow Paws Production Deployment Script
 *
 * This script automates the process of building and running the application in production mode.
 * It handles dependency installation, building, and starting the server.
 */

const { spawn, execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  },

  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

// Helper function to print colored messages
function printMessage(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Helper function to print section headers
function printHeader(message) {
  console.log('\n' + colors.fg.cyan + colors.bright + '='.repeat(60) + colors.reset);
  console.log(colors.fg.cyan + colors.bright + ' ' + message + colors.reset);
  console.log(colors.fg.cyan + colors.bright + '='.repeat(60) + colors.reset + '\n');
}

// Helper function to execute commands and return a promise
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

// Check if MySQL is running
async function checkMySQLRunning() {
  try {
    if (os.platform() === 'win32') {
      // Windows check
      execSync('sc query MySQL', { stdio: 'ignore' });
      return true;
    } else {
      // Linux/Mac check
      const result = execSync('pgrep -x "mysqld" || pgrep -x "mysql"', { stdio: 'ignore', shell: true });
      return true;
    }
  } catch (error) {
    return false;
  }
}

// Main function to run the deployment process
async function runProduction() {
  try {
    printHeader('Rainbow Paws Production Deployment');

    printMessage('This script will build and start the application in production mode.', colors.fg.white);
    console.log();

    // Check if Node.js is installed
    try {
      const nodeVersion = execSync('node -v', { encoding: 'utf8' }).trim();
      printMessage(`Node.js ${nodeVersion} detected.`, colors.fg.green);
    } catch (error) {
      printMessage('ERROR: Node.js is not installed or not in PATH.', colors.fg.red);
      printMessage('Please install Node.js from https://nodejs.org/', colors.fg.yellow);
      process.exit(1);
    }

    // Check if MySQL is running
    printMessage('Checking for MySQL...', colors.fg.white);
    const mysqlRunning = await checkMySQLRunning();
    if (!mysqlRunning) {
      printMessage('WARNING: MySQL might not be running.', colors.fg.yellow);
      printMessage('The application requires a running MySQL database.', colors.fg.yellow);

      const answer = await new Promise(resolve => {
        rl.question('Do you want to continue anyway? (y/n): ', resolve);
      });

      if (answer.toLowerCase() !== 'y') {
        printMessage('Exiting...', colors.fg.yellow);
        process.exit(0);
      }
    } else {
      printMessage('MySQL is running.', colors.fg.green);
    }

    // Step 1: Install dependencies
    printHeader('Step 1: Installing dependencies');
    try {
      await executeCommand('npm', ['install']);
      printMessage('Dependencies installed successfully.', colors.fg.green);
    } catch (error) {
      printMessage('ERROR: Failed to install dependencies.', colors.fg.red);
      printMessage('Please check your internet connection and try again.', colors.fg.yellow);
      process.exit(1);
    }

    // Step 2: Build the application
    printHeader('Step 2: Building the application for production');
    try {
      await executeCommand('npm', ['run', 'build:production']);
      printMessage('Application built successfully.', colors.fg.green);
    } catch (error) {
      printMessage('ERROR: Build failed.', colors.fg.red);
      printMessage('Please check the error messages above and fix any issues.', colors.fg.yellow);
      process.exit(1);
    }

    // Step 3: Start the production server
    printHeader('Step 3: Starting the production server');
    printMessage('The application is now running in production mode!', colors.fg.green);
    printMessage('Press Ctrl+C to stop the server.', colors.fg.yellow);
    console.log();

    // Get the port from .env.local or use default
    let port = 3001;
    try {
      if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const portMatch = envContent.match(/PORT=(\d+)/);
        if (portMatch && portMatch[1]) {
          port = parseInt(portMatch[1], 10);
        }
      }
    } catch (error) {
      // Use default port if there's an error reading the file
    }

    printMessage(`Access the application at:`, colors.fg.white);
    printMessage(`http://localhost:${port}`, colors.fg.green + colors.bright);
    console.log();

    // Start the server
    try {
      await executeCommand('npm', ['start']);
    } catch (error) {
      // This will only execute if the server crashes
      printMessage('Server stopped unexpectedly.', colors.fg.red);
    }

    // This will only execute if the server is stopped
    printMessage('Server stopped. Thank you for using Rainbow Paws!', colors.fg.cyan);

  } catch (error) {
    printMessage(`An unexpected error occurred: ${error.message}`, colors.fg.red);
  } finally {
    rl.close();
  }
}

// Run the main function
runProduction();
