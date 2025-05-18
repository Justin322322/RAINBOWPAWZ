import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Route to scan available package images in the uploads folder
 * This helps the frontend find and display images properly
 */
export async function GET(request: NextRequest) {
  try {
    // Get package ID from query parameters
    const packageId = request.nextUrl.searchParams.get('id');

    // Create a map to store package images by package ID
    const imageMap: Record<string, string[]> = {};

    // Path to package uploads
    const packagesBasePath = path.join(process.cwd(), 'public', 'uploads', 'packages');

    // Check if the base directory exists
    if (!fs.existsSync(packagesBasePath)) {

      // If there's a specific package ID, return an array of fallback images
      if (packageId) {
        // Use an image that definitely exists in the public folder
        const fallbackImage = `/bg_4.png`;
        return NextResponse.json({
          success: true,
          message: 'Using fallback image',
          imagesFound: [fallbackImage]
        });
      }

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
        const dirPackageId = entry.name;

        try {
          // Read files in this package directory
          const files = fs.readdirSync(entryPath);

          // Filter for image files
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
          });

          // Convert to API-served paths for better production compatibility
          const imagePaths = imageFiles.map(file =>
            `/api/image/packages/${dirPackageId}/${file}`
          );

          // Add to the map
          if (imagePaths.length > 0) {
            imageMap[dirPackageId] = imagePaths;
          }
        } catch (error) {
        }
      } else if (entry.isFile()) {
        // This is a file directly in the packages folder (old structure)
        // Try to extract package ID from filename

        const fileName = entry.name;
        let filePackageId = null;

        // Pattern: package_ID_timestamp.ext
        const packageMatch = fileName.match(/package_(\d+)_/);
        if (packageMatch && packageMatch[1]) {
          filePackageId = packageMatch[1];
        }

        // Also check for filenames that are just the ID
        if (!filePackageId) {
          const idMatch = fileName.match(/^(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
          if (idMatch && idMatch[1]) {
            filePackageId = idMatch[1];
          }
        }

        if (filePackageId) {
          if (!imageMap[filePackageId]) {
            imageMap[filePackageId] = [];
          }

          const filePath = `/api/image/packages/${fileName}`;
          imageMap[filePackageId].push(filePath);
        }
      }
    }

    // If a specific package ID was requested, return only those images
    if (packageId) {
      const packageImages = imageMap[packageId] || [];

      // If no images found, provide fallback
      if (packageImages.length === 0) {

        // Use an image that definitely exists in the public folder
        const fallbackImage = `/bg_4.png`;

        return NextResponse.json({
          success: true,
          message: 'No images found, using fallback',
          imagesFound: [fallbackImage]
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Images found for requested package',
        imagesFound: packageImages
      });
    }

    // If no specific package ID, return the entire map
    return NextResponse.json({
      success: true,
      message: 'Available package images retrieved successfully',
      images: imageMap
    });
  } catch (error) {

    // If specific package ID was requested, provide a fallback
    const packageId = request.nextUrl.searchParams.get('id');
    if (packageId) {
      // Use an image that definitely exists in the public folder
      const fallbackImage = `/bg_4.png`;

      return NextResponse.json({
        success: true,
        message: 'Error occurred, using fallback image',
        imagesFound: [fallbackImage]
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve available package images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}