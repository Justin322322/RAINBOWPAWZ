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
    
    // Check if directory exists (async version for better performance)
    try {
      await fsPromises.access(directory);
    } catch {
      return [];
    }
    
    // Get all files in the directory
    const files = await fsPromises.readdir(directory);
    
    if (files.length === 0) {
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
      
    }
    
    // Delete the files
    const deletedFiles: string[] = [];
    
    for (const file of filesToDelete) {
      const filePath = join(directory, file);
      await fsPromises.unlink(filePath);
      deletedFiles.push(filePath);
    }
    
    return deletedFiles;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    return [];
  }
}

