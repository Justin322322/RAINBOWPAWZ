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
    // Parse the multipart form data first
    const formData = await request.formData();
    
    // Get user ID from form data (this is needed for new registrations)
    const formUserId = formData.get('userId');
    
    let userIdStr: string;
    
    // For new registrations, we might not have JWT auth yet, so use form data
    if (formUserId) {
      userIdStr = formUserId.toString();
      
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
    } else {
      // Try to verify authentication using secure JWT for existing users
      const authResult = await verifySecureAuth(request);
      if (!authResult) {
        return NextResponse.json({
          error: 'Authentication required'
        }, { status: 401 });
      }
      userIdStr = authResult.userId.toString();
    }

    // Get user details
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
      } catch (createError) {
        console.error('Error creating service provider:', createError);
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
    }

    if (filePaths.bir_certificate_path && columns.includes('bir_certificate_path')) {
      updateFields.push('bir_certificate_path = ?');
      updateValues.push(filePaths.bir_certificate_path);
    }

    if (filePaths.government_id_path && columns.includes('government_id_path')) {
      updateFields.push('government_id_path = ?');
      updateValues.push(filePaths.government_id_path);
    }

    // Add updated_at timestamp
    if (columns.includes('updated_at')) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
    }

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE service_providers SET ${updateFields.join(', ')} WHERE user_id = ?`;
      updateValues.push(userIdStr);

      try {
        const updateResult = await query(updateQuery, updateValues);
        
      } catch (updateError) {
        console.error('Failed to update service provider with document paths:', updateError);
        // Don't throw error here, just log it
      }
    } else {
      console.log('No fields to update for user:', userIdStr);
    }

    // Update user role to 'business' if not already set
    if (user.role !== 'business' && user.role !== 'admin') {
      try {
        await query(
          `UPDATE users SET role = 'business' WHERE user_id = ?`,
          [userIdStr]
        );
      } catch (roleUpdateError) {
        console.error('Failed to update user role:', roleUpdateError);
        // Don't throw error here, just log it
      }
    }

    // Return success response with document paths
    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      documents: {
        business_permit_path: filePaths.business_permit_path || null,
        bir_certificate_path: filePaths.bir_certificate_path || null,
        government_id_path: filePaths.government_id_path || null
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: 'Failed to process document upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
