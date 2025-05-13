/**
 * Cleanup Build Script
 * This script removes test files and unnecessary files from the build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting cleanup process...');

// Files and directories to remove
const filesToRemove = [
  // Test files
  'test-db.js',
  'fix-production.js',
  
  // Development files
  '.eslintrc.json',
  '.prettierrc',
  'tsconfig.tsbuildinfo',
  
  // Temporary files
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  '.DS_Store',
  'Thumbs.db',
  
  // Source maps (optional, remove if you want to keep them for debugging)
  '.next/**/*.map',
];

// Directories to remove
const dirsToRemove = [
  // Test directories
  '__tests__',
  'tests',
  'test',
  'coverage',
  
  // Development directories
  '.github',
  '.vscode',
  '.idea',
  
  // Temporary directories
  'node_modules/.cache',
  '.next/cache',
];

// Function to safely remove a file
function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error removing file ${filePath}:`, error.message);
    return false;
  }
}

// Function to safely remove a directory
function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dirPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error removing directory ${dirPath}:`, error.message);
    return false;
  }
}

// Function to find and remove files by pattern
function removeFilesByPattern(pattern) {
  try {
    const command = process.platform === 'win32'
      ? `powershell -Command "Get-ChildItem -Path . -Recurse -Filter '${pattern}' | ForEach-Object { $_.FullName }"`
      : `find . -name "${pattern}" -type f`;
    
    const output = execSync(command, { encoding: 'utf8' });
    const files = output.trim().split('\n').filter(Boolean);
    
    let count = 0;
    for (const file of files) {
      const filePath = process.platform === 'win32' ? file : file.trim();
      if (removeFile(filePath)) {
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`✅ Removed ${count} files matching pattern: ${pattern}`);
    }
    
    return count;
  } catch (error) {
    console.error(`❌ Error finding files by pattern ${pattern}:`, error.message);
    return 0;
  }
}

// Remove specific files
console.log('\n📋 Removing specific files...');
let removedFilesCount = 0;
for (const file of filesToRemove) {
  if (removeFile(file)) {
    removedFilesCount++;
  }
}
console.log(`Removed ${removedFilesCount} specific files.`);

// Remove directories
console.log('\n📋 Removing directories...');
let removedDirsCount = 0;
for (const dir of dirsToRemove) {
  if (removeDirectory(dir)) {
    removedDirsCount++;
  }
}
console.log(`Removed ${removedDirsCount} directories.`);

// Remove source map files
console.log('\n📋 Removing source map files...');
const removedMapFilesCount = removeFilesByPattern('*.map');
console.log(`Removed ${removedMapFilesCount} source map files.`);

// Remove test files
console.log('\n📋 Removing test files...');
const removedTestFilesCount = removeFilesByPattern('*.test.*') + 
                             removeFilesByPattern('*.spec.*');
console.log(`Removed ${removedTestFilesCount} test files.`);

// Optimize the build
console.log('\n📋 Optimizing the build...');
try {
  console.log('Running npm prune --production...');
  execSync('npm prune --production', { stdio: 'inherit' });
  console.log('✅ Successfully removed development dependencies.');
} catch (error) {
  console.error('❌ Error removing development dependencies:', error.message);
}

// Create a production-only package
console.log('\n📋 Creating production package.json...');
try {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Create a production version of package.json
    const productionPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      private: packageJson.private,
      scripts: {
        start: packageJson.scripts.start,
        'start:custom': packageJson.scripts['start:custom']
      },
      dependencies: packageJson.dependencies,
      // Remove devDependencies, optionalDependencies, etc.
    };
    
    // Backup the original package.json
    fs.copyFileSync(packageJsonPath, path.resolve(process.cwd(), 'package.json.backup'));
    console.log('✅ Created backup of package.json');
    
    // Write the production package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(productionPackageJson, null, 2));
    console.log('✅ Created production-only package.json');
  } else {
    console.error('❌ package.json not found');
  }
} catch (error) {
  console.error('❌ Error creating production package.json:', error.message);
}

console.log('\n✅ Cleanup process completed!');
console.log('Your build is now optimized for production.');
