import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('Pet image upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    const { userId, accountType } = user;

    // Only fur parent accounts can upload pet images
    if (accountType !== 'user') {
      console.log('Non-user access attempt:', accountType);
      return NextResponse.json({
        error: 'Only fur parent accounts can upload pet images'
      }, { status: 403 });
    }

    // Get form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const petId = formData.get('petId') as string | null;
    console.log('Form data parsed:', { hasFile: !!file, petId });

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
      // Check if petId is provided and is valid
      let petIdInt = 0;
      if (petId) {
        petIdInt = parseInt(petId);
        if (isNaN(petIdInt)) {
          console.log('Invalid pet ID, defaulting to 0:', petId);
          petIdInt = 0;
        } else {
          console.log('Valid pet ID:', petIdInt);
        }
      } else {
        console.log('No pet ID provided, using temporary storage');
      }

      // Convert file to base64 for database storage
      console.log('Converting file to base64...');
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${fileType};base64,${base64Data}`;
      
      console.log('File converted to base64, size:', base64Data.length);

      // If petId is provided, save in database
      if (petId && !isNaN(petIdInt)) {
        console.log('Saving image to database for pet:', petId);
        
        // Check if pet belongs to this user
        console.log('Checking pet ownership...');
        const petResult = await query(
          'SELECT user_id FROM pets WHERE pet_id = ?',
          [petIdInt]
        ) as any[];
        console.log('Pet lookup result:', petResult);

        if (petResult && petResult.length > 0 && petResult[0].user_id === userId) {
          console.log('Pet ownership verified, saving image...');

          // Update pet with image data
          const updateResult = await query(
            'UPDATE pets SET profile_picture = ? WHERE pet_id = ?',
            [dataUrl, petIdInt]
          );
          console.log('Pet image updated in database:', updateResult);

          return NextResponse.json({
            success: true,
            filePath: `pet_${petIdInt}_${Date.now()}.${fileType.split('/')[1]}`,
            message: 'Pet image uploaded and stored in database'
          });
        } else {
          console.log('Pet ownership verification failed or pet not found');
          return NextResponse.json({
            error: 'Pet not found or access denied'
          }, { status: 403 });
        }
      } else {
        console.log('No valid pet ID provided, returning base64 data');
        return NextResponse.json({
          success: true,
          filePath: `temp_pet_${userId}_${Date.now()}.${fileType.split('/')[1]}`,
          imageData: dataUrl,
          message: 'Pet image converted to base64 (temporary storage)'
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
    console.error('Error in pet image upload:', error);
    
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

export const config = {
  api: {
    bodyParser: false,
  },
};
