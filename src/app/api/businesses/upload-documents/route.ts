import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifySecureAuth } from '@/lib/secureAuth';

// Function to save file to disk
async function saveFile(file: File, userId: string, documentType: string): Promise<string> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Only JPG, PNG, and PDF files are allowed.`);
    }

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop() || 'jpg';
    
    // Validate extension matches file type
    const validExtensions = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'application/pdf': ['pdf']
    };
    
    const allowedExtensions = validExtensions[file.type as keyof typeof validExtensions];
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} doesn't match file type ${file.type}`);
    }
    
    const filename = `${documentType}_${timestamp}.${extension}`;

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents', userId);

    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (dirError) {
        throw new Error(`Failed to create upload directory: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
      }
    }

    // Test directory write permissions
    try {
      const testFile = join(uploadsDir, '.write-test');
      await writeFile(testFile, 'test');
      // Clean up test file
      try {
        const { unlink } = await import('fs/promises');
        await unlink(testFile);
      } catch {
        // Ignore cleanup errors
      }
    } catch (permError) {
      throw new Error(`Upload directory is not writable: ${permError instanceof Error ? permError.message : 'Permission denied'}`);
    }

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Verify file was written successfully
    if (!existsSync(filePath)) {
      throw new Error('File was not saved successfully');
    }

    // Return the relative path
    const relativePath = `/uploads/documents/${userId}/${filename}`;

    return relativePath;
  } catch (error) {
    console.error(`Failed to save ${documentType}:`, error);
    throw new Error(`Failed to save ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data first
    const formData = await request.formData();
    
    // Get user ID from form data
    const formUserId = formData.get('userId');
    
    if (!formUserId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Try to verify authentication using secure JWT
    const authResult = await verifySecureAuth(request);
    
    let userIdStr: string;
    
    if (authResult) {
      // Use the authenticated user ID from JWT token
      const authenticatedUserId = authResult.userId;
      
      // Security check: ensure the form user ID matches the authenticated user ID
      if (formUserId.toString() !== authenticatedUserId.toString()) {
        return NextResponse.json({
          error: 'User ID mismatch. Please try logging in again.'
        }, { status: 403 });
      }
      
      userIdStr = authenticatedUserId.toString();
    } else {
      // For new registrations, allow upload with form user ID but add extra validation
      userIdStr = formUserId.toString();
      
      // Validate that the user exists and was recently created (within last 5 minutes)
      const userExists = await query(
        'SELECT user_id, created_at FROM users WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)',
        [userIdStr]
      ) as any[];
      
      if (!userExists || userExists.length === 0) {
        return NextResponse.json({
          error: 'Invalid user ID or session expired. Please try logging in.'
        }, { status: 401 });
      }
    }

    // Verify user exists
    const userCheck = await query(
      `SELECT user_id, first_name, last_name, email, role FROM users WHERE user_id = ?`,
      [userIdStr]
    ) as any[];

    if (!userCheck || userCheck.length === 0) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    const user = userCheck[0];

    // SECURITY FIX: Use hardcoded table name instead of dynamic template
    // Check if a business profile exists for this user in service_providers table
    let businessCheck = await query(
      'SELECT provider_id, name, application_status FROM service_providers WHERE user_id = ?',
      [userIdStr]
    ) as any[];

    let businessProfileId: number;

    // If no business found, create one
    if (!businessCheck || businessCheck.length === 0) {
      // Wait a bit to allow registration transaction to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to find the service provider record again
      businessCheck = await query(
        'SELECT provider_id, name, application_status FROM service_providers WHERE user_id = ?',
        [userIdStr]
      ) as any[];
      
      // If still not found, create a new one
      if (!businessCheck || businessCheck.length === 0) {
        try {
          // Create service provider name from user's name or default
          const providerName = user.first_name
            ? `${user.first_name} ${user.last_name || ''}`.trim()
            : 'New Cremation Service';

          // Insert a new service provider record
          const insertResult = await query(
            'INSERT INTO service_providers (user_id, name, provider_type, application_status) VALUES (?, ?, ?, ?)',
            [userIdStr, providerName, 'cremation', 'pending']
          ) as any;

          if (insertResult && insertResult.insertId) {
            businessProfileId = insertResult.insertId;
          } else {
            // Fetch the newly created record if insertId not available
            const newBusinessCheck = await query(
              'SELECT provider_id FROM service_providers WHERE user_id = ?',
              [userIdStr]
            ) as any[];

            if (!newBusinessCheck || newBusinessCheck.length === 0) {
              return NextResponse.json({
                error: 'Failed to create service provider record'
              }, { status: 500 });
            }

            businessProfileId = newBusinessCheck[0].provider_id;
          }
        } catch {
          return NextResponse.json({
            error: 'Failed to create service provider record'
          }, { status: 500 });
        }
      } else {
        // Found it on retry, use existing record
        businessProfileId = businessCheck[0].provider_id;
      }
    } else {
      // Use existing business profile
      businessProfileId = businessCheck[0].provider_id;
    }

    // Process and save uploaded files
    const filePaths: Record<string, string> = {};
    let documentsUploaded = false;
    const uploadErrors: string[] = [];

    // Process Business Permit
    const businessPermit = formData.get('businessPermit') as File | null;
    if (businessPermit && businessPermit instanceof File && businessPermit.size > 0) {
      try {
        // Validate file size (10MB limit)
        if (businessPermit.size > 10 * 1024 * 1024) {
          uploadErrors.push('Business permit file is too large (max 10MB)');
        } else {
          filePaths.business_permit_path = await saveFile(businessPermit, userIdStr, 'business_permit');
          documentsUploaded = true;
        }
      } catch (error) {
        uploadErrors.push(`Failed to upload business permit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process BIR Certificate
    const birCertificate = formData.get('birCertificate') as File | null;
    if (birCertificate && birCertificate instanceof File && birCertificate.size > 0) {
      try {
        // Validate file size (10MB limit)
        if (birCertificate.size > 10 * 1024 * 1024) {
          uploadErrors.push('BIR certificate file is too large (max 10MB)');
        } else {
          filePaths.bir_certificate_path = await saveFile(birCertificate, userIdStr, 'bir_certificate');
          documentsUploaded = true;
        }
      } catch (error) {
        uploadErrors.push(`Failed to upload BIR certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process Government ID
    const governmentId = formData.get('governmentId') as File | null;
    if (governmentId && governmentId instanceof File && governmentId.size > 0) {
      try {
        // Validate file size (10MB limit)
        if (governmentId.size > 10 * 1024 * 1024) {
          uploadErrors.push('Government ID file is too large (max 10MB)');
        } else {
          filePaths.government_id_path = await saveFile(governmentId, userIdStr, 'government_id');
          documentsUploaded = true;
        }
      } catch (error) {
        uploadErrors.push(`Failed to upload government ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (!documentsUploaded && uploadErrors.length === 0) {
      return NextResponse.json({
        error: 'No valid documents were uploaded'
      }, { status: 400 });
    }

    if (uploadErrors.length > 0 && !documentsUploaded) {
      return NextResponse.json({
        error: 'All document uploads failed',
        details: uploadErrors
      }, { status: 400 });
    }

    // Check columns in the service_providers table
    const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];
    const columns = columnsResult.map((col: any) => col.Field);

    // Update business record with document paths
    const updateFields = [];
    const updateValues = [];

    // Only update fields that exist in the table and have files
    if (filePaths.business_permit_path && columns.includes('business_permit_path')) {
      updateFields.push('business_permit_path = ?');
      updateValues.push(filePaths.business_permit_path);
    } else if (filePaths.business_permit_path) {
    }

    if (filePaths.bir_certificate_path && columns.includes('bir_certificate_path')) {
      updateFields.push('bir_certificate_path = ?');
      updateValues.push(filePaths.bir_certificate_path);
    } else if (filePaths.bir_certificate_path) {
    }

    if (filePaths.government_id_path && columns.includes('government_id_path')) {
      updateFields.push('government_id_path = ?');
      updateValues.push(filePaths.government_id_path);
    } else if (filePaths.government_id_path) {
    }

    // Add status update if the column exists
    if (columns.includes('application_status')) {
      updateFields.push('application_status = ?');
      updateValues.push('pending');
    } else if (columns.includes('verification_status')) {
      updateFields.push('verification_status = ?');
      updateValues.push('pending');
    } else if (columns.includes('status')) {
      updateFields.push('status = ?');
      updateValues.push('pending');
    }

    // Also update updated_at timestamp if it exists
    if (columns.includes('updated_at')) {
      updateFields.push('updated_at = NOW()');
    }

    if (updateFields.length > 0) {
      // Log the update query for debugging

      const updateQuery = `UPDATE service_providers SET ${updateFields.join(', ')} WHERE provider_id = ?`;

      try {
        const _updateResult = await query(
          updateQuery,
          [...updateValues, businessProfileId]
        );


        // Verify if the update was successful
        const verifyResult = await query(
          'SELECT provider_id, business_permit_path, bir_certificate_path, government_id_path FROM service_providers WHERE provider_id = ?',
          [businessProfileId]
        ) as any[];

        if (verifyResult && verifyResult.length > 0) {
        } else {
        }

      } catch (updateError) {
        return NextResponse.json({
          error: 'Failed to update service provider record',
          details: updateError instanceof Error ? updateError.message : 'Unknown error'
        }, { status: 500 });
      }

    } else {
    }

    // Update user role to 'business' if not already set
    if (user.role !== 'business' && user.role !== 'admin') {
      try {
        await query(
          `UPDATE users SET role = 'business' WHERE user_id = ?`,
          [userIdStr]
        );
      } catch {
      }
    }

    const successMessage = uploadErrors.length > 0 
      ? `Some documents uploaded successfully. Issues: ${uploadErrors.join(', ')}`
      : 'Documents uploaded successfully';

    return NextResponse.json({
      success: true,
      message: successMessage,
      filePaths,
      warnings: uploadErrors.length > 0 ? uploadErrors : undefined
    }, { status: 200 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: 'Failed to process document upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
