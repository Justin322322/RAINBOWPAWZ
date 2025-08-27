import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifySecureAuth } from '@/lib/secureAuth';

// Helper function to ensure directory exists with proper error handling
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    // Check if directory exists
    if (!existsSync(dirPath)) {
      console.log('Creating directory:', dirPath);
      await mkdir(dirPath, { recursive: true });
      console.log('Directory created successfully');
    } else {
      console.log('Directory already exists:', dirPath);
    }
    
    // Test write permissions
    const testFile = join(dirPath, '.write-test');
    try {
      await writeFile(testFile, 'test');
      await require('fs').promises.unlink(testFile);
      console.log('Directory is writable:', dirPath);
    } catch (permError) {
      console.error('Directory write permission test failed:', permError);
      throw new Error(`Directory ${dirPath} is not writable: ${permError instanceof Error ? permError.message : 'Permission denied'}`);
    }
  } catch (error) {
    console.error('Error ensuring directory exists:', dirPath, error);
    throw new Error(`Failed to create/verify directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

    // Ensure directory exists with proper error handling
    await ensureDirectoryExists(uploadsDir);

    // Create file path
    const filePath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Verify file was written successfully
    if (!existsSync(filePath)) {
      throw new Error('File was not saved successfully after write operation');
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

    // Parse the form data
    console.log('Parsing form data...');
    const formData = await request.formData();
    const businessPermit = formData.get('businessPermit') as File | null;
    const businessRegistration = formData.get('businessRegistration') as File | null;
    const taxCertificate = formData.get('taxCertificate') as File | null;
    const dtiCertificate = formData.get('dtiCertificate') as File | null;
    const mayorPermit = formData.get('mayorPermit') as File | null;
    const barangayClearance = formData.get('barangayClearance') as File | null;
    
    console.log('Form data parsed:', { 
      hasBusinessPermit: !!businessPermit,
      hasBusinessRegistration: !!businessRegistration,
      hasTaxCertificate: !!taxCertificate,
      hasDtiCertificate: !!dtiCertificate,
      hasMayorPermit: !!mayorPermit,
      hasBarangayClearance: !!barangayClearance
    });

    // Check if at least one document is provided
    if (!businessPermit && !businessRegistration && !taxCertificate && !dtiCertificate && !mayorPermit && !barangayClearance) {
      console.log('No documents provided');
      return NextResponse.json({
        error: 'At least one document must be provided'
      }, { status: 400 });
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

    // Save documents and collect paths
    const documentPaths: { [key: string]: string } = {};
    const errors: string[] = [];

    // Save business permit if provided
    if (businessPermit) {
      try {
        console.log('Saving business permit...');
        const path = await saveFile(businessPermit, userId, 'business_permit');
        documentPaths.business_permit = path;
        console.log('Business permit saved successfully');
      } catch (error) {
        console.error('Error saving business permit:', error);
        errors.push(`Business permit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save business registration if provided
    if (businessRegistration) {
      try {
        console.log('Saving business registration...');
        const path = await saveFile(businessRegistration, userId, 'business_registration');
        documentPaths.business_registration = path;
        console.log('Business registration saved successfully');
      } catch (error) {
        console.error('Error saving business registration:', error);
        errors.push(`Business registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save tax certificate if provided
    if (taxCertificate) {
      try {
        console.log('Saving tax certificate...');
        const path = await saveFile(taxCertificate, userId, 'tax_certificate');
        documentPaths.tax_certificate = path;
        console.log('Tax certificate saved successfully');
      } catch (error) {
        console.error('Error saving tax certificate:', error);
        errors.push(`Tax certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save DTI certificate if provided
    if (dtiCertificate) {
      try {
        console.log('Saving DTI certificate...');
        const path = await saveFile(dtiCertificate, userId, 'dti_certificate');
        documentPaths.dti_certificate = path;
        console.log('DTI certificate saved successfully');
      } catch (error) {
        console.error('Error saving DTI certificate:', error);
        errors.push(`DTI certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save mayor permit if provided
    if (mayorPermit) {
      try {
        console.log('Saving mayor permit...');
        const path = await saveFile(mayorPermit, userId, 'mayor_permit');
        documentPaths.mayor_permit = path;
        console.log('Mayor permit saved successfully');
      } catch (error) {
        console.error('Error saving mayor permit:', error);
        errors.push(`Mayor permit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save barangay clearance if provided
    if (barangayClearance) {
      try {
        console.log('Saving barangay clearance...');
        const path = await saveFile(barangayClearance, userId, 'barangay_clearance');
        documentPaths.barangay_clearance = path;
        console.log('Barangay clearance saved successfully');
      } catch (error) {
        console.error('Error saving barangay clearance:', error);
        errors.push(`Barangay clearance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if any documents were saved successfully
    if (Object.keys(documentPaths).length === 0) {
      console.log('No documents were saved successfully');
      return NextResponse.json({
        error: 'Failed to save any documents',
        details: errors
      }, { status: 500 });
    }

    // Update the database with the document paths
    try {
      console.log('Updating database with document paths...');
      
      // Update each document path in the database
      for (const [documentType, path] of Object.entries(documentPaths)) {
        const columnName = documentType.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        console.log(`Updating ${columnName} column with path:`, path);
        
        const updateResult = await query(
          `UPDATE service_providers SET ${columnName} = ? WHERE provider_id = ?`,
          [path, providerId]
        );
        console.log(`${columnName} updated successfully:`, updateResult);
      }
      
      console.log('All document paths updated in database successfully');
      
    } catch (dbError) {
      console.error('Database error while updating document paths:', dbError);
      return NextResponse.json({
        error: 'Failed to update document paths in database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    // Return success response
    console.log('Business document upload completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      documentPaths,
      errors: errors.length > 0 ? errors : undefined
    });

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
      error: 'Failed to process document upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
