import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';
import * as fs from 'fs';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('Package image upload request received');
    
    // Check authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      console.log('Unauthorized: No auth token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log(`User ID: ${userId}, Account Type: ${accountType}`);
    
    // Only business accounts can upload package images
    if (accountType !== 'business') {
      console.log(`Unauthorized access: account type ${accountType} is not business`);
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
      console.log(`Business profile not found for user ID: ${userId}`);
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].id;
    console.log(`Provider ID: ${providerId}`);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const packageId = formData.get('packageId') as string | null;
    
    console.log(`File upload for package ID: ${packageId || 'new package'}`);
    
    if (!file) {
      console.log('No file provided in form data');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.log(`File size ${file.size} exceeds limit of ${MAX_FILE_SIZE}`);
      return NextResponse.json({ 
        error: 'File size exceeds the limit (5MB)' 
      }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      console.log(`Invalid file type: ${fileType}`);
      return NextResponse.json({ 
        error: 'Only image files are allowed' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = fileType.split('/')[1];
    
    try {
      // Check if packageId is provided and is valid
      let packageIdInt = 0;
      if (packageId) {
        packageIdInt = parseInt(packageId);
        if (isNaN(packageIdInt)) {
          packageIdInt = 0;
        }
      }
      
      // Define paths based on package ID
      const baseDir = join(process.cwd(), 'public', 'uploads', 'packages');
      let packageDir = baseDir;
      let filename = '';
      let relativePath = '';
      
      // If we have a valid package ID, create a package-specific directory
      if (packageIdInt > 0) {
        packageDir = join(baseDir, packageIdInt.toString());
        filename = `${providerId}_${timestamp}.${fileExtension}`;
        relativePath = `/uploads/packages/${packageIdInt}/${filename}`;
      } else {
        // No package ID yet, store in temporary location
        filename = `package_${providerId}_${timestamp}.${fileExtension}`;
        relativePath = `/uploads/packages/${filename}`;
      }
      
      // Create base directory if it doesn't exist
      if (!fs.existsSync(baseDir)) {
        console.log(`Creating base directory: ${baseDir}`);
        await mkdir(baseDir, { recursive: true });
      }
      
      // Create package-specific directory if needed
      if (packageIdInt > 0 && !fs.existsSync(packageDir)) {
        console.log(`Creating package directory: ${packageDir}`);
        await mkdir(packageDir, { recursive: true });
      }
      
      // Write file to directory
      const filePath = join(packageIdInt > 0 ? packageDir : baseDir, filename);
      console.log(`Writing file to: ${filePath}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      
      console.log(`File saved successfully. Relative path: ${relativePath}`);
      
      // If packageId is provided, save in database
      if (packageId) {
        if (!isNaN(packageIdInt)) {
          // Check if package belongs to this provider
          const packageResult = await query(
            'SELECT service_provider_id FROM service_packages WHERE id = ?',
            [packageIdInt]
          ) as any[];
          
          if (packageResult && packageResult.length > 0 && packageResult[0].service_provider_id === providerId) {
            console.log(`Saving image association for package ID: ${packageIdInt}`);
            
            // Get the current max display order
            const orderResult = await query(
              'SELECT MAX(display_order) as max_order FROM package_images WHERE package_id = ?',
              [packageIdInt]
            ) as any[];
            
            const displayOrder = orderResult[0].max_order ? orderResult[0].max_order + 1 : 1;
            
            // Save image path in database
            await query(
              'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
              [packageIdInt, relativePath, displayOrder]
            );
            
            console.log(`Image association saved with display order: ${displayOrder}`);
          } else {
            console.log(`Package ID ${packageIdInt} does not belong to provider ${providerId} or does not exist`);
          }
        } else {
          console.log(`Invalid package ID format: ${packageId}`);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        filePath: relativePath 
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return NextResponse.json({ 
        error: 'Failed to save file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      error: 'Failed to process file upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 