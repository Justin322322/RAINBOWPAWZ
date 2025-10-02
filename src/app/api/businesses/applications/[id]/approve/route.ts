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

    // We now use the unified table name
    const tableName = 'service_providers';

    // SECURITY FIX: Use validated table names instead of template literals
    // Note: service_providers table only has application_status, not verification_status
    const updateResult = await query(
      `UPDATE ${tableName}
       SET application_status = 'approved',
           verification_date = NOW(),
           verification_notes = ?,
           updated_at = NOW()
       WHERE provider_id = ?`,
      [notes || 'Application approved', businessId]
    ) as unknown as mysql.ResultSetHeader;

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

    // Update the user's verification status as well
    await query(
      `UPDATE users u
       JOIN ${tableName} sp ON u.user_id = sp.user_id
       SET u.is_verified = 1
       WHERE sp.provider_id = ?`,
      [businessId]
    );

    // Notification will be created below with email sending

    // Create admin notification about the approval
    try {
      const { createAdminNotification } = await import('@/utils/adminNotificationService');
      await createAdminNotification({
        type: 'business_approved',
        title: 'Business Application Approved',
        message: `Business "${business.business_name || business.name}" (Provider #${business.provider_id}) has been approved.`,
        entityType: 'business_application',
        entityId: business.provider_id,
        shouldSendEmail: false // Don't spam admins with approval notifications
      });
    } catch (adminNotificationError) {
      console.error('Error creating admin notification for approval:', adminNotificationError);
    }

    // Log the admin action using the utility function
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
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
          link: null,
          providerId: business.provider_id,
          category: 'admin',
          priority: 'normal',
          data: { action: 'application_approved', providerId: business.provider_id },
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