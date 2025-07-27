import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';

/**
 * API route to serve images directly from the server
 * This bypasses Next.js static file handling which can be problematic in production
 * Enhanced with better error handling and logging
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the path from the URL - ensure params is awaited
    const pathParams = await Promise.resolve(params);
    const imagePath = pathParams.path.join('/');


    // Construct the full path to the image
    const fullPath = join(process.cwd(), 'public', 'uploads', imagePath);

    // Additional paths to try in production environments
    const possiblePaths = [
      fullPath,
      // Try without 'public' in the path (for standalone mode)
      join(process.cwd(), 'uploads', imagePath),
      // Try in the .next/server directory
      join(process.cwd(), '.next', 'server', 'public', 'uploads', imagePath),
      // Try in the .next/standalone directory
      join(process.cwd(), '.next', 'standalone', 'public', 'uploads', imagePath),
      // Try in the root directory
      join('/', 'uploads', imagePath),

      // Additional paths for documents - handle full document paths
      join(process.cwd(), 'public', 'uploads', imagePath),
      join(process.cwd(), 'uploads', imagePath),
      join(process.cwd(), '.next', 'server', 'public', 'uploads', imagePath),
      join(process.cwd(), '.next', 'standalone', 'public', 'uploads', imagePath),

      // Try document paths with just filename
      join(process.cwd(), 'public', 'documents', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'documents', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'server', 'public', 'documents', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'standalone', 'public', 'documents', imagePath.split('/').pop() || ''),
      join('/', 'documents', imagePath.split('/').pop() || ''),

      // Try business document paths
      join(process.cwd(), 'public', 'uploads', 'business', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'uploads', 'business', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'public', 'uploads', 'businesses', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'uploads', 'businesses', imagePath.split('/').pop() || ''),

      // Try pet image paths
      join(process.cwd(), 'public', 'uploads', 'pets', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'uploads', 'pets', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'server', 'public', 'uploads', 'pets', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'standalone', 'public', 'uploads', 'pets', imagePath.split('/').pop() || ''),
      join('/', 'uploads', 'pets', imagePath.split('/').pop() || ''),

      // Try profile picture paths
      join(process.cwd(), 'public', 'uploads', 'profile-pictures', imagePath.split('/').pop() || ''),
      join(process.cwd(), 'uploads', 'profile-pictures', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'server', 'public', 'uploads', 'profile-pictures', imagePath.split('/').pop() || ''),
      join(process.cwd(), '.next', 'standalone', 'public', 'uploads', 'profile-pictures', imagePath.split('/').pop() || ''),
      join('/', 'uploads', 'profile-pictures', imagePath.split('/').pop() || ''),
    ];

    // Check all possible paths
    let foundPath = '';
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        foundPath = path;
        break;
      }
    }

    if (foundPath) {
      // Read the file from the found path
      const image = fs.readFileSync(foundPath);

      // Determine the content type
      const extension = foundPath.split('.').pop()?.toLowerCase() || '';
      let contentType = getContentType(extension);

      // Determine cache control based on image type
      // Package images should have shorter cache to allow for updates
      const isPackageImage = imagePath.includes('packages/');
      const cacheControl = isPackageImage
        ? 'public, max-age=10, s-maxage=10' // Short cache for package images
        : 'public, max-age=60, s-maxage=60'; // Normal cache for other images

      // Return the image with appropriate headers
      return new NextResponse(image, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
        },
      });
    }

    // If still not found, return a fallback image
    const fallbackPath = join(process.cwd(), 'public', 'bg_4.png');
    if (fs.existsSync(fallbackPath)) {
      const fallbackImage = fs.readFileSync(fallbackPath);
      const isPackageImage = imagePath.includes('packages/');
      const cacheControl = isPackageImage
        ? 'public, max-age=10, s-maxage=10'
        : 'public, max-age=60, s-maxage=60';
      return new NextResponse(fallbackImage, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': cacheControl,
        },
      });
    }

    // If fallback doesn't exist, return a default image
    const defaultImagePath = join(process.cwd(), 'public', 'bg_4.png');
    if (fs.existsSync(defaultImagePath)) {
      const defaultImage = fs.readFileSync(defaultImagePath);
      return new NextResponse(defaultImage, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Final fallback - return 404
    return new NextResponse('Image not found', { status: 404 });

    // This code should never be reached since we check all paths above
    // But keeping it for backward compatibility
    if (fs.existsSync(fullPath)) {
      // Read the file
      const image = fs.readFileSync(fullPath);

      // Determine the content type based on file extension
      const extension = fullPath.split('.').pop()?.toLowerCase() || '';
      let contentType = getContentType(extension);


      // Determine cache control based on image type
      const isPackageImage = imagePath.includes('packages/');
      const cacheControl = isPackageImage
        ? 'public, max-age=10, s-maxage=10'
        : 'public, max-age=60, s-maxage=60';

      // Return the image with appropriate headers
      return new NextResponse(image, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
        },
      });
    }

    // If we get here, return a 404
    return new NextResponse('Image not found', { status: 404 });
  } catch (error) {
    console.error('Error serving image:', error);

    // Try to return a fallback image even on error
    try {
      const fallbackPath = join(process.cwd(), 'public', 'bg_4.png');
      if (fs.existsSync(fallbackPath)) {
        const fallbackImage = fs.readFileSync(fallbackPath);
        const isPackageImage = imagePath.includes('packages/');
        const cacheControl = isPackageImage
          ? 'public, max-age=10, s-maxage=10'
          : 'public, max-age=60, s-maxage=60';
        return new NextResponse(fallbackImage, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': cacheControl,
          },
        });
      }
    } catch (fallbackError) {
      console.error('Error serving fallback image:', fallbackError);
    }

    return new NextResponse('Error serving image', { status: 500 });
  }
}

/**
 * Helper function to determine content type from file extension
 */
function getContentType(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'image/jpeg'; // Default
  }
}
