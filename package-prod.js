/**
 * Simple Production Package Script
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating production package...');

// Create a directory for the production files
const prodDir = 'rainbow_paws_prod';
if (fs.existsSync(prodDir)) {
  fs.rmSync(prodDir, { recursive: true, force: true });
}
fs.mkdirSync(prodDir);

// Copy essential files
const filesToCopy = [
  '.next',
  'public',
  'server.js',
  'start-custom.js',
  'package.json',
  '.env.local'
];

for (const file of filesToCopy) {
  if (fs.existsSync(file)) {
    if (fs.statSync(file).isDirectory()) {
      execSync(`xcopy "${file}" "${prodDir}\\${file}" /E /I /H`);
    } else {
      fs.copyFileSync(file, path.join(prodDir, file));
    }
    console.log(`✅ Copied ${file}`);
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
}

// Create a README file
const readmeContent = `# Rainbow Paws Production Build

## How to run
1. Install dependencies: npm install --production
2. Start the server: npm run start:custom
3. Access at http://localhost:3001

Created: ${new Date().toISOString().split('T')[0]}
`;

fs.writeFileSync(path.join(prodDir, 'README.md'), readmeContent);
console.log('✅ Created README.md');

console.log('✅ Production package created in:', prodDir);
