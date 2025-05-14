/**
 * Production Preparation Script for Rainbow Paws
 * 
 * This script prepares the application for production deployment by:
 * 1. Cleaning up unnecessary files
 * 2. Optimizing the Next.js build
 * 3. Creating a production-ready package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure path exists or create it
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Files not needed in production
const devFilesToRemove = [
  // Test files
  'test-db.js',
  'package.json.backup',
  'src/scripts/insert_test_providers.js',
  'src/scripts/insert_test_providers.sql',
  
  // Build/development scripts
  'fix-production.js',
  'package-prod.js',
  'cleanup-files.js',
  
  // Temporary files
  '.next-temp',
  
  // Add any other development-only files
];

// Create a production directory
const prodDir = 'rainbow_paws_prod';
console.log(`🏗️ Preparing production package in ${prodDir}...`);

// Clean or create the production directory
if (fs.existsSync(prodDir)) {
  fs.rmSync(prodDir, { recursive: true, force: true });
}
fs.mkdirSync(prodDir);

// First run the cleanup script if it exists
if (fs.existsSync('cleanup-files.js')) {
  console.log('\n🧹 Running cleanup script...');
  try {
    execSync('node cleanup-files.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error running cleanup script:', error.message);
  }
}

// Build the application for production
console.log('\n🏗️ Building application for production...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building application:', error.message);
  process.exit(1);
}

// Files and directories to include in production
const filesToInclude = [
  // Core application files
  '.next',
  'public',
  'node_modules',
  'package.json',
  'package-lock.json',
  '.env.local',
  'next.config.js',
  
  // Custom server files
  'server.js',
  'start-custom.js',
  
  // Documentation
  'README.md',
];

// Copy files to production directory
console.log('\n📋 Copying files to production directory...');
filesToInclude.forEach(item => {
  const srcPath = path.join(process.cwd(), item);
  const destPath = path.join(process.cwd(), prodDir, item);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      // For directories, use recursive copy
      ensureDir(destPath);
      try {
        execSync(`xcopy "${srcPath}" "${destPath}" /E /I /H /Y`, { stdio: 'inherit' });
        console.log(`✅ Copied directory: ${item}`);
      } catch (error) {
        console.error(`Error copying directory ${item}:`, error.message);
      }
    } else {
      // For files, use simple copy
      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied file: ${item}`);
      } catch (error) {
        console.error(`Error copying file ${item}:`, error.message);
      }
    }
  } else {
    console.log(`⚠️ Item not found: ${item}`);
  }
});

// Create a production README
const prodReadmePath = path.join(process.cwd(), prodDir, 'README.md');
const prodReadmeContent = `# Rainbow Paws Production Build

## How to run
1. Install dependencies: npm install --production
2. Start the server: npm run start:custom
3. Access at http://localhost:3001

Created: ${new Date().toISOString().split('T')[0]}
`;

fs.writeFileSync(prodReadmePath, prodReadmeContent);
console.log('✅ Created production README');

// Create a simple start script for production
const startScriptPath = path.join(process.cwd(), prodDir, 'start.js');
const startScriptContent = `/**
 * Simple start script for Rainbow Paws production
 */
const { execSync } = require('child_process');

console.log('🚀 Starting Rainbow Paws...');
execSync('node server.js', { stdio: 'inherit' });
`;

fs.writeFileSync(startScriptPath, startScriptContent);
console.log('✅ Created start script');

// Update package.json in production directory
const prodPackageJsonPath = path.join(process.cwd(), prodDir, 'package.json');
if (fs.existsSync(prodPackageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(prodPackageJsonPath, 'utf8'));
  
  // Simplify scripts
  packageJson.scripts = {
    "start": "node start.js",
    "start:custom": "node start-custom.js"
  };
  
  // Remove devDependencies
  delete packageJson.devDependencies;
  
  fs.writeFileSync(prodPackageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated production package.json');
}

console.log('\n✅ Production package prepared successfully in the', prodDir, 'directory!');
console.log('\nTo deploy:');
console.log(`1. Copy the ${prodDir} directory to your production server`);
console.log('2. Run: npm install --production');
console.log('3. Run: npm start');
console.log('\nYour application will be available at http://your-server-ip:3001'); 