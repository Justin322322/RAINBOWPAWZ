import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';
import { getImagePath, getProductionImagePath } from '@/utils/imagePathUtils';

/**
 * API route to diagnose image path issues
 * This helps identify problems with image paths in production
 */
export async function GET(request: NextRequest) {
  try {
    // Get the path from the URL
    const imagePath = request.nextUrl.searchParams.get('path') || '';
    
    // Check if the path is empty
    if (!imagePath) {
      return NextResponse.json({
        error: 'No image path provided',
        usage: 'Add ?path=/uploads/your-image-path to the URL'
      }, { status: 400 });
    }
    
    // Get the converted path
    const apiPath = getImagePath(imagePath);
    const productionPath = getProductionImagePath(imagePath);
    
    // Check if the original file exists
    const originalFullPath = join(process.cwd(), 'public', imagePath);
    const originalExists = fs.existsSync(originalFullPath);
    
    // If it's an API path, check if the file exists in the uploads directory
    let apiFullPath = '';
    let apiExists = false;
    
    if (apiPath.startsWith('/api/image/')) {
      // Extract the path after /api/image/
      const uploadPath = apiPath.substring('/api/image/'.length);
      // Construct the full path
      apiFullPath = join(process.cwd(), 'public', 'uploads', uploadPath);
      apiExists = fs.existsSync(apiFullPath);
    }
    
    // Get environment information
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'unknown',
      cwd: process.cwd(),
    };
    
    // Return the diagnostic information
    return NextResponse.json({
      originalPath: imagePath,
      apiPath,
      productionPath,
      pathChecks: {
        originalExists,
        originalFullPath,
        apiExists,
        apiFullPath,
      },
      environment,
    });
  } catch (error) {
    console.error('Error in image path diagnostics:', error);
    return NextResponse.json({
      error: 'Error diagnosing image paths',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
