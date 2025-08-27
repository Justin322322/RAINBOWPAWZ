import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

// Maximum file size (10MB for documents)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('Business document upload started');
    
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      console.log('Authentication failed - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('User authenticated:', { userId: user.userId, accountType: user.accountType });
    
    const { userId, accountType } = user;

    // Only business accounts can upload documents
    if (accountType !== 'business') {
      console.log('Non-business access attempt:', accountType);
      return NextResponse.json({
        error: 'Only business accounts can upload documents'
      }, { status: 403 });
    }

    // Get form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string | null;
    console.log('Form data parsed:', { hasFile: !!file, documentType });

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!documentType) {
      console.log('No document type specified');
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Check file size
    console.log('File validation:', { size: file.size, type: file.type, maxSize: MAX_FILE_SIZE });
    if (file.size > MAX_FILE_SIZE) {
      console.log('File size exceeds limit:', file.size);
      return NextResponse.json({
        error: 'File size exceeds the limit (10MB)'
      }, { status: 400 });
    }

    // Check file type - allow common document formats
    const fileType = file.type;
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(fileType)) {
      console.log('Invalid file type:', fileType);
      return NextResponse.json({
        error: 'Invalid file type. Only PDF, Word documents, and images are allowed.'
      }, { status: 400 });
    }

    try {
      // Convert file to base64 for database storage
      console.log('Converting file to base64...');
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${fileType};base64,${base64Data}`;
      
      console.log('File converted to base64, size:', base64Data.length);

      // Get business ID for this user
      console.log('Looking up business for user:', userId);
      const businessResult = await query(
        'SELECT business_id FROM businesses WHERE user_id = ?',
        [userId]
      ) as any[];
      console.log('Business lookup result:', businessResult);

      if (!businessResult || businessResult.length === 0) {
        console.log('Business not found for user:', userId);
        return NextResponse.json({
          error: 'Business not found'
        }, { status: 404 });
      }

      const businessId = businessResult[0].business_id;
      console.log('Business ID found:', businessId);

      // Save document in database
      console.log('Saving document to database...');
      const insertResult = await query(
        'INSERT INTO business_documents (business_id, document_type, file_name, file_data, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [businessId, documentType, file.name, dataUrl, fileType, file.size]
      ) as any;
      console.log('Document saved to database:', insertResult);

      // Return success response
      return NextResponse.json({
        success: true,
        filePath: `document_${businessId}_${Date.now()}_${file.name}`,
        message: 'Document uploaded and stored in database',
        documentId: insertResult.insertId
      });

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
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in business document upload:', error);
    
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
