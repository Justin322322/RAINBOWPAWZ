#!/usr/bin/env node

/**
 * Dynamic Port Management Utility for Rainbow Paws
 * This script helps identify available ports and automatically configures the application
 * to work on any available port without hardcoded dependencies
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// Default ports to check
const DEFAULT_PORTS = [3000, 3001, 3002, 3003, 3004, 3005];

/**
 * Check if a port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // Port is available
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // Port is in use
    });
  });
}

/**
 * Find the first available port from a list
 */
async function findAvailablePort(ports = DEFAULT_PORTS) {
  for (const port of ports) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
  }
  return null;
}

/**
 * Get current environment configuration
 */
function getCurrentConfig() {
  const envPath = path.join(process.cwd(), '.env.local');
  let envPort = null;
  let envUrl = null;
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/^PORT=(.+)$/m);
    const urlMatch = envContent.match(/^NEXT_PUBLIC_APP_URL=(.+)$/m);
    
    if (portMatch) envPort = parseInt(portMatch[1]);
    if (urlMatch) envUrl = urlMatch[1];
  }
  
  return { envPort, envUrl };
}

/**
 * Update .env.local file with new port configuration
 */
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add PORT
  if (envContent.includes('PORT=')) {
    envContent = envContent.replace(/^PORT=.+$/m, `PORT=${port}`);
  } else {
    envContent += `\nPORT=${port}`;
  }
  
  // Update or add NEXT_PUBLIC_APP_URL
  const newUrl = `http://localhost:${port}`;
  if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
    envContent = envContent.replace(/^NEXT_PUBLIC_APP_URL=.+$/m, `NEXT_PUBLIC_APP_URL=${newUrl}`);
  } else {
    envContent += `\nNEXT_PUBLIC_APP_URL=${newUrl}`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  return newUrl;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Rainbow Paws Port Checker\n');
  
  const { envPort, envUrl } = getCurrentConfig();
  
  console.log('📋 Current Configuration:');
  console.log(`   PORT: ${envPort || 'not set'}`);
  console.log(`   NEXT_PUBLIC_APP_URL: ${envUrl || 'not set'}\n`);
  
  // Check if configured port is available
  if (envPort) {
    const isConfiguredPortAvailable = await checkPort(envPort);
    console.log(`🔌 Configured port ${envPort}: ${isConfiguredPortAvailable ? '✅ Available' : '❌ In use'}\n`);
    
    if (isConfiguredPortAvailable) {
      console.log('✨ Your configured port is available! You can run:');
      console.log(`   npm run dev`);
      console.log(`   Application will be available at: ${envUrl || `http://localhost:${envPort}`}\n`);
      return;
    }
  }
  
  // Find an available port
  console.log('🔍 Checking available ports...');
  const availablePort = await findAvailablePort();
  
  if (!availablePort) {
    console.log('❌ No available ports found in the default range (3000-3005)');
    console.log('   Please manually specify a port using: npx next dev -p <port>');
    return;
  }
  
  console.log(`✅ Found available port: ${availablePort}\n`);
  
  // Ask if user wants to update configuration
  const args = process.argv.slice(2);
  if (args.includes('--update') || args.includes('-u')) {
    const newUrl = updateEnvFile(availablePort);
    console.log('📝 Updated .env.local configuration:');
    console.log(`   PORT=${availablePort}`);
    console.log(`   NEXT_PUBLIC_APP_URL=${newUrl}\n`);
    console.log('✨ You can now run:');
    console.log(`   npm run dev`);
    console.log(`   Application will be available at: ${newUrl}`);
  } else {
    console.log('💡 To use this port, you can either:');
    console.log(`   1. Run: npx next dev -p ${availablePort}`);
    console.log(`   2. Update your .env.local file and run: node scripts/check-port.js --update`);
    console.log(`   3. Run this script with --update flag: node scripts/check-port.js --update`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkPort, findAvailablePort, getCurrentConfig, updateEnvFile };
