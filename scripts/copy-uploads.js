/**
 * Script to copy the uploads directory to the standalone output directory
 * This ensures that uploaded files are available in production
 * Enhanced with better logging and error handling
 */

const fs = require('fs');
const path = require('path');

// Function to recursively copy a directory
function copyDirectory(source, destination) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    console.log(`Creating directory: ${destination}`);
    fs.mkdirSync(destination, { recursive: true });
  }

  // Get all files and directories in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  console.log(`Found ${entries.length} entries in ${source}`);

  // Copy each entry
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      console.log(`Processing directory: ${entry.name}`);
      copyDirectory(sourcePath, destinationPath);
    } else {
      // Copy files
      console.log(`Copying file: ${entry.name}`);
      fs.copyFileSync(sourcePath, destinationPath);

      // Verify the file was copied correctly
      if (fs.existsSync(destinationPath)) {
        const sourceSize = fs.statSync(sourcePath).size;
        const destSize = fs.statSync(destinationPath).size;

        if (sourceSize !== destSize) {
          console.warn(`Warning: File size mismatch for ${entry.name}. Source: ${sourceSize}, Destination: ${destSize}`);
        }
      } else {
        console.error(`Error: Failed to copy ${entry.name} to ${destinationPath}`);
      }
    }
  }
}

// Function to check file permissions
function checkPermissions(directory) {
  try {
    // Create a test file to check write permissions
    const testFile = path.join(directory, '.permission-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    console.error(`Permission error on ${directory}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  try {
    console.log('=== Image File Copy Process ===');
    console.log('Copying uploads directory to standalone output...');

    // Define paths
    const sourceDir = path.join(process.cwd(), 'public', 'uploads');
    const destinationDir = path.join(process.cwd(), '.next', 'standalone', 'public', 'uploads');

    console.log(`Source directory: ${sourceDir}`);
    console.log(`Destination directory: ${destinationDir}`);

    // Check if the source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.log('Uploads directory does not exist, creating it...');
      fs.mkdirSync(sourceDir, { recursive: true });
    }

    // Check if the destination parent directory exists
    const destParent = path.join(process.cwd(), '.next', 'standalone', 'public');
    if (!fs.existsSync(destParent)) {
      console.log(`Creating parent directory: ${destParent}`);
      fs.mkdirSync(destParent, { recursive: true });
    }

    // Check permissions
    console.log('Checking directory permissions...');
    const sourcePermissionsOk = checkPermissions(path.join(process.cwd(), 'public'));
    const destPermissionsOk = checkPermissions(path.join(process.cwd(), '.next', 'standalone'));

    if (!sourcePermissionsOk) {
      console.warn('Warning: Source directory may have permission issues');
    }

    if (!destPermissionsOk) {
      console.warn('Warning: Destination directory may have permission issues');
    }

    // Copy the directory
    copyDirectory(sourceDir, destinationDir);

    // Verify the copy was successful
    if (fs.existsSync(destinationDir)) {
      console.log('Uploads directory copied successfully.');

      // Count files in both directories
      let sourceCount = 0;
      let destCount = 0;

      function countFiles(dir) {
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            count += countFiles(fullPath);
          } else {
            count++;
          }
        }

        return count;
      }

      if (fs.existsSync(sourceDir)) {
        sourceCount = countFiles(sourceDir);
      }

      if (fs.existsSync(destinationDir)) {
        destCount = countFiles(destinationDir);
      }

      console.log(`Source files: ${sourceCount}, Destination files: ${destCount}`);

      if (sourceCount !== destCount) {
        console.warn(`Warning: File count mismatch. Some files may not have been copied correctly.`);
      } else {
        console.log('All files copied successfully!');
      }
    } else {
      console.error('Error: Destination directory does not exist after copy operation');
    }

    console.log('Successfully completed the copy process.');
  } catch (error) {
    console.error('Error copying uploads directory:', error);
    process.exit(1);
  }
}

// Run the main function
main();
