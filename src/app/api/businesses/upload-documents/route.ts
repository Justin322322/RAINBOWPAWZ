import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Function to save file to disk
async function saveFile(file: File, userId: string, documentType: string): Promise<string> {
  try {
    console.log(`Saving file: ${file.name} for user ${userId} as ${documentType}`);

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
    console.log(`File saved successfully at: ${relativePath}`);

    return relativePath;
  } catch (error) {
    console.error(`Failed to save ${documentType}:`, error);
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
      `SELECT provider_id, name, application_status FROM ${tableName} WHERE user_id = ?`,
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
          `INSERT INTO ${tableName} (user_id, name, provider_type, application_status)
           VALUES (?, ?, 'cremation', 'pending')`,
          [userIdStr, providerName]
        ) as any;


        if (insertResult && insertResult.insertId) {
          businessProfileId = insertResult.insertId;
        } else {
          // Fetch the newly created record if insertId not available
          const newBusinessCheck = await query(
            `SELECT provider_id FROM ${tableName} WHERE user_id = ?`,
            [userIdStr]
          ) as any[];


          if (!newBusinessCheck || newBusinessCheck.length === 0) {
            return NextResponse.json({
              error: 'Failed to create service provider record'
            }, { status: 500 });
          }

          businessProfileId = newBusinessCheck[0].provider_id;
        }
      } catch (_err) {
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

    // Check columns in the target table
    const columnsResult = await query(`SHOW COLUMNS FROM ${tableName}`) as any[];
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
      console.log("Update fields:", updateFields);
      console.log("Update values:", updateValues);
      console.log("Business profile ID:", businessProfileId);

      const updateQuery = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE provider_id = ?`;

      try {
        const updateResult = await query(
          updateQuery,
          [...updateValues, businessProfileId]
        );

        console.log("Update result:", updateResult);

        // Verify if the update was successful
        const verifyResult = await query(
          `SELECT provider_id, business_permit_path, bir_certificate_path, government_id_path FROM ${tableName} WHERE provider_id = ?`,
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
        await query(
          `UPDATE users SET role = 'business' WHERE user_id = ?`,
          [userIdStr]
        );
      } catch (_roleUpdateError) {
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