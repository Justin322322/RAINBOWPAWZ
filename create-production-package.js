/**
 * Create Production Package Script
 * This script creates a production-ready package of the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Starting production package creation...');

// Get the current date for the package name
const date = new Date();
const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const packageName = `rainbow_paws_production_${dateString}`;

// Create a directory for the production package
const packageDir = path.resolve(process.cwd(), packageName);
if (fs.existsSync(packageDir)) {
  console.log(`Directory ${packageName} already exists. Removing it...`);
  fs.rmSync(packageDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir);
console.log(`✅ Created directory: ${packageName}`);

// Files and directories to include in the production package
const filesToInclude = [
  // Core application files
  '.next',
  'public',
  'server.js',
  'start-custom.js',
  'package.json',
  'package-lock.json',
  '.env.local',
  
  // Additional files
  'README.md',
  'LICENSE',
];

// Function to copy a file
function copyFile(src, dest) {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied file: ${src} -> ${dest}`);
      return true;
    }
    console.log(`⚠️ File not found: ${src}`);
    return false;
  } catch (error) {
    console.error(`❌ Error copying file ${src}:`, error.message);
    return false;
  }
}

// Function to copy a directory
function copyDirectory(src, dest) {
  try {
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      // Create the destination directory if it doesn't exist
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      // Copy all files and subdirectories
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDirectory(srcPath, destPath);
        } else {
          copyFile(srcPath, destPath);
        }
      }
      
      console.log(`✅ Copied directory: ${src} -> ${dest}`);
      return true;
    }
    console.log(`⚠️ Directory not found: ${src}`);
    return false;
  } catch (error) {
    console.error(`❌ Error copying directory ${src}:`, error.message);
    return false;
  }
}

// Copy files and directories to the production package
console.log('\n📋 Copying files and directories...');
for (const item of filesToInclude) {
  const srcPath = path.resolve(process.cwd(), item);
  const destPath = path.resolve(packageDir, item);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  } else {
    console.log(`⚠️ Item not found: ${item}`);
  }
}

// Create a README file for the production package
console.log('\n📋 Creating production README...');
const readmePath = path.resolve(packageDir, 'PRODUCTION_README.md');
const readmeContent = `# Rainbow Paws Production Package

This is a production-ready package of the Rainbow Paws application.

## Deployment Instructions

1. **Install Node.js**: Make sure Node.js (version 18 or higher) is installed on your server.

2. **Install dependencies**:
   \`\`\`
   npm install --production
   \`\`\`

3. **Start the application**:
   \`\`\`
   npm run start:custom
   \`\`\`

4. **Access the application**:
   The application will be available at http://localhost:3001 or http://your-server-ip:3001

## Environment Configuration

The application uses the following environment variables in the \`.env.local\` file:

- \`PORT\`: Web server port (default: 3001)
- \`HOST\`: Host to bind to (default: 0.0.0.0)
- \`NEXT_PUBLIC_APP_URL\`: Public URL of the application
- \`DB_HOST\`: Database host (default: localhost)
- \`DB_USER\`: Database user (default: root)
- \`DB_PASSWORD\`: Database password
- \`DB_NAME\`: Database name (default: rainbow_paws)
- \`DB_PORT\`: Database port (default: 3306)

## Troubleshooting

If you encounter any issues, check the following:

1. Make sure MySQL is running and accessible
2. Verify that the database credentials in \`.env.local\` are correct
3. Check that the required database tables exist

For more information, refer to the main README.md file.

## Package Contents

- \`.next/\`: Compiled Next.js application
- \`public/\`: Static assets
- \`server.js\`: Custom server for running the application
- \`start-custom.js\`: Script to start the custom server
- \`package.json\`: Package configuration
- \`.env.local\`: Environment configuration

## Created on: ${new Date().toISOString().split('T')[0]}
`;

fs.writeFileSync(readmePath, readmeContent);
console.log(`✅ Created production README: PRODUCTION_README.md`);

// Create a ZIP file of the production package
console.log('\n📋 Creating ZIP file...');
try {
  const zipCommand = process.platform === 'win32'
    ? `powershell -Command "Compress-Archive -Path './${packageName}/*' -DestinationPath './${packageName}.zip' -Force"`
    : `zip -r ${packageName}.zip ${packageName}`;
  
  execSync(zipCommand, { stdio: 'inherit' });
  console.log(`✅ Created ZIP file: ${packageName}.zip`);
} catch (error) {
  console.error('❌ Error creating ZIP file:', error.message);
  console.log('Please manually zip the directory.');
}

console.log('\n✅ Production package creation completed!');
console.log(`Your production package is available at: ${packageName}.zip`);
console.log(`You can also find the unzipped files in the ${packageName} directory.`);
