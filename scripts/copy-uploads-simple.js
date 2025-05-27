/**
 * Simple script to copy uploads directory for production builds
 */

const fs = require('fs');
const path = require('path');

function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

try {
  const sourceDir = path.join(process.cwd(), 'public', 'uploads');
  const destinationDir = path.join(process.cwd(), '.next', 'standalone', 'public', 'uploads');

  if (fs.existsSync(sourceDir)) {
    copyDirectory(sourceDir, destinationDir);
    console.log('✅ Uploads directory copied successfully');
  } else {
    console.log('ℹ️  No uploads directory found, skipping copy');
  }
} catch (error) {
  console.error('❌ Error copying uploads:', error.message);
  process.exit(1);
}
