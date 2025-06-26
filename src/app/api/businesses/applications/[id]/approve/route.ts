import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendBusinessVerificationEmail } from '@/lib/consolidatedEmailService';
import { logAdminAction, getAdminIdFromRequest } from '@/utils/adminUtils';
import { createBusinessNotification } from '@/utils/businessNotificationService';
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

    // Get any additional notes from the request body
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

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

    // SECURITY FIX: Use validated table names instead of template literals
    let updateResult;
    if (useServiceProvidersTable) {
      updateResult = await query(
        `UPDATE service_providers
         SET application_status = 'approved',
             verification_date = NOW(),
             verification_notes = ?,
             updated_at = NOW()
         WHERE provider_id = ?`,
        [notes || 'Application approved', businessId]
      ) as unknown as mysql.ResultSetHeader;
    } else {
      updateResult = await query(
        `UPDATE business_profiles
         SET application_status = 'approved',
             verification_date = NOW(),
             verification_notes = ?,
             updated_at = NOW()
         WHERE provider_id = ?`,
        [notes || 'Application approved', businessId]
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

    // Update the user's verification status as well
    if (useServiceProvidersTable) {
      await query(
        `UPDATE users u
         JOIN service_providers bp ON u.user_id = bp.user_id
         SET u.is_verified = 1
         WHERE bp.provider_id = ?`,
        [businessId]
      );
    } else {
      await query(
        `UPDATE users u
         JOIN business_profiles bp ON u.user_id = bp.user_id
         SET u.is_verified = 1
         WHERE bp.provider_id = ?`,
        [businessId]
      );
    }

    // Create a notification for the business owner with email support
    try {
      await createBusinessNotification({
        userId: business.user_id,
        title: 'Application Approved',
        message: `Your business application for ${business.business_name || business.name} has been approved. You can now start offering services.`,
        type: 'success',
        link: '/cremation/dashboard',
        shouldSendEmail: true,
        emailSubject: 'Business Application Approved - Rainbow Paws'
      });
    } catch (notificationError) {
      // Non-critical error, just log it
      console.error('Error creating approval notification:', notificationError);
    }

    // Log the admin action using the utility function
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';
      await logAdminAction(
        adminId,
        'approve_business',
        tableName,
        businessId,
        {
          businessName: business?.business_name || business?.name,
          notes: notes || 'Application approved'
        },
        ipAddress as string
      );
    } catch (logError) {
      // Non-critical error, just log it and continue
      console.error('Error logging admin action:', logError);
    }

    // Send email notification to the business owner
    let emailSent = false;
    if (business && business.email) {
      try {
        // Send email using simple email service
        const emailResult = await sendBusinessVerificationEmail(
          business.email,
          {
            businessName: business.business_name || business.name,
            contactName: `${business.first_name} ${business.last_name}`,
            status: 'approved',
            notes: notes || 'Your application has been approved. You can now start using our services.'
          }
        );

        if (emailResult.success) {
          emailSent = true;
        } else {
          console.warn('Email sending failed:', emailResult.error);
        }
      } catch (emailError) {
        // Log the error but continue with the process
        console.error('Error sending verification email:', emailError);
      }

      // Create a notification for the user using the business notification service
      try {
        const { createBusinessNotification } = await import('@/utils/businessNotificationService');
        
        await createBusinessNotification({
          userId: business.user_id,
          title: 'Application Approved',
          message: `Your business application for ${business.business_name || business.name} has been approved. You can now start managing your services and receiving bookings.`,
          type: 'success',
          link: '/cremation/dashboard',
          shouldSendEmail: true,
          emailSubject: 'Business Application Approved - Rainbow Paws'
        });
      } catch (notificationError) {
        // Log the error but continue with the process
        console.error('Error creating business notification:', notificationError);
      }
    }

    return NextResponse.json({
      message: 'Application approved successfully',
      businessId,
      businessName: business?.business_name || business?.name,
      emailSent: emailSent
    });
  } catch (error) {
    console.error('Error approving application:', error);
    return NextResponse.json(
      {
        message: 'Failed to approve application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}