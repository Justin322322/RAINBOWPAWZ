import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifySecureAuth } from '@/lib/secureAuth';

// Function to save file to disk
async function saveFile(file: File, userId: string, documentType: string): Promise<string> {
  try {

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '_').toLowerCase();
    const extension = originalName.split('.').pop() || 'jpg';
    const filename = `${documentType}_${timestamp}.${extension}`;

    // Create the directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents', userId);

    // Ensure directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

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
    // Verify authentication using secure JWT
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Use the authenticated user ID from JWT token instead of form data
    const authenticatedUserId = authResult.userId;

    // Parse the multipart form data
    const formData = await request.formData();

    // Get user ID from form data for validation (optional)
    const formUserId = formData.get('userId');

    // Security check: ensure the form user ID matches the authenticated user ID
    if (formUserId && formUserId.toString() !== authenticatedUserId.toString()) {
      return NextResponse.json({
        error: 'User ID mismatch. Please try logging in again.'
      }, { status: 403 });
    }

    // Use the authenticated user ID
    const userIdStr = authenticatedUserId.toString();

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
      // Use existing business profile
      businessProfileId = businessCheck[0].provider_id;
    }

    // Process and save uploaded files
    const filePaths: Record<string, string> = {};
    let documentsUploaded = false;

    // Process Business Permit
    const businessPermit = formData.get('businessPermit') as File | null;
    if (businessPermit && businessPermit instanceof File && businessPermit.size > 0) {
      filePaths.business_permit_path = await saveFile(businessPermit, userIdStr, 'business_permit');
      documentsUploaded = true;
    }

    // Process BIR Certificate
    const birCertificate = formData.get('birCertificate') as File | null;
    if (birCertificate && birCertificate instanceof File && birCertificate.size > 0) {
      filePaths.bir_certificate_path = await saveFile(birCertificate, userIdStr, 'bir_certificate');
      documentsUploaded = true;
    }

    // Process Government ID
    const governmentId = formData.get('governmentId') as File | null;
    if (governmentId && governmentId instanceof File && governmentId.size > 0) {
      filePaths.government_id_path = await saveFile(governmentId, userIdStr, 'government_id');
      documentsUploaded = true;
    }

    if (!documentsUploaded) {
      return NextResponse.json({
        error: 'No valid documents were uploaded'
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

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      filePaths
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process document upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
