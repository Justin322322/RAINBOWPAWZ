import fs from 'fs';
import { join } from 'path';
import { promises as fsPromises } from 'fs';

/**
 * Utility function to clean up old files in a directory
 * @param userId User ID to identify which directory to clean
 * @param dirType Type of directory (e.g., 'profile-pictures', 'documents')
 * @param keepLatestFile Whether to keep the latest file (default: false)
 * @returns Promise resolving to an array of deleted file paths
 */
export async function cleanupOldFiles(
  userId: string, 
  dirType: 'profile-pictures' | 'documents' | 'admin-profile-pictures',
  keepLatestFile: boolean = false
): Promise<string[]> {
  try {
    // Create path to the directory
    const directory = join(process.cwd(), 'public', 'uploads', dirType, userId);
    
    // Check if directory exists
    if (!fs.existsSync(directory)) {
      console.log(`Directory ${directory} does not exist, nothing to clean up.`);
      return [];
    }
    
    // Get all files in the directory
    const files = await fsPromises.readdir(directory);
    
    if (files.length === 0) {
      console.log(`No files found in ${directory}.`);
      return [];
    }
    
    // If we need to keep the latest file, sort files by modification time
    let filesToDelete = [...files];
    
    if (keepLatestFile && files.length > 0) {
      // Get file stats
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = join(directory, file);
          const stats = await fsPromises.stat(filePath);
          return {
            name: file,
            mtime: stats.mtime.getTime(),
            path: filePath
          };
        })
      );
      
      // Sort files by modification time (newest first)
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      // Remove the newest file from the list to delete
      const latestFile = fileStats[0].name;
      filesToDelete = files.filter(file => file !== latestFile);
      
      console.log(`Keeping latest file: ${latestFile}`);
    }
    
    // Delete the files
    const deletedFiles: string[] = [];
    
    for (const file of filesToDelete) {
      const filePath = join(directory, file);
      await fsPromises.unlink(filePath);
      deletedFiles.push(filePath);
      console.log(`Deleted old file: ${filePath}`);
    }
    
    return deletedFiles;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return [];
  }
}

/**
 * Gets the current profile picture path from the database
 * @param userId User ID to get profile picture for
 * @returns Promise resolving to the profile picture path or null
 */
export async function getCurrentProfilePicturePath(userId: string): Promise<string | null> {
  try {
    // This function would require database access, so it's left as a placeholder
    // In a real implementation, you would query the database for the user's profile picture path
    return null;
  } catch (error) {
    console.error('Error getting current profile picture path:', error);
    return null;
  }
} 