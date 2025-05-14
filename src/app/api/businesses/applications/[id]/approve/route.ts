import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import mysql from 'mysql2/promise';

// Import the simple email service
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

export async function POST(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // -2 because the last part is 'approve'

  try {
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
    console.log('Available tables:', tableNames);

    const useServiceProvidersTable = tableNames.includes('service_providers');
    const useBusinessProfilesTable = tableNames.includes('business_profiles');

    if (!useServiceProvidersTable && !useBusinessProfilesTable) {
      console.error('Neither business_profiles nor service_providers table exists in the database');
      return NextResponse.json({
        message: 'Database schema error: Required tables do not exist'
      }, { status: 500 });
    }

    // Use the appropriate table name
    const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';
    console.log(`Using table: ${tableName}`);

    // Update business profile verification status
    const updateResult = await query(
      `UPDATE ${tableName}
       SET verification_status = 'verified',
           verification_date = NOW(),
           verification_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [notes || 'Application approved', businessId]
    ) as mysql.ResultSetHeader;

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
         JOIN users u ON bp.user_id = u.id
         WHERE bp.id = ?`,
        [businessId]
      ) as any[];
    } else {
      businessResult = await query(
        `SELECT bp.*, u.email, u.first_name, u.last_name
         FROM business_profiles bp
         JOIN users u ON bp.user_id = u.id
         WHERE bp.id = ?`,
        [businessId]
      ) as any[];
    }

    const business = businessResult[0];

    // Update the user's verification status as well
    await query(
      `UPDATE users u
       JOIN ${tableName} bp ON u.id = bp.user_id
       SET u.is_verified = 1
       WHERE bp.id = ?`,
      [businessId]
    );

    // Create a notification for the business owner
    try {
      // First check if the notifications table exists
      const tableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'notifications'
      `, [process.env.DB_NAME || 'rainbow_paws']);

      const tableExists = tableCheck && Array.isArray(tableCheck) &&
                          tableCheck[0] && tableCheck[0].count > 0;

      if (tableExists) {
        // Create notification for the business owner
        await query(`
          INSERT INTO notifications (user_id, title, message, type, link, is_read)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          business.user_id,
          'Application Approved',
          `Your business application for ${business.business_name || business.name} has been approved. You can now start offering services.`,
          'success',
          '/business/dashboard',
          0
        ]);
      }
    } catch (notificationError) {
      // Non-critical error, just log it
      console.error('Failed to create notification:', notificationError);
    }

    // Log the approval action
    await query(
      `INSERT INTO admin_logs (action, entity_type, entity_id, details, admin_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'approve_business',
        tableName, // Use the actual table name
        businessId,
        JSON.stringify({
          businessName: business?.business_name || business?.name,
          notes: notes || 'Application approved'
        }),
        1 // TODO: Replace with actual admin ID from auth
      ]
    ).catch(err => console.error('Failed to log admin action:', err));

    // Send email notification to the business owner
    let emailSent = false;
    if (business && business.email) {
      try {
        console.log(`Sending approval email to ${business.email} for business ${business.business_name || business.name}`);

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
          console.log(`Approval email sent successfully to ${business.email}. Message ID: ${emailResult.messageId}`);
          emailSent = true;
        } else {
          console.error('Failed to send approval email:', emailResult.error);
        }

        // Create a notification for the user
        await query(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, ?, ?, ?, ?)`,
          [
            business.user_id,
            'Application Approved',
            `Your business application for ${business.business_name || business.name} has been approved.`,
            'success',
            '/cremation/dashboard'
          ]
        ).catch(err => console.error('Failed to create notification:', err));

      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        // Continue with the process even if email fails
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
      { message: 'Failed to approve application' },
      { status: 500 }
    );
  }
}