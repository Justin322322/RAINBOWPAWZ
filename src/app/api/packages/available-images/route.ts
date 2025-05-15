import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route to scan available package images in the uploads folder
 * This helps the frontend find and display images properly
 */
export async function GET(request: NextRequest) {
  try {
    // Create a map to store package images by package ID
    const imageMap: Record<string, string[]> = {};
    
    // Path to package uploads
    const packagesBasePath = path.join(process.cwd(), 'public', 'uploads', 'packages');
    
    // Check if the base directory exists
    if (!fs.existsSync(packagesBasePath)) {
      console.log('Packages directory does not exist:', packagesBasePath);
      return NextResponse.json({
        success: true,
        message: 'No packages directory found',
        images: {}
      });
    }
    
    // Read the base directory
    const entries = fs.readdirSync(packagesBasePath, { withFileTypes: true });
    
    // Process each entry
    for (const entry of entries) {
      const entryPath = path.join(packagesBasePath, entry.name);
      
      if (entry.isDirectory()) {
        // This is a package directory (named by package ID)
        const packageId = entry.name;
        
        try {
          // Read files in this package directory
          const files = fs.readdirSync(entryPath);
          
          // Filter for image files
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          });
          
          // Convert to web paths
          const imagePaths = imageFiles.map(file => 
            `/uploads/packages/${packageId}/${file}`
          );
          
          // Add to the map
          if (imagePaths.length > 0) {
            imageMap[packageId] = imagePaths;
          }
        } catch (error) {
          console.error(`Error reading package directory ${packageId}:`, error);
        }
      } else if (entry.isFile()) {
        // This is a file directly in the packages folder (old structure)
        // Try to extract package ID from filename
        
        const fileName = entry.name;
        let packageId = null;
        
        // Pattern: package_ID_timestamp.ext
        const packageMatch = fileName.match(/package_(\d+)_/);
        if (packageMatch && packageMatch[1]) {
          packageId = packageMatch[1];
        }
        
        if (packageId) {
          if (!imageMap[packageId]) {
            imageMap[packageId] = [];
          }
          
          const filePath = `/uploads/packages/${fileName}`;
          imageMap[packageId].push(filePath);
        }
      }
    }
    
    // Scan the root directory for any leftover images
    const rootFiles = entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => `/uploads/packages/${file}`);
    
    // Add a special key for root files
    if (rootFiles.length > 0) {
      imageMap['root'] = rootFiles;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Available package images retrieved successfully',
      images: imageMap
    });
  } catch (error) {
    console.error('Error retrieving available package images:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve available package images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 