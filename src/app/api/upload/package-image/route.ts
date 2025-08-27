import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('Package image upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    const { userId, accountType } = user;

    // Only business accounts can upload package images
    if (accountType !== 'business') {
      console.log('Non-business access attempt:', accountType);
      return NextResponse.json({
        error: 'Only business accounts can upload package images'
      }, { status: 403 });
    }

    // Get provider ID
    console.log('Looking up service provider for user:', userId);
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ?',
      [userId]
    ) as any[];
    console.log('Provider lookup result:', providerResult);

    if (!providerResult || providerResult.length === 0) {
      console.log('Service provider not found for user:', userId);
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].provider_id;
    console.log('Provider ID found:', providerId);

    // Get form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const packageId = formData.get('packageId') as string | null;
    console.log('Form data parsed:', { hasFile: !!file, packageId });

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file size
    console.log('File validation:', { size: file.size, type: file.type, maxSize: MAX_FILE_SIZE });
    if (file.size > MAX_FILE_SIZE) {
      console.log('File size exceeds limit:', file.size);
      return NextResponse.json({
        error: 'File size exceeds the limit (5MB)'
      }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      console.log('Invalid file type:', fileType);
      return NextResponse.json({
        error: 'Only image files are allowed'
      }, { status: 400 });
    }

    try {
      // Check if packageId is provided and is valid
      let packageIdInt = 0;
      if (packageId) {
        packageIdInt = parseInt(packageId);
        if (isNaN(packageIdInt)) {
          console.log('Invalid package ID, defaulting to 0:', packageId);
          packageIdInt = 0;
        } else {
          console.log('Valid package ID:', packageIdInt);
        }
      } else {
        console.log('No package ID provided, using temporary storage');
      }

      // Convert file to base64 for database storage
      console.log('Converting file to base64...');
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${fileType};base64,${base64Data}`;
      
      console.log('File converted to base64, size:', base64Data.length);

      // If packageId is provided, save in database
      if (packageId && !isNaN(packageIdInt)) {
        console.log('Saving image to database for package:', packageId);
        
        // Check if package belongs to this provider
        console.log('Checking package ownership...');
        const packageResult = await query(
          'SELECT provider_id FROM service_packages WHERE package_id = ?',
          [packageIdInt]
        ) as any[];
        console.log('Package lookup result:', packageResult);

        if (packageResult && packageResult.length > 0 && packageResult[0].provider_id === providerId) {
          console.log('Package ownership verified, saving image...');

          // Get the current max display order
          const orderResult = await query(
            'SELECT MAX(display_order) as max_order FROM package_images WHERE package_id = ?',
            [packageIdInt]
          ) as any[];
          console.log('Display order result:', orderResult);

          const displayOrder = orderResult[0].max_order ? orderResult[0].max_order + 1 : 1;
          console.log('Calculated display order:', displayOrder);

          // Save image data in database
          const insertResult = await query(
            'INSERT INTO package_images (package_id, image_path, display_order, image_data) VALUES (?, ?, ?, ?)',
            [packageIdInt, `package_${packageIdInt}_${Date.now()}.${fileType.split('/')[1]}`, displayOrder, dataUrl]
          );
          console.log('Image saved to database:', insertResult);

          return NextResponse.json({
            success: true,
            filePath: `package_${packageIdInt}_${Date.now()}.${fileType.split('/')[1]}`,
            message: 'Image uploaded and stored in database'
          });
        } else {
          console.log('Package ownership verification failed or package not found');
          return NextResponse.json({
            error: 'Package not found or access denied'
          }, { status: 403 });
        }
      } else {
        console.log('No valid package ID provided, returning base64 data');
        return NextResponse.json({
          success: true,
          filePath: `temp_package_${providerId}_${Date.now()}.${fileType.split('/')[1]}`,
          imageData: dataUrl,
          message: 'Image converted to base64 (temporary storage)'
        });
      }

    } catch (error) {
      console.error('Error in file processing:', error);
      
      // Log additional details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      return NextResponse.json({
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in package image upload:', error);
    
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({
      error: 'Failed to process file upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
