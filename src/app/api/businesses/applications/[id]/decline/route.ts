import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendBusinessVerificationEmail, sendApplicationDeclineEmail } from '@/lib/consolidatedEmailService';
import { logAdminAction, getAdminIdFromRequest } from '@/utils/adminUtils';
import mysql from 'mysql2/promise';

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
    const { note, requestDocuments } = body;

    if (!note || note.trim().length < 10) {
      return NextResponse.json(
        { message: 'Please provide a detailed reason for declining (minimum 10 characters)' },
        { status: 400 }
      );
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
    const tableNames = tableCheckResult.map(row => row.table_name);

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
      // Check if service_providers has the application_status column
      const columnsResult = await query('SHOW COLUMNS FROM service_providers LIKE ?', ['application_status']) as any[];
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
      // Check if business_profiles has the application_status column
      const columnsResult = await query('SHOW COLUMNS FROM business_profiles LIKE ?', ['application_status']) as any[];
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
              notes: note.trim()
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
          console.log('Email sent successfully to:', business.email);
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
        
        await createBusinessNotification({
          userId: business.user_id,
          title: requestDocuments ? 'Additional Documents Required' : 'Application Declined',
          message: requestDocuments
            ? `Your business application for ${business.business_name || business.name} requires additional documents. Please check your email for details and upload the required documents.`
            : `Your business application for ${business.business_name || business.name} has been declined. Reason: ${note.trim()}`,
          type: requestDocuments ? 'warning' : 'error',
          link: requestDocuments ? '/cremation/documents' : '/cremation/dashboard',
          shouldSendEmail: false, // Email was already sent above
        });
        console.log('Business notification created for user:', business.user_id);
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
        requestDocuments ? 'request_documents' : 'decline_business',
        tableName,
        businessId,
        {
          businessName: business?.business_name || business?.name,
          notes: note.trim(),
          requestDocuments: !!requestDocuments
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