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

    // Get the decline note from request body
    const body = await request.json();
    const { note, requestDocuments, requiredDocuments } = body;

    if (!note || note.trim().length < 10) {
      return NextResponse.json(
        { message: 'Please provide a detailed reason for declining (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Validate and sanitize requiredDocuments if provided
    let sanitizedRequiredDocuments: string[] | undefined;
    if (requiredDocuments) {
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

    // With the updated schema, we only have 'declined' as the status for declined applications
    // No separate 'documents_required' status in the enum
    const applicationStatus = 'declined';

    // Check which table exists: business_profiles or service_providers
    const tableCheckResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('business_profiles', 'service_providers')
    `) as any[];

    // Determine which table to use
    const tableNames = tableCheckResult.map(row => row.TABLE_NAME || row.table_name);

    const useServiceProvidersTable = tableNames.includes('service_providers');
    const useBusinessProfilesTable = tableNames.includes('business_profiles');

    if (!useServiceProvidersTable && !useBusinessProfilesTable) {
      return NextResponse.json({
        message: 'Database schema error: Required tables do not exist'
      }, { status: 500 });
    }

    // SECURITY FIX: Check columns and update safely for each table type
    let updateResult;
    if (useServiceProvidersTable) {
      // Check if service_providers has the application_status column (avoid SHOW + placeholders incompatibility)
      const columnsResult = await query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ? 
         LIMIT 1`,
        ['service_providers', 'application_status']
      ) as any[];
      const _hasApplicationStatus = columnsResult.length > 0;

      updateResult = await query(
        `UPDATE service_providers
         SET application_status = ?,
             verification_notes = ?,
             verification_date = NOW(),
             updated_at = NOW()
         WHERE provider_id = ?`,
        [applicationStatus, note.trim(), businessId]
      ) as unknown as mysql.ResultSetHeader;
    } else {
      // Check if business_profiles has the application_status column (avoid SHOW + placeholders incompatibility)
      const columnsResult = await query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ? 
         LIMIT 1`,
        ['business_profiles', 'application_status']
      ) as any[];
      const _hasApplicationStatus = columnsResult.length > 0;

      updateResult = await query(
        `UPDATE business_profiles
         SET application_status = ?,
             verification_notes = ?,
             verification_date = NOW(),
             updated_at = NOW()
         WHERE provider_id = ?`,
        [applicationStatus, note.trim(), businessId]
      ) as unknown as mysql.ResultSetHeader;
    }

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Get business details for email notification
    let businessResult;

    if (useServiceProvidersTable) {
      businessResult = await query(
        `SELECT
          bp.*,
          u.email,
          u.first_name,
          u.last_name,
          bp.name as business_name
         FROM service_providers bp
         JOIN users u ON bp.user_id = u.user_id
         WHERE bp.provider_id = ?`,
        [businessId]
      ) as any[];
    } else {
      businessResult = await query(
        `SELECT bp.*, u.email, u.first_name, u.last_name
         FROM business_profiles bp
         JOIN users u ON bp.user_id = u.user_id
         WHERE bp.id = ?`,
        [businessId]
      ) as any[];
    }

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
      const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';
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