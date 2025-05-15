import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db';

/**
 * This script migrates package images to organized folders.
 * It moves them from the flat structure to package-specific folders.
 */
async function migratePackageImages() {
  console.log('Starting package image migration...');
  
  try {
    // Get all package images from database
    const images = await query(
      'SELECT pi.id, pi.package_id, pi.image_path FROM package_images pi'
    ) as any[];
    
    console.log(`Found ${images.length} package images in database`);
    
    // Create base directory if it doesn't exist
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Created base directory: ${baseDir}`);
    }
    
    let migrated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each image
    for (const image of images) {
      const packageId = image.package_id;
      const currentPath = image.image_path;
      
      // Skip images that are already in package ID folders
      if (currentPath.match(/\/uploads\/packages\/\d+\//)) {
        console.log(`Skipping already migrated image: ${currentPath}`);
        skipped++;
        continue;
      }
      
      // Create the new folder structure
      const packageDir = path.join(baseDir, packageId.toString());
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
        console.log(`Created package directory: ${packageDir}`);
      }
      
      try {
        // Check if the source file exists
        const sourcePath = path.join(process.cwd(), 'public', currentPath);
        if (!fs.existsSync(sourcePath)) {
          console.log(`Source file doesn't exist: ${sourcePath}`);
          failed++;
          continue;
        }
        
        // Get the original filename
        const originalFilename = path.basename(sourcePath);
        
        // Create the new path
        const newRelativePath = `/uploads/packages/${packageId}/${originalFilename}`;
        const newAbsolutePath = path.join(process.cwd(), 'public', newRelativePath);
        
        // Copy the file to the new location
        fs.copyFileSync(sourcePath, newAbsolutePath);
        console.log(`Copied file from ${sourcePath} to ${newAbsolutePath}`);
        
        // Update the database with new path
        await query(
          'UPDATE package_images SET image_path = ? WHERE id = ?',
          [newRelativePath, image.id]
        );
        console.log(`Updated database for image ID ${image.id} to new path: ${newRelativePath}`);
        
        migrated++;
      } catch (error) {
        console.error(`Failed to migrate image ${image.id}:`, error);
        failed++;
      }
    }
    
    console.log('---- Migration Summary ----');
    console.log(`Total images: ${images.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Already in new format: ${skipped}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('Some images failed to migrate. Check the logs above for details.');
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  migratePackageImages()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error in migration script:', error);
      process.exit(1);
    });
}

export default migratePackageImages; 