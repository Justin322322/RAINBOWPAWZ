import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to report a review
 * POST /api/reviews/report
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token to get user info
    let tokenUserId = null;
    if (authToken.includes('.')) {
      try {
        const { decodeTokenUnsafe } = await import('@/lib/jwt');
        const payload = decodeTokenUnsafe(authToken);
        tokenUserId = payload?.userId?.toString() || null;
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      const parts = authToken.split('_');
      if (parts.length === 2) {
        tokenUserId = parts[0];
      }
    }

    if (!tokenUserId) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const body = await request.json();
    const { review_id, report_reason } = body;

    if (!review_id || !report_reason) {
      return NextResponse.json({
        error: 'Review ID and report reason are required'
      }, { status: 400 });
    }

    // Check if the review exists
    const reviewResult = await query(
      'SELECT id, service_provider_id FROM reviews WHERE id = ?',
      [review_id]
    ) as any[];

    if (!reviewResult || reviewResult.length === 0) {
      return NextResponse.json({
        error: 'Review not found'
      }, { status: 404 });
    }

    // Check if report_reason and report_status columns exist, if not add them
    try {
      const columnsResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
        AND COLUMN_NAME IN ('report_reason', 'report_status', 'reported_by', 'reported_at')
      `) as any[];

      const existingColumns = new Set(columnsResult.map((row: any) => row.COLUMN_NAME));

      if (!existingColumns.has('report_reason')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN report_reason TEXT NULL
        `);
      }

      if (!existingColumns.has('report_status')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN report_status ENUM('none', 'pending', 'reviewed', 'dismissed') DEFAULT 'none'
        `);
      }

      if (!existingColumns.has('reported_by')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN reported_by INT NULL
        `);
      }

      if (!existingColumns.has('reported_at')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN reported_at TIMESTAMP NULL
        `);
      }
    } catch (error) {
      console.error('Error adding report columns:', error);
    }

    // Update the review with the report
    await query(
      `UPDATE reviews 
       SET report_reason = ?, report_status = 'pending', reported_by = ?, reported_at = NOW()
       WHERE id = ?`,
      [report_reason, tokenUserId, review_id]
    );

    // Get review details for notification
    const reviewDetails = await query(
      `SELECT r.id, r.comment, r.rating, r.user_id,
              CONCAT(u.first_name, ' ', u.last_name) as reviewer_name,
              COALESCE(sp.name, bp.business_name) as provider_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN service_providers sp ON r.service_provider_id = sp.provider_id
       LEFT JOIN business_profiles bp ON r.service_provider_id = bp.id
       WHERE r.id = ?`,
      [review_id]
    ) as any[];

    const review = reviewDetails[0];

    // Get reporter details
    const reporterDetails = await query(
      `SELECT CONCAT(first_name, ' ', last_name) as reporter_name, email as reporter_email
       FROM users WHERE user_id = ?`,
      [tokenUserId]
    ) as any[];

    const reporter = reporterDetails[0];

    // Notify all admins about the reported review
    try {
      // Import notification utilities
      const { createAdminNotification } = await import('@/utils/adminNotificationService');

      // Create notification for all admins (function handles this automatically)
      await createAdminNotification({
        type: 'review_report',
        title: 'Review Reported for Moderation',
        message: `${reporter?.reporter_name || 'A service provider'} reported a review by ${review?.reviewer_name || 'a user'} for "${review?.provider_name || 'a service'}". Reason: ${report_reason.substring(0, 150)}${report_reason.length > 150 ? '...' : ''}`,
        entityType: 'review',
        entityId: review_id,
        shouldSendEmail: true,
        emailSubject: '⚠️ Review Reported - Action Required'
      });

      console.log(`Admin notifications sent for reported review ${review_id}`);

      // Send SMS to admins (separate from email)
      try {
        const admins = await query(
          `SELECT user_id, phone, first_name 
           FROM users 
           WHERE (role = 'admin' OR user_type = 'admin') 
           AND phone IS NOT NULL 
           AND sms_notifications = 1`
        ) as any[];

        if (admins && admins.length > 0) {
          const { sendSMS } = await import('@/lib/httpSmsService');
          
          for (const admin of admins) {
            try {
              await sendSMS({
                to: admin.phone,
                message: `Rainbow Paws Alert: A review has been reported for moderation. Please review at your earliest convenience. Review ID: ${review_id}`
              });
              console.log(`SMS sent to admin ${admin.user_id} (${admin.phone})`);
            } catch (smsError) {
              console.error(`Failed to send SMS to admin ${admin.user_id}:`, smsError);
              // Continue with other admins even if one fails
            }
          }
        }
      } catch (smsError) {
        console.error('Error sending SMS notifications:', smsError);
        // Don't fail if SMS sending fails
      }
    } catch (notificationError) {
      console.error('Error sending admin notifications:', notificationError);
      // Don't fail the report submission if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while reporting the review'
    }, { status: 500 });
  }
}
