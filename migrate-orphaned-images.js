#!/usr/bin/env node
// Script to clean up orphaned package images (not yet in their package-specific folders)
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

async function getPackages() {
  try {
    const [rows] = await db.query('SELECT id FROM service_packages');
    return rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return [];
  }
}

async function updateImagePath(oldPath, newPath) {
  try {
    const [result] = await db.query(
      'UPDATE package_images SET image_path = ? WHERE image_path = ?',
      [newPath, oldPath]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`Error updating image path from ${oldPath} to ${newPath}:`, error);
    return false;
  }
}

async function cleanupOrphanedImages() {
  console.log('Starting orphaned image cleanup...');
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.error('Failed to connect to database. Cleanup aborted.');
    return;
  }
  
  try {
    // Get all valid package IDs
    const packageIds = await getPackages();
    console.log(`Found ${packageIds.length} valid packages`);
    
    // Set up statistics
    let processed = 0;
    let moved = 0;
    let skipped = 0;
    let errors = 0;
    
    // Path to packages folder
    const packagesDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    
    // Ensure the packages directory exists
    if (!fs.existsSync(packagesDir)) {
      console.log(`Creating packages directory: ${packagesDir}`);
      fs.mkdirSync(packagesDir, { recursive: true });
    }
    
    try {
      // Get all files in the packages directory
      const files = fs.readdirSync(packagesDir);
      
      console.log(`Found ${files.length} files/folders in packages directory`);
      
      // Process each file that isn't a directory (these would be orphaned files)
      for (const filename of files) {
        const filePath = path.join(packagesDir, filename);
        
        // Skip directories (these are already organized by package ID)
        if (fs.statSync(filePath).isDirectory()) {
          console.log(`Skipping directory: ${filename}`);
          continue;
        }
        
        processed++;
        
        // Extract package ID from filename patterns
        let packageId = null;
        
        // Try pattern: package_PACKAGEID_TIMESTAMP.ext
        const packageMatch = filename.match(/package_(\d+)_/);
        if (packageMatch && packageMatch[1]) {
          packageId = parseInt(packageMatch[1]);
        }
        
        // If no package ID was found, skip this file
        if (!packageId) {
          console.log(`Skipping file with no package ID: ${filename}`);
          skipped++;
          continue;
        }
        
        // Check if the package ID is valid
        if (!packageIds.includes(packageId)) {
          console.log(`Skipping file with invalid package ID: ${filename} (ID: ${packageId})`);
          skipped++;
          continue;
        }
        
        // Create package directory if it doesn't exist
        const packageDir = path.join(packagesDir, packageId.toString());
        if (!fs.existsSync(packageDir)) {
          fs.mkdirSync(packageDir, { recursive: true });
          console.log(`Created directory for package ${packageId}`);
        }
        
        // Move the file to the package directory
        const sourcePath = filePath;
        const destPath = path.join(packageDir, filename);
        const oldRelativePath = `/uploads/packages/${filename}`;
        const newRelativePath = `/uploads/packages/${packageId}/${filename}`;
        
        try {
          // Copy the file
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied file: ${sourcePath} -> ${destPath}`);
          
          // Update path in database
          const updated = await updateImagePath(oldRelativePath, newRelativePath);
          if (updated) {
            console.log(`Updated database path: ${oldRelativePath} -> ${newRelativePath}`);
            
            // Delete the original file
            fs.unlinkSync(sourcePath);
            console.log(`Deleted original file: ${sourcePath}`);
            moved++;
          } else {
            console.log(`No database records found for path: ${oldRelativePath}`);
            // Keep the original if no database record was updated
          }
        } catch (error) {
          console.error(`Error moving file ${filename}:`, error);
          errors++;
        }
      }
    } catch (fsError) {
      console.error(`Error reading packages directory:`, fsError);
    }
    
    console.log('\n---- Cleanup Summary ----');
    console.log(`Total files processed: ${processed}`);
    console.log(`Files moved to package folders: ${moved}`);
    console.log(`Files skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    console.log('\nCleanup completed!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    // Close database connection
    if (db) {
      await db.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the cleanup
cleanupOrphanedImages()
  .then(() => console.log('Script execution completed'))
  .catch(error => {
    console.error('Error executing cleanup script:', error);
    process.exit(1);
  }); 