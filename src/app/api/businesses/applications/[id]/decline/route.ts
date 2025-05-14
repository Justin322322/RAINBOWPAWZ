import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import mysql from 'mysql2/promise';

// Import the simple email service
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

export async function POST(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // -2 because the last part is 'decline'

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
    }

    // Determine the verification status based on whether additional documents are requested
    const verificationStatus = requestDocuments ? 'documents_required' : 'declined';

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

    // Update business profile verification status, status, and save the note
    const updateResult = await query(
      `UPDATE ${tableName}
       SET verification_status = ?,
           status = ?,
           verification_notes = ?,
           verification_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [verificationStatus, verificationStatus, note.trim(), businessId]
    ) as mysql.ResultSetHeader;

    console.log(`Updated ${tableName} with ID ${businessId} to status: ${verificationStatus}`);
    console.log(`Update result:`, updateResult);

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Force a commit to ensure the transaction is completed
    await query('COMMIT');
    console.log(`Committed transaction for status update`);

    // Verify the status was updated correctly
    const verifyResult = await query(
      `SELECT verification_status, status FROM ${tableName} WHERE id = ?`,
      [businessId]
    ) as any[];

    if (verifyResult && verifyResult.length > 0) {
      console.log(`Verified status for ${tableName} with ID ${businessId}: verification_status=${verifyResult[0].verification_status}, status=${verifyResult[0].status}`);
      if (verifyResult[0].verification_status !== verificationStatus || verifyResult[0].status !== verificationStatus) {
        console.error(`Status mismatch! Expected both status and verification_status to be ${verificationStatus}, but got verification_status=${verifyResult[0].verification_status}, status=${verifyResult[0].status}`);
        // Try to update again with a direct query and force a commit
        await query(
          `UPDATE ${tableName}
           SET verification_status = ?,
               status = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [verificationStatus, verificationStatus, businessId]
        );
        await query('COMMIT');
        console.log(`Attempted to fix status with a second update query and forced commit`);

        // Verify again after the second attempt
        const secondVerifyResult = await query(
          `SELECT verification_status, status FROM ${tableName} WHERE id = ?`,
          [businessId]
        ) as any[];

        if (secondVerifyResult && secondVerifyResult.length > 0) {
          console.log(`Second verification for ${tableName} with ID ${businessId}: verification_status=${secondVerifyResult[0].verification_status}, status=${secondVerifyResult[0].status}`);
          if (secondVerifyResult[0].verification_status !== verificationStatus || secondVerifyResult[0].status !== verificationStatus) {
            console.error(`Status still mismatched after second attempt! Expected both to be ${verificationStatus}, but got verification_status=${secondVerifyResult[0].verification_status}, status=${secondVerifyResult[0].status}`);

            // Last resort - try one more direct update with a different query structure
            try {
              await query(
                `UPDATE ${tableName}
                 SET status = '${verificationStatus}',
                     verification_status = '${verificationStatus}'
                 WHERE id = ${businessId}`
              );
              await query('COMMIT');
              console.log(`Attempted emergency fix with hardcoded query`);
            } catch (lastError) {
              console.error('Failed even with emergency fix attempt:', lastError);
            }
          } else {
            console.log(`Status successfully updated after second attempt`);
          }
        }
      } else {
        console.log(`Status verified successfully on first attempt`);
      }
    } else {
      console.error(`Could not verify status update - no results returned from verification query`);
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
        console.log(`Preparing to send notification email to ${business.email} for business ${business.business_name || business.name}`);

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
          console.log(`Notification email sent successfully to ${business.email}. Message ID: ${emailResult.messageId}`);
          emailSent = true;
        } else {
          console.error('Failed to send notification email:', emailResult.error);
          // Continue with the process even if the email fails
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
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
        console.error('Failed to create notification:', notificationError);
      }
    }

    // Log the action
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
    ).catch(err => console.error('Failed to log admin action:', err));

    return NextResponse.json({
      message: requestDocuments ? 'Documents requested successfully' : 'Application declined successfully',
      businessId,
      businessName: business?.business_name || business?.name,
      status: verificationStatus,
      emailSent: emailSent
    });
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { message: 'Failed to process application' },
      { status: 500 }
    );
  }
}