// Simple script to migrate package images to new folder structure
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration
let db = null;

async function connectToDatabase() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbowpaws',
    };
    
    console.log('Connecting to database...');
    db = await mysql.createConnection(config);
    console.log('Database connected!');
    return true;
  } catch (err) {
    console.error('Error connecting to database:', err);
    return false;
  }
}

async function fetchPackageImages() {
  try {
    const [rows] = await db.query(
      'SELECT pi.id, pi.package_id, pi.image_path FROM package_images pi'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching package images:', error);
    return [];
  }
}

async function updateImagePath(id, newPath) {
  try {
    await db.query(
      'UPDATE package_images SET image_path = ? WHERE id = ?',
      [newPath, id]
    );
    return true;
  } catch (error) {
    console.error(`Error updating image path for ID ${id}:`, error);
    return false;
  }
}

async function migratePackageImages() {
  console.log('Starting package image migration...');
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.error('Failed to connect to database. Migration aborted.');
    return;
  }
  
  try {
    // Get all package images from database
    const images = await fetchPackageImages();
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
        let sourcePath;
        if (currentPath.startsWith('/')) {
          sourcePath = path.join(process.cwd(), 'public', currentPath);
        } else {
          sourcePath = path.join(process.cwd(), 'public', '/', currentPath);
        }
        
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
        const updated = await updateImagePath(image.id, newRelativePath);
        if (updated) {
          console.log(`Updated database for image ID ${image.id} to new path: ${newRelativePath}`);
          migrated++;
        } else {
          console.error(`Failed to update database for image ID ${image.id}`);
          failed++;
        }
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
  } finally {
    // Close database connection
    if (db) {
      await db.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the migration
migratePackageImages()
  .then(() => console.log('Script execution completed'))
  .catch(error => {
    console.error('Error in migration script:', error);
    process.exit(1);
  }); 