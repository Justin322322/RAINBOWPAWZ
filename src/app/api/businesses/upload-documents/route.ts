import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { query } from '@/lib/db';

// Function to save file to disk
async function saveFile(file: File, userId: string, documentType: string): Promise<string> {
  try {
    
    // Create directories if they don't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'businesses', userId);
    await mkdir(uploadsDir, { recursive: true });

    // Get file data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create file name with timestamp to avoid collisions
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return the relative path for database storage
    return `/uploads/businesses/${userId}/${fileName}`;
  } catch (error) {
    throw new Error(`Failed to save ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: Request) {
  
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    
    // Get user ID from form data
    const userId = formData.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Convert userId to string if it's not already
    const userIdStr = userId.toString();

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

    // Check if we should use service_providers table
    const useServiceProvidersTable = true; // Default to service_providers table
    const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';

    // Check if a business profile exists for this user
    let businessCheck = await query(
      `SELECT id, name, application_status FROM ${tableName} WHERE user_id = ?`,
      [userIdStr]
    ) as any[];

    let businessProfileId;

    // If no business found, create one
    if (!businessCheck || businessCheck.length === 0) {
      
      try {
        // Create service provider name from user's name or default
        const providerName = user.first_name 
          ? `${user.first_name} ${user.last_name || ''}`.trim() 
          : 'New Cremation Service';
        
        // Insert a new service provider record
        const insertResult = await query(
          `INSERT INTO ${tableName} (user_id, name, provider_type, application_status, created_at, updated_at) 
           VALUES (?, ?, 'cremation', 'pending', NOW(), NOW())`,
          [userIdStr, providerName]
        ) as any;
        
        
        if (insertResult && insertResult.insertId) {
          businessProfileId = insertResult.insertId;
        } else {
          // Fetch the newly created record if insertId not available
          const newBusinessCheck = await query(
            `SELECT id FROM ${tableName} WHERE user_id = ?`,
            [userIdStr]
          ) as any[];
          
          
          if (!newBusinessCheck || newBusinessCheck.length === 0) {
            return NextResponse.json({
              error: 'Failed to create service provider record'
            }, { status: 500 });
          }
          
          businessProfileId = newBusinessCheck[0].id;
        }
      } catch (err) {
        return NextResponse.json({
          error: 'Failed to create service provider record'
        }, { status: 500 });
      }
    } else {
      // Use existing business profile
      businessProfileId = businessCheck[0].id;
    }

    // Process and save uploaded files
    const filePaths: Record<string, string> = {};
    let documentsUploaded = false;

    // Process Business Permit
    const businessPermit = formData.get('businessPermit') as File | null;
    if (businessPermit && businessPermit instanceof File && businessPermit.size > 0) {
      filePaths.businessPermitPath = await saveFile(businessPermit, userIdStr, 'business_permit');
      documentsUploaded = true;
    }

    // Process BIR Certificate
    const birCertificate = formData.get('birCertificate') as File | null;
    if (birCertificate && birCertificate instanceof File && birCertificate.size > 0) {
      filePaths.birCertificatePath = await saveFile(birCertificate, userIdStr, 'bir_certificate');
      documentsUploaded = true;
    }

    // Process Government ID
    const governmentId = formData.get('governmentId') as File | null;
    if (governmentId && governmentId instanceof File && governmentId.size > 0) {
      filePaths.governmentIdPath = await saveFile(governmentId, userIdStr, 'government_id');
      documentsUploaded = true;
    }

    if (!documentsUploaded) {
      return NextResponse.json({
        error: 'No valid documents were uploaded'
      }, { status: 400 });
    }

    // Check columns in the target table
    const columnsResult = await query(`SHOW COLUMNS FROM ${tableName}`) as any[];
    const columns = columnsResult.map((col: any) => col.Field);
    
    // Update business record with document paths
    const updateFields = [];
    const updateValues = [];

    // Only update fields that exist in the table and have files
    if (filePaths.businessPermitPath && columns.includes('business_permit_path')) {
      updateFields.push('business_permit_path = ?');
      updateValues.push(filePaths.businessPermitPath);
    } else if (filePaths.businessPermitPath) {
    }

    if (filePaths.birCertificatePath && columns.includes('bir_certificate_path')) {
      updateFields.push('bir_certificate_path = ?');
      updateValues.push(filePaths.birCertificatePath);
    } else if (filePaths.birCertificatePath) {
    }

    if (filePaths.governmentIdPath && columns.includes('government_id_path')) {
      updateFields.push('government_id_path = ?');
      updateValues.push(filePaths.governmentIdPath);
    } else if (filePaths.governmentIdPath) {
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
      const updateQuery = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
      
      try {
        const updateResult = await query(
          updateQuery,
          [...updateValues, businessProfileId]
        );
        
        // Verify if the update was successful
        const verifyResult = await query(
          `SELECT id, business_permit_path, bir_certificate_path, government_id_path FROM ${tableName} WHERE id = ?`,
          [businessProfileId]
        ) as any[];
        
        if (verifyResult && verifyResult.length > 0) {
        } else {
        }
        
      } catch (updateError) {
        return NextResponse.json({
          error: `Failed to update ${tableName} record`,
          details: updateError instanceof Error ? updateError.message : 'Unknown error'
        }, { status: 500 });
      }
      
    } else {
    }

    // Update user role to 'business' if not already set
    if (user.role !== 'business' && user.role !== 'admin') {
      try {
        const roleUpdateResult = await query(
          `UPDATE users SET role = 'business', updated_at = NOW() WHERE id = ?`,
          [userIdStr]
        );
      } catch (roleUpdateError) {
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