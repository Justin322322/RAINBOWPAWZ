import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Maximum file size (10MB for documents)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('Business document upload started');
    
    // Get form data first to check if userId is provided directly
    const formData = await request.formData();
    const directUserId = formData.get('userId') as string | null;
    
    let userId: string;
    let accountType: string;
    
    if (directUserId) {
      // During registration, userId is provided directly
      console.log('Direct user ID provided during registration:', directUserId);
      userId = directUserId;
      accountType = 'business'; // During registration, we know it's a business account
      
      // Security check: verify the user exists and is a business account
      try {
        const userCheckResult = await query(
          'SELECT u.role, sp.provider_id FROM users u LEFT JOIN service_providers sp ON u.user_id = sp.user_id WHERE u.user_id = ?',
          [userId]
        ) as any[];
        
        if (!userCheckResult || userCheckResult.length === 0) {
          console.log('User not found during direct upload:', userId);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        if (userCheckResult[0].role !== 'business') {
          console.log('User is not a business account:', userId);
          return NextResponse.json({ error: 'Only business accounts can upload documents' }, { status: 403 });
        }
        
        if (!userCheckResult[0].provider_id) {
          console.log('Service provider record not found for user:', userId);
          return NextResponse.json({ error: 'Service provider record not found' }, { status: 404 });
        }
        
        console.log('Direct user validation successful:', { userId, accountType });
      } catch (validationError) {
        console.error('Error validating direct user:', validationError);
        return NextResponse.json({ error: 'Failed to validate user account' }, { status: 500 });
      }
    } else {
      // Normal flow: use secure authentication
      const user = await verifySecureAuth(request);
      if (!user) {
        console.log('Authentication failed - no valid user');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      console.log('User authenticated via session:', { userId: user.userId, accountType: user.accountType });
      userId = user.userId;
      accountType = user.accountType;
    }

    // Only business accounts can upload documents
    if (accountType !== 'business') {
      console.log('Non-business access attempt:', accountType);
      return NextResponse.json({
        error: 'Only business accounts can upload documents'
      }, { status: 403 });
    }
    
    // Handle multiple document types
    const businessPermit = formData.get('businessPermit') as File | null;
    const birCertificate = formData.get('birCertificate') as File | null;
    const governmentId = formData.get('governmentId') as File | null;
    
    console.log('Form data parsed:', { 
      hasBusinessPermit: !!businessPermit, 
      hasBirCertificate: !!birCertificate, 
      hasGovernmentId: !!governmentId 
    });

    // Check if at least one file is provided
    if (!businessPermit && !birCertificate && !governmentId) {
      console.log('No files uploaded');
      return NextResponse.json({ error: 'At least one document must be uploaded' }, { status: 400 });
    }

    // Validate files
    const filesToProcess = [];
    if (businessPermit) filesToProcess.push({ file: businessPermit, type: 'businessPermit' });
    if (birCertificate) filesToProcess.push({ file: birCertificate, type: 'birCertificate' });
    if (governmentId) filesToProcess.push({ file: governmentId, type: 'governmentId' });

    // Check file sizes and types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    for (const { file, type } of filesToProcess) {
      console.log(`File validation for ${type}:`, { size: file.size, type: file.type, maxSize: MAX_FILE_SIZE });
      
      if (file.size > MAX_FILE_SIZE) {
        console.log(`File size exceeds limit for ${type}:`, file.size);
        return NextResponse.json({
          error: `File size exceeds the limit (10MB) for ${type}`
        }, { status: 400 });
      }

      if (!allowedTypes.includes(file.type)) {
        console.log(`Invalid file type for ${type}:`, file.type);
        return NextResponse.json({
          error: `Invalid file type for ${type}. Only PDF, Word documents, and images are allowed.`
        }, { status: 400 });
      }
    }

    try {
      // Get service provider for this user
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

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents', userId.toString());
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch {
        // Directory might already exist, that's fine
      }

      // Process each file and save to filesystem
      const filePaths: any = {};
      const timestamp = Date.now();

      for (const { file, type } of filesToProcess) {
        console.log(`Processing ${type} file...`);
        
        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${type}_${timestamp}.${fileExtension}`;
        const filePath = join(uploadsDir, fileName);
        const publicPath = `/uploads/documents/${userId}/${fileName}`;

        // Save file to filesystem
        const arrayBuffer = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(arrayBuffer));
        
        console.log(`File saved: ${publicPath}`);
        
        // Map to database column names
        if (type === 'businessPermit') {
          filePaths.business_permit_path = publicPath;
        } else if (type === 'birCertificate') {
          filePaths.bir_certificate_path = publicPath;
        } else if (type === 'governmentId') {
          filePaths.government_id_path = publicPath;
        }
      }

      // Update service provider with new file paths
      const updateFields = [];
      const updateValues = [];
      
      if (filePaths.business_permit_path) {
        updateFields.push('business_permit_path = ?');
        updateValues.push(filePaths.business_permit_path);
      }
      if (filePaths.bir_certificate_path) {
        updateFields.push('bir_certificate_path = ?');
        updateValues.push(filePaths.bir_certificate_path);
      }
      if (filePaths.government_id_path) {
        updateFields.push('government_id_path = ?');
        updateValues.push(filePaths.government_id_path);
      }

      if (updateFields.length > 0) {
        updateValues.push(providerId);
        const updateQuery = `UPDATE service_providers SET ${updateFields.join(', ')} WHERE provider_id = ?`;
        
        console.log('Updating service provider with file paths:', updateQuery, updateValues);
        await query(updateQuery, updateValues);
      }

      // Return success response
      console.log('Upload successful, returning file paths:', filePaths);
      return NextResponse.json({
        success: true,
        filePaths,
        message: 'Documents uploaded successfully'
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
        error: 'Failed to process documents',
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
