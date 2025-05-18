import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import mysql from 'mysql2/promise';

// Import the simple email service
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Extract ID from params
  const { id } = await params;

  try {
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
    }    // With the updated schema, we only have 'declined' as the status for declined applications
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

    // Use the appropriate table name
    const tableName = useServiceProvidersTable ? 'service_providers' : 'business_profiles';

    // Check if the table has the application_status column
    const columnsResult = await query(`
      SHOW COLUMNS FROM ${tableName} LIKE 'application_status'
    `) as any[];

    const hasApplicationStatus = columnsResult.length > 0;
    let updateResult;
    updateResult = await query(
      `UPDATE ${tableName}
       SET application_status = ?,
           verification_notes = ?,
           verification_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [applicationStatus, note.trim(), businessId]
    ) as mysql.ResultSetHeader;



    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Force a commit to ensure the transaction is completed
    await query('COMMIT');

    // Verify the status was updated correctly
    let verifyResult;
    if (hasApplicationStatus) {      verifyResult = await query(
        `SELECT application_status FROM ${tableName} WHERE id = ?`,
        [businessId]
      ) as any[];

      if (verifyResult && verifyResult.length > 0) {        const result = verifyResult[0];

        if (result.application_status !== applicationStatus) {

          // Try to update again with a direct query
          await query(
            `UPDATE ${tableName} SET application_status = ? WHERE id = ?`,
            [applicationStatus, businessId]
          );
          await query('COMMIT');
        }
      }    } else {
      // We should not reach here with the updated schema
      try {
        // Create application_status column if it doesn't exist
        await query(`ALTER TABLE ${tableName} ADD COLUMN application_status ENUM('pending', 'approved', 'declined', 'restricted') DEFAULT 'pending'`);

        // Set initial value based on declined state
        await query(`UPDATE ${tableName} SET application_status = ? WHERE id = ?`, [applicationStatus, businessId]);
        await query('COMMIT');
      } catch (err) {
      }
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
    let emailSent = false;
    if (business) {
      // Send email notification using the simple email service
      try {

        // Send email using simple email service
        const emailResult = await sendBusinessVerificationEmail(
          business.email,
          {
            businessName: business.business_name || business.name,
            contactName: `${business.first_name} ${business.last_name}`,
            status: requestDocuments ? 'documents_required' : 'declined',
            notes: note.trim()
          }
        );

        if (emailResult.success) {
          emailSent = true;
        } else {
          // Continue with the process even if the email fails
        }
      } catch (emailError) {
        // Continue with the process even if the email fails
      }

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
            requestDocuments ? 'Additional Documents Required' : 'Application Declined',
            requestDocuments
              ? `Your business application for ${business.business_name || business.name} requires additional documents. Please check your email for details.`
              : `Your business application for ${business.business_name || business.name} has been declined. Reason: ${note.trim().substring(0, 100)}${note.trim().length > 100 ? '...' : ''}`,
            requestDocuments ? 'warning' : 'error',
            '/business/profile',
            0
          ]);
        }
      } catch (notificationError) {
        // Non-critical error, just log it
      }
    }

    // Log the action - but first check if the admin_logs table exists
    try {
      // Check if the admin_logs table exists
      const tableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'admin_logs'
      `, [process.env.DB_NAME || 'rainbow_paws']);

      const tableExists = tableCheck && Array.isArray(tableCheck) &&
                          tableCheck[0] && tableCheck[0].count > 0;

      if (tableExists) {
        await query(
          `INSERT INTO admin_logs (action, entity_type, entity_id, details, admin_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            requestDocuments ? 'request_documents' : 'decline_business',
            tableName,
            businessId,
            JSON.stringify({
              businessName: business?.business_name || business?.name,
              notes: note.trim(),
              requestDocuments: !!requestDocuments
            }),
            1 // TODO: Replace with actual admin ID from auth
          ]
        );
      } else {
        console.log('admin_logs table does not exist - skipping logging');
      }
    } catch (logError) {
      // Non-critical error, just log it and continue
      console.error('Error logging admin action:', logError);
    }

    // Response uses application_status if available, otherwise falls back to verification_status
    return NextResponse.json({
      message: requestDocuments ? 'Documents requested successfully' : 'Application declined successfully',
      businessId,
      businessName: business?.business_name || business?.name,
      status: applicationStatus,
      emailSent: emailSent
    });
  } catch (error) {
    console.error('Error declining application:', error);
    return NextResponse.json(
      {
        message: 'Failed to process application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}