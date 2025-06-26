import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthTokenAsync } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';

// Helper function to convert API image path back to database path
function convertApiPathToDbPath(apiPath: string): string {
  // If it's already a database path (starts with /uploads/), return as is
  if (apiPath.startsWith('/uploads/')) {
    return apiPath;
  }
  
  // If it's an API path (/api/image/...), convert to database path
  if (apiPath.startsWith('/api/image/')) {
    // Remove /api/image/ and add /uploads/
    const pathAfterApi = apiPath.substring('/api/image/'.length);
    return `/uploads/${pathAfterApi}`;
  }
  
  // For any other format, assume it's already correct
  return apiPath;
}

// DELETE specific image from a package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    
    const { id } = await params;
    const packageId = Number(id);
    
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Get the image path from the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { imagePath } = body;

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }
    
    // Convert API path to database path
    const dbImagePath = convertApiPathToDbPath(imagePath);

    // Authenticate user
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse auth token to handle both JWT and old formats
    const authData = await parseAuthTokenAsync(authToken);
    
    if (!authData) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { userId, accountType } = authData;

    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user owns this package
    const packageOwner = await query(
      `SELECT sp.provider_id 
       FROM service_packages sp 
       JOIN service_providers srv ON sp.provider_id = srv.provider_id 
       WHERE sp.package_id = ? AND srv.user_id = ?`,
      [packageId, userId]
    ) as any[];


    if (!packageOwner.length) {
      return NextResponse.json({ error: 'Package not found or access denied' }, { status: 403 });
    }

    // Check if image exists in database using the converted database path
    const imageRecord = await query(
      'SELECT image_id FROM package_images WHERE package_id = ? AND image_path = ?',
      [packageId, dbImagePath]
    ) as any[];


    if (!imageRecord.length) {
      
      // Let's also search for any image paths for this package to help debugging
      const _allImages = await query(
        'SELECT image_path FROM package_images WHERE package_id = ?',
        [packageId]
      ) as any[];
      
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from database using the database path
    const _deleteResult = await query(
      'DELETE FROM package_images WHERE package_id = ? AND image_path = ?',
      [packageId, dbImagePath]
    );


    // Delete physical file from server using the database path
    try {
      const fullPath = join(process.cwd(), 'public', dbImagePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      } else {
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue even if file deletion fails - the database record is already removed
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('=== ERROR IN DELETE IMAGE API ===');
    console.error('Error deleting package image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 