/**
 * Cleanup Script for Rainbow Paws Repository
 * This script removes unnecessary files while preserving git-related files for version control
 * 
 * Usage:
 *   node cleanup-repo.js [--keep-build] [--test-only]
 * 
 * Options:
 *   --keep-build    Preserves the .next build directory (default: cleans cache only)
 *   --test-only     Only removes test files and directories
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const keepBuild = args.includes('--keep-build');
const testFilesOnly = args.includes('--test-only');

console.log('🧹 Starting repository cleanup...');

// Test files and directories to be removed
const testFiles = [
  // Test scripts
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
  'update-port.js',
  'change-port.js',
  // Test API routes
  'src/app/api/test-db',
  'src/app/api/test',
  'src/app/api/debug',
  'src/app/api/db-dump',
  'src/app/api/db-structure',
  'src/app/api/setup',
  'src/app/api/init-db',
  'src/app/api/db-check',
  // Test pages
  'src/app/test-page',
  'src/app/test-video',
  'src/app/test-css',
  'src/app/test-db',
  'src/app/debug',
  'src/app/debug/login',
  'src/app/create-admin',
  // Test components
  'src/components/ui/TestNotificationsButton.tsx',
  'src/components/__tests__',
  '__tests__',
  'test',
  'tests',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx',
  '*.test.js',
  '*.spec.js'
];

// Files and directories to keep (in addition to .git and gitignore)
const essentialFiles = [
  '.git',
  '.gitignore',
  'src',
  'public',
  'database',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'tsconfig.json',
  'postcss.config.js',
  'tailwind.config.js',
  '.eslintrc.json',
  'eslint.config.mjs',
  'next-env.d.ts',
  'README.md',
  'cleanup-repo.js' // Keep this script
];

// If we're only removing test files, do that
if (testFilesOnly) {
  console.log('Options: Removing test files only');
  console.log('⚠️ Searching for test files to remove...');
  
  let removedTestItems = 0;
  
  // Process exact file/directory matches
  testFiles.forEach(testPath => {
    if (!testPath.includes('*')) {
      const fullPath = path.join('.', testPath);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            console.log(`🧹 Removing test directory: ${testPath}`);
            execSync(`npx rimraf "${fullPath}"`, { stdio: 'inherit' });
          } else {
            console.log(`🧹 Removing test file: ${testPath}`);
            fs.unlinkSync(fullPath);
          }
          console.log(`✅ Removed: ${testPath}`);
          removedTestItems++;
        } catch (err) {
          console.error(`❌ Failed to remove ${testPath}: ${err.message}`);
        }
      }
    }
  });
  
  // Handle pattern-based test files
  const testFilePatterns = testFiles.filter(pattern => pattern.includes('*'));
  if (testFilePatterns.length > 0) {
    console.log(`🔍 Searching for files matching test patterns...`);
    
    // Function to scan a directory recursively
    function scanDirectory(dirPath) {
      if (!fs.existsSync(dirPath)) return;
      
      fs.readdirSync(dirPath).forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and .git directories
          if (item !== 'node_modules' && item !== '.git') {
            scanDirectory(fullPath);
          }
        } else if (stats.isFile()) {
          // Check if the file matches any of our test patterns
          for (const pattern of testFilePatterns) {
            const regexPattern = pattern.replace('*', '.*');
            const regex = new RegExp(regexPattern);
            if (regex.test(item)) {
              try {
                console.log(`🧹 Removing matched test file: ${fullPath}`);
                fs.unlinkSync(fullPath);
                console.log(`✅ Removed: ${fullPath}`);
                removedTestItems++;
                break; // Stop checking patterns once we have a match
              } catch (err) {
                console.error(`❌ Failed to remove ${fullPath}: ${err.message}`);
              }
            }
          }
        }
      });
    }
    
    // Start scanning from the root directory
    scanDirectory('.');
  }
  
  console.log(`\n🚀 Test files cleanup completed!`);
  console.log(`   - Removed ${removedTestItems} test files and directories`);
  
  // We're done if only removing test files
  process.exit(0);
}

console.log(`Options: ${keepBuild ? 'Preserving build artifacts' : 'Cleaning all build artifacts'}`);

// Get all files and directories in the current directory
const allItems = fs.readdirSync('.');

// Filter out items to be removed
const itemsToRemove = allItems.filter(item => {
  return !essentialFiles.includes(item);
});

console.log('⚠️ The following files and directories will be processed:');
itemsToRemove.forEach(item => console.log(`   - ${item}`));

// Remove the identified items
let removedItems = 0;
itemsToRemove.forEach(item => {
  try {
    const fullPath = path.join('.', item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      if (item === '.next') {
        if (keepBuild) {
          // For .next, preserve the directory but clean cache
          console.log(`🧹 Cleaning the .next/cache directory...`);
          try {
            // Try to use rimraf for robust directory removal
            execSync('npx rimraf .next/cache', { stdio: 'inherit' });
            console.log(`✅ Cleaned .next/cache directory`);
          } catch (e) {
            // Fallback - delete cache using native fs methods
            console.log(`⚠️ Failed with rimraf, trying native method...`);
            if (fs.existsSync(path.join('.next', 'cache'))) {
              removeDirectoryRecursive(path.join('.next', 'cache'));
              console.log(`✅ Cleaned .next/cache directory with native method`);
            } else {
              console.log(`✅ .next/cache directory already removed`);
            }
          }
        } else {
          // Remove the entire .next directory
          console.log(`🧹 Removing ${item} directory...`);
          try {
            execSync('npx rimraf .next', { stdio: 'inherit' });
            console.log(`✅ Removed ${item} directory`);
          } catch (e) {
            // Fallback to native fs
            removeDirectoryRecursive(fullPath);
            console.log(`✅ Removed ${item} directory with native method`);
          }
        }
      } else if (item === 'node_modules') {
        // node_modules can be challenging on Windows
        console.log(`🧹 Removing ${item} directory (this might take a while)...`);
        console.log(`   Note: Some files might require manual removal if locked by processes.`);
        
        try {
          // Try PowerShell first (often works better on Windows)
          execSync('powershell -Command "Remove-Item -Path .\\node_modules -Recurse -Force -ErrorAction SilentlyContinue"', { stdio: 'inherit' });
          console.log(`✅ Attempted to remove node_modules using PowerShell`);
          
          // Then try rimraf as a fallback
          execSync('npx rimraf node_modules', { stdio: 'inherit' });
          console.log(`✅ Attempted to remove remaining node_modules files with rimraf`);
        } catch (e) {
          console.log(`⚠️ Could not completely remove node_modules: ${e.message}`);
          console.log(`   You may need to manually delete this directory.`);
        }
      } else {
        console.log(`🧹 Removing ${item} directory...`);
        try {
          execSync(`npx rimraf "${fullPath}"`, { stdio: 'inherit' });
          console.log(`✅ Removed ${item} directory`);
        } catch (e) {
          // Fallback to native fs
          removeDirectoryRecursive(fullPath);
          console.log(`✅ Removed ${item} directory with native method`);
        }
      }
    } else {
      console.log(`🧹 Removing file: ${item}`);
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed file: ${item}`);
    }
    removedItems++;
  } catch (err) {
    console.error(`❌ Failed to remove ${item}: ${err.message}`);
  }
});

console.log(`\n🚀 Repository cleanup completed!`);
console.log(`   - Processed ${removedItems} files and directories`);
console.log(`   - Preserved git-related files for version control`);
console.log(`   - Kept essential project files (src, public, config files, etc.)`);

if (itemsToRemove.includes('node_modules')) {
  console.log(`\n⚠️ Note about node_modules:`);
  console.log(`   If you had permission issues with node_modules, try these commands:`);
  console.log(`   1. Close any programs that might be using the files`);
  console.log(`   2. Run: powershell -Command "Remove-Item -Path .\\node_modules -Recurse -Force"`);
  console.log(`   3. Or restart your computer and delete the directory manually`);
}

/**
 * Remove a directory recursively using native fs methods
 * @param {string} dirPath - Path to the directory to remove
 */
function removeDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call
        removeDirectoryRecursive(curPath);
      } else {
        // Remove file
        try {
          fs.unlinkSync(curPath);
        } catch (e) {
          console.log(`⚠️ Could not remove file: ${curPath}`);
        }
      }
    });
    
    try {
      fs.rmdirSync(dirPath);
    } catch (e) {
      console.log(`⚠️ Could not remove directory: ${dirPath}`);
    }
  }
} 