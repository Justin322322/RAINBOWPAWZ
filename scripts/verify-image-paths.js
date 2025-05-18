/**
 * Script to verify image paths in the production build
 * This helps diagnose issues with images not displaying in production
 */

const fs = require('fs');
const path = require('path');

// Function to recursively scan a directory for image files
function scanForImages(directory, basePath = '') {
  const results = [];
  
  if (!fs.existsSync(directory)) {
    console.error(`Directory does not exist: ${directory}`);
    return results;
  }
  
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      results.push(...scanForImages(fullPath, relativePath));
    } else {
      // Check if it's an image file
      const extension = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)) {
        results.push({
          fullPath,
          relativePath,
          size: fs.statSync(fullPath).size,
          extension
        });
      }
    }
  }
  
  return results;
}

// Function to check if an image exists in the production build
function checkImageInProduction(imagePath) {
  // Convert to API path if it's an uploads path
  let apiPath = imagePath;
  if (imagePath.startsWith('/uploads/')) {
    const uploadPath = imagePath.substring('/uploads/'.length);
    apiPath = `/api/image/${uploadPath}`;
  }
  
  // Check if the file exists in the public directory
  const publicPath = path.join(process.cwd(), 'public', imagePath);
  const publicExists = fs.existsSync(publicPath);
  
  // Check if the file exists in the standalone output
  const standalonePath = path.join(process.cwd(), '.next', 'standalone', 'public', imagePath);
  const standaloneExists = fs.existsSync(standalonePath);
  
  return {
    originalPath: imagePath,
    apiPath,
    publicExists,
    publicPath,
    standaloneExists,
    standalonePath
  };
}

// Main function
function main() {
  console.log('=== Image Path Verification ===');
  
  // Scan for images in the public directory
  console.log('Scanning for images in the public directory...');
  const publicImages = scanForImages(path.join(process.cwd(), 'public'));
  console.log(`Found ${publicImages.length} images in the public directory.`);
  
  // Scan for images in the uploads directory
  console.log('Scanning for images in the uploads directory...');
  const uploadsImages = scanForImages(path.join(process.cwd(), 'public', 'uploads'), '/uploads');
  console.log(`Found ${uploadsImages.length} images in the uploads directory.`);
  
  // Check if the standalone output directory exists
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone', 'public');
  if (!fs.existsSync(standaloneDir)) {
    console.error('Error: Standalone output directory does not exist. Run the build process first.');
    process.exit(1);
  }
  
  // Scan for images in the standalone output directory
  console.log('Scanning for images in the standalone output directory...');
  const standaloneImages = scanForImages(standaloneDir);
  console.log(`Found ${standaloneImages.length} images in the standalone output directory.`);
  
  // Check for missing images in the standalone output
  console.log('\nChecking for missing images in the production build...');
  let missingCount = 0;
  
  for (const image of uploadsImages) {
    const check = checkImageInProduction(image.relativePath);
    
    if (!check.standaloneExists) {
      console.error(`Missing in production: ${image.relativePath}`);
      console.error(`  Public path: ${check.publicPath} (${check.publicExists ? 'exists' : 'missing'})`);
      console.error(`  Standalone path: ${check.standalonePath} (missing)`);
      console.error(`  API path: ${check.apiPath}`);
      console.error('');
      missingCount++;
    }
  }
  
  if (missingCount === 0) {
    console.log('All images from the uploads directory are present in the production build.');
  } else {
    console.error(`Found ${missingCount} images missing from the production build.`);
  }
  
  // Check for API route
  const apiRouteFile = path.join(process.cwd(), 'src', 'app', 'api', 'image', '[...path]', 'route.ts');
  if (!fs.existsSync(apiRouteFile)) {
    console.error('Error: API route for serving images is missing.');
    console.error(`Expected at: ${apiRouteFile}`);
  } else {
    console.log('API route for serving images exists.');
  }
  
  console.log('\nVerification complete.');
}

// Run the main function
main();
