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

    // Create file name
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to disk
    await writeFile(filePath, buffer);
    console.log(`File saved to ${filePath}`);

    // Return the relative path for database storage
    return `/uploads/businesses/${userId}/${fileName}`;
  } catch (error) {
    console.error(`Error saving file ${documentType}:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('Document upload API called');
  
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    console.log('Form data received keys:', Array.from(formData.keys()));
    
    // Get user ID from form data
    const userId = formData.get('userId');
    console.log('Received userId in formData:', userId);
    
    if (!userId) {
      console.error('No user ID provided in form data');
      return NextResponse.json({
        error: 'No user ID provided'
      }, { status: 400 });
    }

    // Convert userId to string if it's not already
    const userIdStr = userId.toString();
    console.log('Using userId as string:', userIdStr);

    // Check if we should use service_providers or business_profiles table
    const useServiceProvidersTable = true; // Default to service_providers table
    const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';
    console.log(`Using table: ${tableName}`);

    // Check if a business profile exists for this user
    console.log(`Checking for existing ${tableName} record for user ID: ${userIdStr}`);
    const businessCheck = await query(
      `SELECT id FROM ${tableName} WHERE user_id = ?`,
      [userIdStr]
    ) as any[];

    console.log(`${tableName} check result:`, businessCheck);

    // If no business found, try to create one for service providers
    if (!businessCheck || businessCheck.length === 0) {
      console.error(`No ${tableName} found with user_id: ${userIdStr}`);
      
      // If we didn't find an existing record, check if we need to create one
      if (useServiceProvidersTable) {
        // Check if user exists first
        const userCheck = await query(
          `SELECT id, first_name, last_name, email FROM users WHERE id = ?`,
          [userIdStr]
        ) as any[];
        
        console.log('User check result:', userCheck);
        
        if (!userCheck || userCheck.length === 0) {
          console.error(`User not found with ID: ${userIdStr}`);
          return NextResponse.json({
            error: 'User not found'
          }, { status: 404 });
        }
        
        // User exists, create service provider record
        const user = userCheck[0];
        console.log(`Creating new service provider record for user ${userIdStr} (${user.first_name} ${user.last_name})`);
        
        try {
          // Insert a new service provider record
          const insertResult = await query(
            `INSERT INTO service_providers (user_id, name, provider_type, application_status, created_at, updated_at) 
             VALUES (?, ?, 'cremation', 'pending', NOW(), NOW())`,
            [userIdStr, user.first_name ? `${user.first_name} ${user.last_name || ''}` : 'New Cremation Service']
          );
          
          console.log('Service provider insert result:', insertResult);
          
          // Get the newly created record
          const newBusinessCheck = await query(
            `SELECT id FROM ${tableName} WHERE user_id = ?`,
            [userIdStr]
          ) as any[];
          
          console.log('New business check result:', newBusinessCheck);
          
          if (!newBusinessCheck || newBusinessCheck.length === 0) {
            console.error('Failed to create service provider record');
            return NextResponse.json({
              error: 'Failed to create service provider record'
            }, { status: 500 });
          }
          
          businessCheck.push(newBusinessCheck[0]);
        } catch (err) {
          console.error('Error creating service provider record:', err);
          return NextResponse.json({
            error: 'Failed to create service provider record'
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          error: `${useServiceProvidersTable ? 'Service provider' : 'Business profile'} not found`
        }, { status: 404 });
      }
    }

    // Get the actual service provider or business profile ID
    const businessProfileId = businessCheck[0].id;
    console.log(`Found ${tableName} record with ID: ${businessProfileId}`);

    const filePaths: Record<string, string> = {};
    let documentsUploaded = false;

    // Process BIR Certificate
    const birCertificate = formData.get('birCertificate') as File;
    if (birCertificate && birCertificate instanceof File) {
      console.log(`Processing BIR Certificate: ${birCertificate.name}, size: ${birCertificate.size}`);
      filePaths.birCertificatePath = await saveFile(birCertificate, userIdStr, 'bir_certificate');
      documentsUploaded = true;
    }

    // Process Business Permit
    const businessPermit = formData.get('businessPermit') as File;
    if (businessPermit && businessPermit instanceof File) {
      console.log(`Processing Business Permit: ${businessPermit.name}, size: ${businessPermit.size}`);
      filePaths.businessPermitPath = await saveFile(businessPermit, userIdStr, 'business_permit');
      documentsUploaded = true;
    }

    // Process Government ID
    const governmentId = formData.get('governmentId') as File;
    if (governmentId && governmentId instanceof File) {
      console.log(`Processing Government ID: ${governmentId.name}, size: ${governmentId.size}`);
      filePaths.governmentIdPath = await saveFile(governmentId, userIdStr, 'government_id');
      documentsUploaded = true;
    }

    if (!documentsUploaded) {
      console.error('No documents were uploaded');
      return NextResponse.json({
        error: 'No documents were uploaded'
      }, { status: 400 });
    }

    // Check columns in the target table
    const columnsResult = await query(`SHOW COLUMNS FROM ${tableName}`) as any[];
    const columns = columnsResult.map((col: any) => col.Field);
    
    // Update business record with document paths
    const updateFields = [];
    const updateValues = [];

    // Only update fields that exist in the table
    if (filePaths.birCertificatePath && columns.includes('bir_certificate_path')) {
      updateFields.push('bir_certificate_path = ?');
      updateValues.push(filePaths.birCertificatePath);
    }

    if (filePaths.businessPermitPath && columns.includes('business_permit_path')) {
      updateFields.push('business_permit_path = ?');
      updateValues.push(filePaths.businessPermitPath);
    }

    if (filePaths.governmentIdPath && columns.includes('government_id_path')) {
      updateFields.push('government_id_path = ?');
      updateValues.push(filePaths.governmentIdPath);
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
      console.log(`Updating ${tableName} record with document paths`);
      const updateQuery = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log('Update query:', updateQuery);
      
      await query(
        updateQuery,
        [...updateValues, businessProfileId]
      );
      
      console.log(`Updated ${tableName} record ${businessProfileId} with document paths`);
    } else {
      console.warn(`No fields to update in ${tableName} record ${businessProfileId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      filePaths
    }, { status: 200 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: 'Document upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}