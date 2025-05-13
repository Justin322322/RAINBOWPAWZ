/**
 * Fix Production Build Script
 * This script fixes issues with the Next.js production build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting production build fix script...');

// 1. Check environment variables
console.log('\n📋 Checking environment variables...');
require('dotenv').config({ path: '.env.local' });

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// 2. Update .env.local file
console.log('\n📝 Updating .env.local file...');
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  // Ensure NODE_ENV is set to production
  if (envContent.includes('NODE_ENV=')) {
    envContent = envContent.replace(/NODE_ENV=.*/, 'NODE_ENV=production');
  } else {
    envContent += '\nNODE_ENV=production';
  }
  
  // Ensure PORT is set to 3001
  if (envContent.includes('PORT=')) {
    envContent = envContent.replace(/PORT=\d+/, 'PORT=3001');
  } else {
    envContent += '\nPORT=3001';
  }
  
  // Ensure HOST is set to 0.0.0.0
  if (envContent.includes('HOST=')) {
    envContent = envContent.replace(/HOST=.*/, 'HOST=0.0.0.0');
  } else {
    envContent += '\nHOST=0.0.0.0';
  }
  
  // Ensure NEXT_PUBLIC_APP_URL is set correctly
  if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_APP_URL=.*/,
      'NEXT_PUBLIC_APP_URL=http://localhost:3001'
    );
  } else {
    envContent += '\nNEXT_PUBLIC_APP_URL=http://localhost:3001';
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('Updated .env.local file');
} else {
  console.log('No .env.local file found, creating one...');
  envContent = `PORT=3001
HOST=0.0.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws
DB_PORT=3306
NODE_ENV=production`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('Created new .env.local file');
}

// 3. Clean up build artifacts
console.log('\n🧹 Cleaning up build artifacts...');
try {
  if (fs.existsSync('.next')) {
    console.log('Removing .next directory...');
    fs.rmSync('.next', { recursive: true, force: true });
    console.log('Removed .next directory');
  }
} catch (error) {
  console.error('Error removing .next directory:', error.message);
}

// 4. Rebuild the application
console.log('\n🏗️ Rebuilding the application...');
try {
  console.log('Running npm run build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// 5. Create a custom server.js file
console.log('\n📄 Creating custom server.js file...');
const serverJsPath = path.resolve(process.cwd(), 'server.js');
const serverJsContent = `/**
 * Custom Next.js Server
 * This server provides better error handling and debugging
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get port from environment or default to 3001
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

// Set production mode
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

// Log environment variables
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', port);
console.log('HOST:', host);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Be sure to pass \`true\` as the second argument to \`url.parse\`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, host, (err) => {
    if (err) throw err;
    console.log(\`> Ready on http://\${host === '0.0.0.0' ? 'localhost' : host}:\${port}\`);
    console.log(\`> Network access on http://\${host}:\${port}\`);
  });
});
`;

fs.writeFileSync(serverJsPath, serverJsContent);
console.log('Created custom server.js file');

// 6. Create a start-custom.js script
console.log('\n📄 Creating start-custom.js script...');
const startCustomJsPath = path.resolve(process.cwd(), 'start-custom.js');
const startCustomJsContent = `/**
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
  console.error(\`Error starting the server: \${error.message}\`);
  process.exit(1);
}
`;

fs.writeFileSync(startCustomJsPath, startCustomJsContent);
console.log('Created start-custom.js script');

// 7. Update package.json to add a custom start script
console.log('\n📝 Updating package.json...');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
let packageJson = {};

if (fs.existsSync(packageJsonPath)) {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add custom start script
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['start:custom'] = 'node start-custom.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json');
} else {
  console.error('package.json not found');
}

console.log('\n✅ Fix script completed successfully!');
console.log('\nTo start the application with the custom server, run:');
console.log('npm run start:custom');
