import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
// Removed unused imports

/**
 * Helper function to move documents from temp storage to permanent storage
 */
async function moveDocumentsFromTempToPermanent(tempUrls: Record<string, string>, userId: string): Promise<Record<string, string>> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const useBlob = typeof blobToken === 'string' && blobToken.length > 0;

  if (!useBlob) {
    // If not using blob storage, return original URLs (they might be base64 data URLs)
    return tempUrls;
  }

  let putFn: any = null;
  try {
    const blob = await import('@vercel/blob');
    putFn = (blob as any)?.put;
  } catch {
    return tempUrls;
  }

  if (!putFn) {
    return tempUrls;
  }

  const permanentUrls: Record<string, string> = {};

  try {
    // Process each document URL
    for (const [docType, tempUrl] of Object.entries(tempUrls)) {
      if (!tempUrl || !tempUrl.includes('temp/registration')) {
        // Skip if not a temp URL or empty
        permanentUrls[docType] = tempUrl;
        continue;
      }

      try {
        // Download the temp file
        const tempResponse = await fetch(tempUrl);
        if (!tempResponse.ok) {
          console.error(`Failed to download temp file for ${docType}:`, tempUrl);
          permanentUrls[docType] = tempUrl; // Keep original if download fails
          continue;
        }

        const arrayBuffer = await tempResponse.arrayBuffer();
        const mime = tempResponse.headers.get('content-type') || 'application/octet-stream';
        const ext = mime.split('/')[1] || 'bin';

        // Upload to permanent location
        const key = `uploads/businesses/${userId}/${docType}_${Date.now()}.${ext}`;
        const result = await putFn(key, Buffer.from(arrayBuffer), {
          access: 'public',
          contentType: mime,
          token: blobToken,
        });

        if (result?.url) {
          permanentUrls[docType] = result.url;
          console.log(`Successfully moved ${docType} from temp to permanent storage:`, result.url);
        } else {
          console.error(`Failed to upload ${docType} to permanent storage`);
          permanentUrls[docType] = tempUrl; // Keep original if upload fails
        }
      } catch (error) {
        console.error(`Error moving ${docType} from temp to permanent:`, error);
        permanentUrls[docType] = tempUrl; // Keep original on error
      }
    }
  } catch (error) {
    console.error('Error in document migration process:', error);
    // Return original URLs if migration fails
    return tempUrls;
  }

  return permanentUrls;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maximum file size (20MB for documents)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Require secure authentication for all uploads
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId: string = user.userId;
    const accountType: string = user.accountType;

    // Only business accounts can upload documents
    if (accountType !== 'business') {
      return NextResponse.json({
        error: 'Only business accounts can upload documents'
      }, { status: 403 });
    }
    
    // Support three modes:
    // 1) JSON body: client already uploaded to Blob, we just persist URLs
    // 2) multipart/form-data: files are posted here (smaller files only)
    // 3) migrate: move documents from temp to permanent storage

    const contentType = request.headers.get('content-type') || '';
    let mode: 'json' | 'form' | 'migrate' = contentType.includes('application/json') ? 'json' : 'form';
    let formData: FormData | null = null;
    let jsonBody: any = null;

    // Check if this is a migration request
    if (request.method === 'POST') {
      if (mode === 'json') {
        // Parse JSON body once and reuse it throughout the handler
        jsonBody = await request.json();
        if (jsonBody?.action === 'migrate') {
          mode = 'migrate';
        }
      } else if (mode === 'form') {
        formData = await request.formData();
        const action = formData.get('action') as string;
        if (action === 'migrate') {
          mode = 'migrate';
        }
      }
    }

    // Ensure body is parsed if it wasn't already parsed above
    if (mode === 'form' && !formData) {
      formData = await request.formData();
    } else if (mode === 'json' && !jsonBody) {
      jsonBody = await request.json();
    }

    // Extract inputs depending on mode
    const businessPermit: File | null = mode === 'form' ? (formData!.get('businessPermit') as File | null) : null;
    const birCertificate: File | null = mode === 'form' ? (formData!.get('birCertificate') as File | null) : null;
    const governmentId: File | null = mode === 'form' ? (formData!.get('governmentId') as File | null) : null;
    const providedUrls = mode === 'json' ? (jsonBody?.filePaths || {}) : {};

    // Extract service provider ID if provided (for registration flow)
    const providedServiceProviderId = mode === 'form' ? formData!.get('serviceProviderId') as string | null : jsonBody?.serviceProviderId || null;

    // Check if at least one file is provided (skip for migration mode)
    if (mode !== 'migrate' && mode === 'form' && !businessPermit && !birCertificate && !governmentId && Object.keys(providedUrls).length === 0) {
      return NextResponse.json({ error: 'At least one document must be uploaded' }, { status: 400 });
    }

    // Validate files
    const filesToProcess: Array<{ file: File; type: 'businessPermit' | 'birCertificate' | 'governmentId' }> = [];
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

    if (mode === 'form') {
      for (const { file, type } of filesToProcess) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `File size exceeds the limit (10MB) for ${type}` }, { status: 413 });
        }
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json({ error: `Invalid file type for ${type}. Only PDF, Word documents, and images are allowed.` }, { status: 400 });
        }
      }
    }

    try {
      // Prefer URL storage via Vercel Blob when available; fallback to base64 otherwise
      const filePaths: any = {};

      // Lazy import to avoid bundling when not configured
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      const useBlob = typeof blobToken === 'string' && blobToken.length > 0;
      let putFn: any = null;
      if (useBlob) {
        try {
          // Prefer dynamic import to avoid eval/require issues in ESM
          const blob = await import('@vercel/blob');
          putFn = (blob as any)?.put;
          if (!putFn) {
            // Silently fallback to base64
          }
        } catch {
          // Silently fallback to base64
        }
      }

      if (mode === 'json' && providedUrls && Object.keys(providedUrls).length > 0) {
        // Directly use provided URLs
        if (providedUrls.business_permit_path) filePaths.business_permit_path = providedUrls.business_permit_path;
        if (providedUrls.bir_certificate_path) filePaths.bir_certificate_path = providedUrls.bir_certificate_path;
        if (providedUrls.government_id_path) filePaths.government_id_path = providedUrls.government_id_path;
      }

      for (const { file, type } of mode === 'form' ? filesToProcess : []) {
        const arrayBuffer = await file.arrayBuffer();
        const mime = file.type || 'application/octet-stream';
        const ext = mime.split('/')[1] || 'bin';

        if (putFn && useBlob) {
          // Upload to Vercel Blob and store public URL
          const key = `uploads/businesses/${userId}/${type}_${Date.now()}.${ext}`;
          const result = await putFn(key, Buffer.from(arrayBuffer), {
            access: 'public',
            contentType: mime,
            token: blobToken,
          });
          const url = result?.url || '';
          if (type === 'businessPermit') filePaths.business_permit_path = url;
          if (type === 'birCertificate') filePaths.bir_certificate_path = url;
          if (type === 'governmentId') filePaths.government_id_path = url;
        } else {
          // Fallback: base64 data URL
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${mime};base64,${base64Data}`;
          if (type === 'businessPermit') filePaths.business_permit_path = dataUrl;
          if (type === 'birCertificate') filePaths.bir_certificate_path = dataUrl;
          if (type === 'governmentId') filePaths.government_id_path = dataUrl;
        }
      }

      // Try to associate to a provider if present; if not, still return success with file paths
      let providerId: string | null = providedServiceProviderId || null;

      // If no provider ID was provided, try to find it
      if (!providerId) {
        try {
          const providerResult = await query(
            'SELECT provider_id FROM service_providers WHERE user_id = ?',
            [userId]
          ) as any[];

          if (providerResult && providerResult.length > 0) {
            providerId = providerResult[0].provider_id;
          }
        } catch (error) {
          console.error('Error fetching service provider:', error);
          // Continue without provider ID
        }
      }

      // If we have a provider ID, update the database
      if (providerId) {
        try {
          const updateFields: string[] = [];
          const updateValues: any[] = [];

          // Add document paths to update
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

          // Update application status to 'reviewing' after document upload
          // This indicates that additional documents have been provided and are awaiting review
          updateFields.push('application_status = ?');
          updateValues.push('reviewing');

          // Clear verification notes since documents have been uploaded
          updateFields.push('verification_notes = ?');
          updateValues.push('Documents uploaded for review');

          if (updateFields.length > 0) {
            updateValues.push(providerId);
            await query(
              `UPDATE service_providers SET ${updateFields.join(', ')}, updated_at = NOW() WHERE provider_id = ?`,
              updateValues
            );

            console.log(`Updated service provider ${providerId} with ${Object.keys(filePaths).length} document(s) and changed status to reviewing`);

            // Also upsert into business_documents table as a secondary source of truth
            try {
              await query(`
                CREATE TABLE IF NOT EXISTS business_documents (
                  provider_id INT PRIMARY KEY,
                  business_permit_data TEXT NULL,
                  bir_certificate_data TEXT NULL,
                  government_id_data TEXT NULL,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

              const existing = await query('SELECT provider_id FROM business_documents WHERE provider_id = ? LIMIT 1', [providerId]) as any[];
              const docValues = [
                filePaths.business_permit_path || null,
                filePaths.bir_certificate_path || null,
                filePaths.government_id_path || null,
                providerId
              ];
              if (existing && existing.length > 0) {
                await query(
                  'UPDATE business_documents SET business_permit_data = COALESCE(?, business_permit_data), bir_certificate_data = COALESCE(?, bir_certificate_data), government_id_data = COALESCE(?, government_id_data) WHERE provider_id = ?',
                  docValues
                );
              } else {
                await query(
                  'INSERT INTO business_documents (business_permit_data, bir_certificate_data, government_id_data, provider_id) VALUES (?, ?, ?, ?)',
                  docValues
                );
              }
            } catch (docErr) {
              console.warn('Failed to upsert business_documents:', docErr);
            }
          }
        } catch (error) {
          console.error('Error updating service provider documents:', error);
          // Silently continue if database update fails
        }
      } else {
        console.warn('No service provider found for user', userId, '- documents uploaded but not associated with provider record');
      }

      // Handle migration mode
      if (mode === 'migrate') {
        const tempUrls = jsonBody?.tempUrls || formData?.get('tempUrls') as string || '{}';
        let tempUrlsObj: Record<string, string>;

        try {
          tempUrlsObj = typeof tempUrls === 'string' ? JSON.parse(tempUrls) : tempUrls;
        } catch {
          tempUrlsObj = {};
        }

        console.log('Migrating documents from temp to permanent storage:', tempUrlsObj);

        // Move documents from temp to permanent storage
        const permanentUrls = await moveDocumentsFromTempToPermanent(tempUrlsObj, userId);

        // Update the service provider with new permanent URLs
        if (providerId && Object.keys(permanentUrls).length > 0) {
          try {
            const updateFields: string[] = [];
            const updateValues: any[] = [];

            if (permanentUrls.business_permit_path) {
              updateFields.push('business_permit_path = ?');
              updateValues.push(permanentUrls.business_permit_path);
            }
            if (permanentUrls.bir_certificate_path) {
              updateFields.push('bir_certificate_path = ?');
              updateValues.push(permanentUrls.bir_certificate_path);
            }
            if (permanentUrls.government_id_path) {
              updateFields.push('government_id_path = ?');
              updateValues.push(permanentUrls.government_id_path);
            }

            if (updateFields.length > 0) {
              updateValues.push(providerId);
              await query(
                `UPDATE service_providers SET ${updateFields.join(', ')}, updated_at = NOW() WHERE provider_id = ?`,
                updateValues
              );

              console.log(`Successfully migrated ${updateFields.length} documents to permanent storage for provider ${providerId}`);
              // Notify admins that documents were submitted (server-side)
              try {
                const { createAdminNotification } = await import('@/utils/adminNotificationService');
                await createAdminNotification({
                  type: 'pending_application',
                  title: 'Additional Documents Submitted',
                  message: `Provider #${providerId} submitted additional documents for verification.`,
                  entityType: 'business_application',
                  entityId: Number(providerId),
                  shouldSendEmail: false,
                  emailSubject: 'Additional Documents Submitted'
                });
              } catch (notifyErr) {
                console.warn('Failed to notify admins for migrated documents:', notifyErr);
              }
            }
          } catch (error) {
            console.error('Error updating service provider with migrated documents:', error);
          }
        }

        return NextResponse.json({
          success: true,
          permanentUrls,
          message: 'Documents migrated from temporary to permanent storage successfully'
        });
      }

      // Return success response regardless, with filePaths for client to use if needed
      // After non-migration uploads, also notify admins
      try {
        if (providerId) {
          const { createAdminNotification } = await import('@/utils/adminNotificationService');
          await createAdminNotification({
            type: 'pending_application',
            title: 'Additional Documents Submitted',
            message: `Provider #${providerId} submitted additional documents for verification.`,
            entityType: 'business_application',
            entityId: Number(providerId),
            shouldSendEmail: false,
            emailSubject: 'Additional Documents Submitted'
          });
        }
      } catch (notifyErr) {
        console.warn('Failed to notify admins for uploaded documents:', notifyErr);
      }

      return NextResponse.json({
        success: true,
        filePaths,
        message: 'Documents uploaded successfully'
      });

    } catch (error) {
      console.error('Error processing document upload:', error);
      return NextResponse.json({
        error: 'Failed to process documents',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Critical error in document upload API:', error);
    return NextResponse.json({
      error: 'Failed to process file upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
