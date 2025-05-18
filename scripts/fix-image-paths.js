/**
 * Script to fix image paths in the database
 * This ensures that all image paths are in the correct format for production
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: process.env.DB_PORT || 3306,
};

// Function to check if a file exists
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Image Path Fixer ===');
  console.log('This script will fix image paths in the database and ensure files exist');
  
  let connection;
  
  try {
    // Connect to the database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    // Get all package images from the database
    console.log('Fetching package images from database...');
    const [rows] = await connection.execute('SELECT id, package_id, image_path FROM package_images');
    console.log(`Found ${rows.length} package images in the database`);
    
    // Process each image
    let fixedCount = 0;
    let missingCount = 0;
    
    for (const row of rows) {
      const { id, package_id, image_path } = row;
      
      // Skip if image_path is null
      if (!image_path) {
        console.log(`Skipping image with ID ${id} because image_path is null`);
        continue;
      }
      
      console.log(`Processing image ID ${id} with path: ${image_path}`);
      
      // Check if the file exists
      const publicPath = path.join(process.cwd(), 'public', image_path);
      const fileExistsResult = await fileExists(publicPath);
      
      if (!fileExistsResult) {
        console.log(`Warning: File does not exist at ${publicPath}`);
        missingCount++;
        
        // Try to find the file in alternative locations
        let found = false;
        
        // If the path is like /uploads/packages/1/image.jpg, try /uploads/packages/image.jpg
        if (image_path.includes('/packages/') && image_path.split('/').length > 4) {
          const parts = image_path.split('/');
          const packageId = parts[3];
          const filename = parts[4];
          
          // Try without package ID folder
          const altPath1 = `/uploads/packages/${filename}`;
          const altFullPath1 = path.join(process.cwd(), 'public', altPath1);
          
          if (await fileExists(altFullPath1)) {
            console.log(`Found file at alternative path: ${altFullPath1}`);
            
            // Update the database with the correct path
            await connection.execute(
              'UPDATE package_images SET image_path = ? WHERE id = ?',
              [altPath1, id]
            );
            
            console.log(`Updated image path in database: ${image_path} -> ${altPath1}`);
            fixedCount++;
            found = true;
          }
        }
        
        if (!found) {
          console.log(`Could not find file for image ID ${id} in any alternative location`);
        }
      } else {
        console.log(`File exists at ${publicPath}`);
      }
    }
    
    console.log('\nSummary:');
    console.log(`Total images processed: ${rows.length}`);
    console.log(`Images fixed: ${fixedCount}`);
    console.log(`Images missing: ${missingCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
    }
  }
  
  console.log('Script completed');
}

// Run the main function
main().catch(console.error);
