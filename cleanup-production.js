/**
 * Production Cleanup Script for Rainbow Paws
 * This script optimizes the project for production deployment by removing
 * unnecessary files, directories, and development dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to be removed
const filesToRemove = [
  // Test and development scripts
  'test-email-service.js',
  'test-password-reset.js',
  'test-real-email.js',
  'test-simple-email.js',
  'check-email-domain.js',
  'check-env.js',
  'check-db.js',
  'check-otp-tables.js',
  'check-password-reset-table.js',
  'check-users.js',
  'enable-dev-emails.js',
  'fix-email-config.js',
  'fix-email-issues.js',
  'fix-email-service.js',
  'fix-db-port.js',
  'setup-env.js',
  // Test API routes
  'src/app/api/test/add-test-users/route.ts',
  'src/app/api/test/admin-login/route.ts',
  'src/app/api/test/check-api/route.ts',
  'src/app/api/test/check-implementation/route.ts',
  'src/app/api/test/generate-notifications/route.ts',
  'src/app/api/test/reset-test-passwords/route.ts',
  'src/app/api/test/user-management/route.ts',
  // Test pages
  'src/app/test-page/page.tsx',
  'src/app/test-video/page.tsx',
  // Test components
  'src/components/ui/TestNotificationsButton.tsx',
  // Build artifacts
  'tsconfig.tsbuildinfo'
];

// Documentation files to be removed
const documentationFiles = [
  'EMAIL-SETUP.md',
  'LEAFLET_INSTALLATION.md',
  'PORT_CONFIGURATION.md',
  'REGISTRATION_FIX_SUMMARY.md',
  'REGISTRATION_SETUP.md',
  'SIMPLE-EMAIL-SERVICE.md'
];

// Directories to be removed
const dirsToRemove = [
  // Cache and diagnostics
  '.next/cache',
  '.next/diagnostics'
];

console.log('🚀 Starting production optimization...');

// Remove development files
let removedFiles = 0;
for (const file of filesToRemove) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Removed development file: ${file}`);
      removedFiles++;
    }
  } catch (err) {
    console.error(`❌ Failed to remove file ${file}:`, err.message);
  }
}

// Remove documentation files
let removedDocs = 0;
for (const file of documentationFiles) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Removed documentation file: ${file}`);
      removedDocs++;
    }
  } catch (err) {
    console.error(`❌ Failed to remove documentation file ${file}:`, err.message);
  }
}

// Remove directories
let removedDirs = 0;
for (const dir of dirsToRemove) {
  try {
    if (fs.existsSync(dir)) {
      removeDirRecursive(dir);
      console.log(`✅ Removed directory: ${dir}`);
      removedDirs++;
    }
  } catch (err) {
    console.error(`❌ Failed to remove directory ${dir}:`, err.message);
  }
}

// Clean node_modules and reinstall production dependencies
try {
  console.log('\n📦 Cleaning node_modules and reinstalling production dependencies...');
  console.log('   This may take a few minutes...');

  // Remove node_modules
  if (fs.existsSync('node_modules')) {
    console.log('   - Removing node_modules...');
    // Using npm instead of direct deletion to avoid potential issues
    execSync('npm prune --production', { stdio: 'inherit' });
    console.log('✅ Removed all development dependencies');
  }
} catch (err) {
  console.error('❌ Failed to clean and reinstall dependencies:', err.message);
}

console.log(`\n🚀 Production optimization completed!`);
console.log(`   - Removed ${removedFiles} development files`);
console.log(`   - Removed ${removedDocs} documentation files`);
console.log(`   - Removed ${removedDirs} unnecessary directories`);
console.log(`   - Pruned development dependencies from node_modules`);
console.log('\n🚀 The application is now optimized for production deployment!');

/**
 * Remove a directory recursively
 * @param {string} dirPath - Path to the directory to be removed
 */
function removeDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call
        removeDirRecursive(curPath);
      } else {
        // Remove file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}