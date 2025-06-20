import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db';

/**
 * This script migrates package images to organized folders.
 * It moves them from the flat structure to package-specific folders.
 */
async function migratePackageImages() {
  try {
    // Get all package images from database
    const images = await query(
      'SELECT pi.id, pi.package_id, pi.image_path FROM package_images pi'
    ) as any[];


    // Create base directory if it doesn't exist
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    let _migrated = 0;
    let _failed = 0;
    let _skipped = 0;

    // Process each image
    for (const image of images) {
      const packageId = image.package_id;
      const currentPath = image.image_path;

      // Skip images that are already in package ID folders
      if (currentPath.match(/\/uploads\/packages\/\d+\//)) {
        _skipped++;
        continue;
      }

      // Create the new folder structure
      const packageDir = path.join(baseDir, packageId.toString());
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
      }

      try {
        // Check if the source file exists
        const sourcePath = path.join(process.cwd(), 'public', currentPath);
        if (!fs.existsSync(sourcePath)) {
          _failed++;
          continue;
        }

        // Get the original filename
        const originalFilename = path.basename(sourcePath);

        // Create the new path
        const newRelativePath = `/uploads/packages/${packageId}/${originalFilename}`;
        const newAbsolutePath = path.join(process.cwd(), 'public', newRelativePath);

        // Copy the file to the new location
        fs.copyFileSync(sourcePath, newAbsolutePath);

        // Update the database with new path
        await query(
          'UPDATE package_images SET image_path = ? WHERE id = ?',
          [newRelativePath, image.id]
        );

        _migrated++;
      } catch {
        _failed++;
      }
    }


    // Migration completed

  } catch {
    // Migration failed
  }
}

// Execute if this file is run directly
if (require.main === module) {
  migratePackageImages()
    .then(() => process.exit(0))
    .catch(() => {
      process.exit(1);
    });
}

export default migratePackageImages;