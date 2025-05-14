/**
 * Cleanup Script for Rainbow Paws Project
 * Removes files not needed in production or development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files that can be safely removed
const filesToRemove = [
  // Test and temporary files
  'test-db.js',
  'package.json.backup',
  'src/scripts/insert_test_providers.js',
  'src/scripts/insert_test_providers.sql',
  
  // Duplicate/temporary build files
  'fix-production.js',
  'package-prod.js',
  
  // Files that are created by the build process and can be regenerated
  '.next-temp',
  
  // Any additional temporary files you identify
  // Add more as needed
];

// Directories that may contain unnecessary files
const dirsToClean = [
  // Temporary directories
  '.next/cache',
  
  // Add more as needed
];

console.log('🧹 Starting cleanup process...');

// Remove individual files
console.log('\n📋 Removing unnecessary files...');
filesToRemove.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } catch (error) {
      console.error(`❌ Error removing ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
});

// Clean directories
console.log('\n📋 Cleaning directories...');
dirsToClean.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  
  if (fs.existsSync(dirPath)) {
    try {
      // Remove the directory and its contents
      fs.rmSync(dirPath, { recursive: true, force: true });
      
      // Recreate the empty directory
      fs.mkdirSync(dirPath, { recursive: true });
      
      console.log(`✅ Cleaned: ${dir}`);
    } catch (error) {
      console.error(`❌ Error cleaning ${dir}: ${error.message}`);
    }
  } else {
    console.log(`⚠️ Directory not found: ${dir}`);
  }
});

// Clean .next/cache if it exists (but keep the directory structure)
const nextCachePath = path.join(process.cwd(), '.next/cache');
if (fs.existsSync(nextCachePath)) {
  try {
    // Clean webpack cache but retain directory structure
    console.log('\n📋 Cleaning Next.js cache...');
    const webpackCachePath = path.join(nextCachePath, 'webpack');
    
    if (fs.existsSync(webpackCachePath)) {
      fs.rmSync(webpackCachePath, { recursive: true, force: true });
      fs.mkdirSync(webpackCachePath, { recursive: true });
      console.log('✅ Cleaned webpack cache');
    }
    
    // Clean swc cache but retain directory structure
    const swcCachePath = path.join(nextCachePath, 'swc');
    
    if (fs.existsSync(swcCachePath)) {
      fs.rmSync(swcCachePath, { recursive: true, force: true });
      fs.mkdirSync(swcCachePath, { recursive: true });
      console.log('✅ Cleaned SWC cache');
    }
  } catch (error) {
    console.error(`❌ Error cleaning Next.js cache: ${error.message}`);
  }
}

console.log('\n✅ Cleanup completed!');
console.log('\nTo rebuild the application without the cleaned files, run:');
console.log('npm run build'); 