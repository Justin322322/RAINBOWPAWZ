import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendBusinessVerificationEmail, sendApplicationDeclineEmail } from '@/lib/consolidatedEmailService';
import { logAdminAction, getAdminIdFromRequest } from '@/utils/adminUtils';
import mysql from 'mysql2/promise';

// Allowlist of permitted document IDs/names
const ALLOWED_DOCUMENT_TYPES = new Set([
  'business_permit',
  'bir_certificate',
  'government_id',
  'mayors_permit',
  'barangay_clearance',
  'dti_certificate',
  'sec_certificate',
  'tax_clearance',
  'police_clearance',
  'nbi_clearance',
  'fire_safety_certificate',
  'sanitary_permit',
  'environmental_clearance',
  'locational_clearance',
  'building_permit',
  'occupancy_permit',
  'zonal_clearance',
  'water_bill',
  'electricity_bill',
  'telephone_bill'
]);

/**
 * Validates and sanitizes the requiredDocuments array
 * @param documents - Raw documents array from request
 * @returns Sanitized array of valid document IDs, or null if validation fails
 */
function validateAndSanitizeRequiredDocuments(documents: any): string[] | null {
  // Check if documents is provided and is an array
  if (!documents || !Array.isArray(documents)) {
    return null;
  }

  // Sanitize and validate each document
  const sanitizedDocs: string[] = [];

  for (const doc of documents) {
    // Ensure each item is a string
    if (typeof doc !== 'string') {
      console.warn('Invalid document type in requiredDocuments:', typeof doc);
      continue;
    }

    // Trim whitespace and convert to lowercase for consistency
    const sanitizedDoc = doc.trim().toLowerCase();

    // Skip empty strings
    if (!sanitizedDoc) {
      continue;
    }

    // Strip HTML and unsafe characters (basic sanitization)
    const cleanDoc = sanitizedDoc
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .trim();

    // Skip if empty after sanitization
    if (!cleanDoc) {
      continue;
    }

    // Check against allowlist
    if (!ALLOWED_DOCUMENT_TYPES.has(cleanDoc)) {
      console.warn(`Document type not allowed: ${cleanDoc}`);
      return null; // Reject entire request if any document is not allowed
    }

    sanitizedDocs.push(cleanDoc);
  }

  // Remove duplicates using Set
  const uniqueDocs = [...new Set(sanitizedDocs)];

  // Ensure final array is not empty
  if (uniqueDocs.length === 0) {
    console.warn('No valid documents provided after sanitization');
    return null;
  }

  console.log('Validated and sanitized requiredDocuments:', uniqueDocs);
  return uniqueDocs;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Verify admin authentication
    const adminId = await getAdminIdFromRequest(request);

    if (!adminId) {
      return NextResponse.json({
        message: 'Unauthorized. Admin access required.'
      }, { status: 401 });
    }

    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // SAFEGUARD: Check if application is already approved
    try {
      const currentStatusResult = await query(
        'SELECT application_status FROM service_providers WHERE provider_id = ?',
        [businessId]
      ) as any[];
      
      const currentStatus = currentStatusResult?.[0]?.application_status;
      
      if (currentStatus === 'approved') {
        return NextResponse.json({
          message: 'Cannot decline an approved application. Approved applications can only be modified manually in the database.'
        }, { status: 403 });
      }
    } catch (error) {
      console.error('Error checking current application status:', error);
      return NextResponse.json({
        message: 'Failed to verify application status'
      }, { status: 500 });
    }

    // Get the decline note from request body
    const body = await request.json();
    const { note, requestDocuments, requiredDocuments } = body;

    if (!note || note.trim().length < 10) {
      return NextResponse.json(
        { message: 'Please provide a detailed reason for declining (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Validate and sanitize requiredDocuments only when requesting documents
    let sanitizedRequiredDocuments: string[] | undefined;
    if (requestDocuments) {
      if (!requiredDocuments || !Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
        return NextResponse.json(
          {
            message: 'Please select at least one required document when requesting documents.',
            allowedDocuments: Array.from(ALLOWED_DOCUMENT_TYPES)
          },
          { status: 400 }
        );
      }
      const validationResult = validateAndSanitizeRequiredDocuments(requiredDocuments);
      if (validationResult === null) {
        return NextResponse.json(
          {
            message: 'Invalid required documents provided. Documents must be valid strings from the allowed list.',
            allowedDocuments: Array.from(ALLOWED_DOCUMENT_TYPES)
          },
          { status: 400 }
        );
      }
      sanitizedRequiredDocuments = validationResult;
    }

    // Determine the desired status based on whether documents are being requested
    const desiredStatus = requestDocuments ? 'documents_required' : 'declined';

    // We now use the unified table name
    const tableName = 'service_providers';

    // Prepare structured notes that include required documents
    let structuredNotes = note.trim();
    if (requestDocuments && sanitizedRequiredDocuments && sanitizedRequiredDocuments.length > 0) {
      structuredNotes += `\n\nRequired documents: ${sanitizedRequiredDocuments.join(', ')}`;
    }

    // SECURITY FIX: Check columns and update safely for each table type
    let updateResult;
    {
      // Best-effort: if requesting new docs, delete previous files and clear columns for those types
      if (requestDocuments && sanitizedRequiredDocuments && sanitizedRequiredDocuments.length > 0) {
        try {
          const rows = await query(
            `SELECT business_permit_path, bir_certificate_path, government_id_path FROM ${tableName} WHERE provider_id = ? LIMIT 1`,
            [businessId]
          ) as any[];
          if (rows && rows.length > 0) {
            const current = rows[0] || {};
            const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
            let delFn: any = null;
            if (typeof blobToken === 'string' && blobToken.length > 0) {
              try {
                const blob = await import('@vercel/blob');
                delFn = (blob as any)?.del;
              } catch {}
            }

            const maybeDelete = async (url?: string | null) => {
              if (!url || typeof url !== 'string') return;
              if (!delFn) return;
              try { await delFn(url, { token: blobToken }); } catch {}
            };

            if (sanitizedRequiredDocuments.includes('business_permit')) await maybeDelete(current.business_permit_path);
            if (sanitizedRequiredDocuments.includes('bir_certificate')) await maybeDelete(current.bir_certificate_path);
            if (sanitizedRequiredDocuments.includes('government_id')) await maybeDelete(current.government_id_path);

            const fieldsToNull: string[] = [];
            if (sanitizedRequiredDocuments.includes('business_permit')) fieldsToNull.push('business_permit_path = NULL');
            if (sanitizedRequiredDocuments.includes('bir_certificate')) fieldsToNull.push('bir_certificate_path = NULL');
            if (sanitizedRequiredDocuments.includes('government_id')) fieldsToNull.push('government_id_path = NULL');
            if (fieldsToNull.length > 0) {
              await query(`UPDATE ${tableName} SET ${fieldsToNull.join(', ')}, updated_at = NOW() WHERE provider_id = ?`, [businessId]);
            }
          }
        } catch (cleanupErr) {
          console.warn('Failed to cleanup previous documents (service_providers):', cleanupErr);
        }
      }
      // Check if service_providers has the application_status column and fetch allowed enum values if present
      const columnsResult = await query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, 'application_status']
      ) as any[];

      // Default fallback statuses if we cannot detect enum values
      let statusToSet = desiredStatus;
      let useDocumentsRequiredField = false;
      
      try {
        if (columnsResult && columnsResult.length > 0 && typeof columnsResult[0].COLUMN_TYPE === 'string') {
          const columnType: string = columnsResult[0].COLUMN_TYPE; // e.g., "enum('pending','approved','declined')"
          const match = columnType.match(/enum\((.+)\)/i);
          const values = match ? match[1].split(',').map(v => v.trim().replace(/^'|'$/g, '')) : [];
          
          // If documents_required is not in enum but we need it, try to add it
          if (desiredStatus === 'documents_required' && !values.includes('documents_required')) {
            try {
              console.log('Adding documents_required to application_status enum...');
              await query(
                `ALTER TABLE ${tableName} MODIFY COLUMN application_status ENUM(${values.map(v => `'${v}'`).join(',')}, 'documents_required') DEFAULT 'pending'`
              );
              console.log('Successfully added documents_required to enum');
              statusToSet = 'documents_required';
            } catch (alterError) {
              console.error('Failed to add documents_required to enum:', alterError);
              // Alternative approach: use a separate field to track document requests
              console.log('Using alternative approach with documents_required_flag field');
              statusToSet = 'pending';
              useDocumentsRequiredField = true;
            }
          } else if (!values.includes(desiredStatus)) {
            // If desired status is not supported by enum, choose a safe fallback
            statusToSet = values.includes('reviewing') ? 'reviewing' : (values.includes('pending') ? 'pending' : (values[0] || 'pending'));
          }
        } else {
          // Column may not be enum or not present; use alternative approach for documents_required
          if (desiredStatus === 'documents_required') {
            statusToSet = 'pending';
            useDocumentsRequiredField = true;
          } else {
            statusToSet = desiredStatus;
          }
        }
      } catch {
        if (desiredStatus === 'documents_required') {
          statusToSet = 'pending';
          useDocumentsRequiredField = true;
        } else {
          statusToSet = desiredStatus;
        }
      }

      // If using alternative approach, create documents_required_flag field if needed
      if (useDocumentsRequiredField) {
        try {
          // Try to add the documents_required_flag column if it doesn't exist
          await query(
            `ALTER TABLE ${tableName} ADD COLUMN documents_required_flag TINYINT(1) DEFAULT 0`
          );
          console.log('Added documents_required_flag column');
        } catch (alterError) {
          // Column might already exist, which is fine
          console.log('documents_required_flag column already exists or failed to add:', alterError);
        }
        
        // Update with the flag set
        updateResult = await query(
          `UPDATE ${tableName}
           SET application_status = ?,
               verification_notes = ?,
               documents_required_flag = 1,
               verification_date = NOW(),
               updated_at = NOW()
           WHERE provider_id = ?`,
          [statusToSet, structuredNotes, businessId]
        ) as unknown as mysql.ResultSetHeader;
      } else {
        // Normal update without the flag
        updateResult = await query(
          `UPDATE ${tableName}
           SET application_status = ?,
               verification_notes = ?,
               verification_date = NOW(),
               updated_at = NOW()
           WHERE provider_id = ?`,
          [statusToSet, structuredNotes, businessId]
        ) as unknown as mysql.ResultSetHeader;
      }
    }

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Get business details for email notification
    const businessResult = await query(
      `SELECT sp.*, u.email, u.first_name, u.last_name, sp.name AS business_name
       FROM ${tableName} sp
       JOIN users u ON sp.user_id = u.user_id
       WHERE sp.provider_id = ?`,
      [businessId]
    ) as any[];

    const business = businessResult[0];

    // Send email notification to the business owner
    let emailSent = false;
    if (business && business.email) {
      try {
        let emailResult;

        if (requestDocuments) {
          // If documents are requested, use the business verification email
          emailResult = await sendBusinessVerificationEmail(
            business.email,
            {
              businessName: business.business_name || business.name,
              contactName: `${business.first_name} ${business.last_name}`,
              status: 'documents_required',
              notes: note.trim(),
              requiredDocuments: sanitizedRequiredDocuments || []
            }
          );
        } else {
          // For declined applications, use the new dedicated template
          emailResult = await sendApplicationDeclineEmail(
            business.email,
            {
              businessName: business.business_name || business.name,
              contactName: `${business.first_name} ${business.last_name}`,
              reason: note.trim()
            }
          );
        }

        if (emailResult.success) {
          emailSent = true;
        } else {
          console.warn('Email sending failed:', emailResult.error);
        }
      } catch (emailError) {
        // Log the error but continue with the process
        console.error('Error sending verification email:', emailError);
      }

      // Create a notification for the business owner using the business notification service
      try {
        const { createBusinessNotification } = await import('@/utils/businessNotificationService');
        
        const requiredDocsText = sanitizedRequiredDocuments && sanitizedRequiredDocuments.length > 0
          ? `\n\nRequired documents: ${sanitizedRequiredDocuments.join(', ')}`
          : '';

        await createBusinessNotification({
          userId: business.user_id,
          title: requestDocuments ? 'Specific Documents Required' : 'Application Declined',
          message: requestDocuments
            ? `Your business application for ${business.business_name || business.name} requires specific documents. Please check your email for details and upload the required documents.${requiredDocsText}`
            : `Your business application for ${business.business_name || business.name} has been declined. Reason: ${note.trim()}`,
          type: requestDocuments ? 'warning' : 'error',
          link: requestDocuments ? '/cremation/pending-verification' : '/cremation/dashboard',
          shouldSendEmail: false, // Email was already sent above
        });
      } catch (notificationError) {
        // Non-critical error, just log it
        console.error('Error creating business notification:', notificationError);
      }
    }

    // Log the admin action using the utility function
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      await logAdminAction(
        adminId,
        requestDocuments ? 'request_specific_documents' : 'decline_business',
        tableName,
        businessId,
        {
          businessName: business?.business_name || business?.name,
          notes: note.trim(),
          requestDocuments: !!requestDocuments,
          requiredDocuments: sanitizedRequiredDocuments || []
        },
        ipAddress as string
      );
    } catch (logError) {
      // Non-critical error, just log it and continue
      console.error('Error logging admin action:', logError);
    }

    return NextResponse.json({
      message: requestDocuments ? 'Documents requested successfully' : 'Application declined successfully',
      businessId,
      businessName: business?.business_name || business?.name,
      emailSent: emailSent
    });
  } catch (error) {
    console.error('Error declining application:', error);
    return NextResponse.json(
      {
        message: 'Failed to decline application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}