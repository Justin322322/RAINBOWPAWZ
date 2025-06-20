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
    console.log('=== DELETE IMAGE API CALLED ===');
    
    const { id } = await params;
    const packageId = Number(id);
    console.log('Package ID:', packageId);
    
    if (isNaN(packageId)) {
      console.log('Invalid package ID provided:', id);
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Get the image path from the request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { imagePath } = body;
    console.log('Image path to delete (from frontend):', imagePath);
    
    // Convert API path to database path
    const dbImagePath = convertApiPathToDbPath(imagePath);
    console.log('Converted database path:', dbImagePath);

    if (!imagePath) {
      console.log('No image path provided in request');
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }

    // Authenticate user
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token found:', !!authToken);
    
    if (!authToken) {
      console.log('No auth token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse auth token to handle both JWT and old formats
    const authData = await parseAuthTokenAsync(authToken);
    console.log('Auth data parsed:', !!authData, authData ? { userId: authData.userId, accountType: authData.accountType } : null);
    
    if (!authData) {
      console.log('Failed to parse auth token');
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { userId, accountType } = authData;

    if (accountType !== 'business') {
      console.log('User is not a business account:', accountType);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user owns this package
    console.log('Checking package ownership for userId:', userId, 'packageId:', packageId);
    const packageOwner = await query(
      `SELECT sp.provider_id 
       FROM service_packages sp 
       JOIN service_providers srv ON sp.provider_id = srv.provider_id 
       WHERE sp.package_id = ? AND srv.user_id = ?`,
      [packageId, userId]
    ) as any[];

    console.log('Package ownership query result:', packageOwner);

    if (!packageOwner.length) {
      console.log('User does not own this package or package not found');
      return NextResponse.json({ error: 'Package not found or access denied' }, { status: 403 });
    }

    // Check if image exists in database using the converted database path
    console.log('Checking if image exists in database');
    const imageRecord = await query(
      'SELECT image_id FROM package_images WHERE package_id = ? AND image_path = ?',
      [packageId, dbImagePath]
    ) as any[];

    console.log('Image record query result:', imageRecord);

    if (!imageRecord.length) {
      console.log('Image not found in database');
      console.log('Searched for path:', dbImagePath);
      
      // Let's also search for any image paths for this package to help debugging
      const allImages = await query(
        'SELECT image_path FROM package_images WHERE package_id = ?',
        [packageId]
      ) as any[];
      console.log('All images for this package in database:', allImages);
      
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from database using the database path
    console.log('Deleting image from database');
    const deleteResult = await query(
      'DELETE FROM package_images WHERE package_id = ? AND image_path = ?',
      [packageId, dbImagePath]
    );

    console.log('Database deletion result:', deleteResult);

    // Delete physical file from server using the database path
    try {
      const fullPath = join(process.cwd(), 'public', dbImagePath);
      console.log('Attempting to delete file at:', fullPath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Successfully deleted image file: ${fullPath}`);
      } else {
        console.log(`File does not exist: ${fullPath}`);
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue even if file deletion fails - the database record is already removed
    }

    console.log('=== IMAGE DELETION SUCCESSFUL ===');
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