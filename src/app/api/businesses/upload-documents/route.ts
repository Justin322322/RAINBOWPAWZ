import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { query } from '@/lib/db';

// Function to save file to disk
async function saveFile(file: File, userId: string, documentType: string): Promise<string> {
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
  
  // Return the relative path for database storage
  return `/uploads/businesses/${userId}/${fileName}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Check if the business exists
    const businessCheck = await query(
      'SELECT id FROM businesses WHERE id = ?',
      [userId]
    ) as any[];

    if (!businessCheck || businessCheck.length === 0) {
      return NextResponse.json({
        error: 'Business not found'
      }, { status: 404 });
    }

    const filePaths: Record<string, string> = {};
    let documentsUploaded = false;

    // Process BIR Certificate
    const birCertificate = formData.get('birCertificate') as File;
    if (birCertificate && birCertificate instanceof File) {
      filePaths.birCertificatePath = await saveFile(birCertificate, userId, 'bir_certificate');
      documentsUploaded = true;
    }

    // Process Business Permit
    const businessPermit = formData.get('businessPermit') as File;
    if (businessPermit && businessPermit instanceof File) {
      filePaths.businessPermitPath = await saveFile(businessPermit, userId, 'business_permit');
      documentsUploaded = true;
    }

    // Process Government ID
    const governmentId = formData.get('governmentId') as File;
    if (governmentId && governmentId instanceof File) {
      filePaths.governmentIdPath = await saveFile(governmentId, userId, 'government_id');
      documentsUploaded = true;
    }

    if (!documentsUploaded) {
      return NextResponse.json({
        error: 'No documents were uploaded'
      }, { status: 400 });
    }

    // Update business record with document paths
    const updateFields = [];
    const updateValues = [];

    if (filePaths.birCertificatePath) {
      updateFields.push('bir_certificate_path = ?');
      updateValues.push(filePaths.birCertificatePath);
    }

    if (filePaths.businessPermitPath) {
      updateFields.push('business_permit_path = ?');
      updateValues.push(filePaths.businessPermitPath);
    }

    if (filePaths.governmentIdPath) {
      updateFields.push('government_id_path = ?');
      updateValues.push(filePaths.governmentIdPath);
    }

    if (updateFields.length > 0) {
      await query(
        `UPDATE businesses SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateValues, userId]
      );
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