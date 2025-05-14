import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    
    // Only business accounts can upload package images
    if (accountType !== 'business') {
      return NextResponse.json({ 
        error: 'Only business accounts can upload package images' 
      }, { status: 403 });
    }

    // Get provider ID
    const providerResult = await query(
      'SELECT id FROM service_providers WHERE user_id = ?',
      [userId]
    ) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].id;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size exceeds the limit (5MB)' 
      }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Only image files are allowed' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = fileType.split('/')[1];
    const filename = `package_${providerId}_${timestamp}.${fileExtension}`;
    
    // Create directory path
    const dirPath = join(process.cwd(), 'public', 'uploads', 'packages');
    
    try {
      // Create directory if it doesn't exist
      await mkdir(dirPath, { recursive: true });
      
      // Write file to directory
      const filePath = join(dirPath, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      
      // Return the relative path to be stored in the database
      const relativePath = `/uploads/packages/${filename}`;
      
      return NextResponse.json({ 
        success: true, 
        filePath: relativePath 
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json({ 
        error: 'Failed to save file' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      error: 'Failed to process file upload' 
    }, { status: 500 });
  }
} 