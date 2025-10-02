import { NextRequest, NextResponse } from 'next/server';
import { broadcastToUser } from '@/app/api/notifications/sse/route';
import { query, withTransaction } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { createNotificationFast } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMSAsync } from '@/lib/httpSmsService';

export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // -2 because the last part is 'restrict'

    // Validate user ID
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Verify admin authentication using secure auth
    const authUser = await verifySecureAuth(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to restrict/unrestrict users
    if (authUser.accountType !== 'admin') {
      return NextResponse.json({
        error: 'You are not authorized to restrict/unrestrict users'
      }, { status: 403 });
    }

    // Get restriction details from request body
    const body = await request.json();
    const {
      restricted,
      reason = '',
      duration = 'indefinite',
      reportCount = 0
    } = body;

    // Validate restricted flag
    if (restricted === undefined || typeof restricted !== 'boolean') {
      return NextResponse.json({
        error: 'The "restricted" field is required and must be a boolean'
      }, { status: 400 });
    }

    // **🔥 FIX: Check if user exists before starting transaction to return proper 404**
    const userCheckResult = await query(
      'SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    ) as any[];

    if (!userCheckResult || userCheckResult.length === 0) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const _result = await withTransaction(async (transaction) => {

      // No runtime DDL; table must be created via migration

      if (restricted) {
        // Check if user is already restricted
        const restrictionResult = await transaction.query(
          "SELECT id FROM restrictions WHERE subject_type = 'user' AND subject_id = ? AND is_active = 1 LIMIT 1",
          [userId]
        ) as any[];

        if (restrictionResult && restrictionResult.length > 0) {
          // Update existing restriction
          await transaction.query(
            `UPDATE restrictions
             SET reason = ?,
                 duration = ?,
                 report_count = ?,
                 restriction_date = NOW()
             WHERE subject_type = 'user' AND subject_id = ? AND is_active = 1`,
            [reason, duration, reportCount, userId]
          );
        } else {
          // Create new restriction
          await transaction.query(
            `INSERT INTO restrictions (subject_type, subject_id, reason, duration, report_count)
             VALUES ('user', ?, ?, ?, ?)`,
            [userId, reason, duration, reportCount]
          );
        }

        // Update user status to restricted (only use status field for now)
        await transaction.query(
          `UPDATE users
           SET status = 'restricted',
               updated_at = NOW()
           WHERE user_id = ?`,
          [userId]
        );

        // Send notifications_unified to the user (non-blocking)
        notifyUserOfRestriction(userCheckResult[0], reason, duration).catch(error => {
          console.error('Failed to send restriction notification:', error);
        });
      } else {
        // Remove restriction
        await transaction.query(
          "UPDATE restrictions SET is_active = 0 WHERE subject_type = 'user' AND subject_id = ? AND is_active = 1",
          [userId]
        );

        // Update user status to active (only use status field for now)
        await transaction.query(
          `UPDATE users
           SET status = 'active',
               updated_at = NOW()
           WHERE user_id = ?`,
          [userId]
        );
      }

      return { success: true };
    });

    // **🔥 FIX: Get updated user data using regular query (outside transaction)**
    const updatedUserResult = await query(
      `SELECT user_id, first_name, last_name, email, phone, sms_notifications, address, gender,
       created_at, updated_at, is_otp_verified, role, status, is_verified
       FROM users WHERE user_id = ? LIMIT 1`,
      [userId]
    ) as any[];

    if (!updatedUserResult || updatedUserResult.length === 0) {
      return NextResponse.json({
        error: 'Failed to retrieve updated user data'
      }, { status: 500 });
    }

    const user = updatedUserResult[0];

    // Set user_type based on role for backward compatibility
    if (user.role === 'fur_parent') {
      user.user_type = 'user';
    } else {
      user.user_type = user.role; // 'admin' or 'business'
    }

    // Get restriction details if user is restricted
    if (restricted) {
      const restrictionResult = await query(
        `SELECT id as restriction_id, reason, restriction_date, duration, report_count, is_active
         FROM restrictions
         WHERE subject_type = 'user' AND subject_id = ? AND is_active = 1
         LIMIT 1`,
        [userId]
      ) as any[];

      if (restrictionResult && restrictionResult.length > 0) {
        user.restriction = restrictionResult[0];
      }
    }

    // Remove sensitive information
    delete user.password;

    return NextResponse.json({
      success: true,
      message: restricted ? 'User has been restricted' : 'User restriction has been removed',
      user
    });

  } catch (error) {
    console.error('User restriction error:', error);

    return NextResponse.json({
      error: 'Failed to update user restriction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to notify user of restriction
async function notifyUserOfRestriction(user: any, reason: string, duration?: string) {
  try {
    const title = 'Account Restricted';
    const message = `Your account has been restricted. Reason: ${reason}${duration ? ` Duration: ${duration}` : ''}. You can submit an appeal to request a review.`;

    // Create in-app notification (using fast method)
    const notificationResult = await createNotificationFast({
      userId: user.user_id || user.id,
      title,
      message,
      type: 'error',
      link: '/appeals'
    });

    if (!notificationResult.success) {
      console.error('Failed to create restriction notification:', notificationResult.error);
    }

    // Broadcast via SSE for instant delivery
    try {
      const targetUserId = (user.user_id || user.id)?.toString();
      if (targetUserId) {
        broadcastToUser(targetUserId, 'user', {
          id: Date.now(),
          title,
          message,
          type: 'error',
          status: 0,
          link: null,
          created_at: new Date().toISOString()
        });
      }
    } catch {}

    // Send custom email notification
    const emailTemplate = createRestrictionNotificationEmail({
      userName: `${user.first_name} ${user.last_name}`,
      reason,
      duration
    });

    // Respect user email notification preference (default true)
    const emailOptIn = user.email_notifications !== null && user.email_notifications !== undefined
      ? Boolean(user.email_notifications)
      : true;
    if (emailOptIn) {
      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    }

    // Send SMS notification if user opted-in
    if (user.phone && (user.sms_notifications === 1 || user.sms_notifications === true)) {
      try {
        sendSMSAsync({
          to: user.phone,
          message: `🚨 Your RainbowPaws account has been restricted. Reason: ${reason}. You can submit an appeal through your account or contact support.`
        });
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
      }
    }

  } catch (error) {
    console.error('Error notifying user of restriction:', error);
    // Don't throw error as this is not critical
  }
}

// Email template for restriction notifications_unified
function createRestrictionNotificationEmail({
  userName,
  reason,
  duration
}: {
  userName: string;
  reason: string;
  duration?: string;
}) {
  const subject = '🚨 Account Restricted - Action Required';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Restricted</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚨 Account Restricted</h1>
        <p>Important notice regarding your RainbowPaws account</p>
      </div>
      <div class="content">
        <p>Dear ${userName},</p>

        <div class="alert-box">
          <h3>⚠️ Your account has been restricted</h3>
          <p><strong>Reason:</strong> ${reason}</p>
          ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : ''}
        </div>

        <p>This restriction means you will have limited access to RainbowPaws features. However, you have the right to appeal this decision.</p>

        <h3>📝 How to Submit an Appeal</h3>
        <p>If you believe this restriction was made in error or you would like to provide additional context, you can submit an appeal:</p>

        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/appeals" class="button">Submit Appeal</a>

                 <p><strong>Important:</strong> While your account is restricted, you will not be able to access most features of RainbowPaws. However, you can still submit appeals to request a review.</p>

        <p>We take these matters seriously and appreciate your understanding as we work to maintain a safe and respectful community for all users.</p>
      </div>
      <div class="footer">
        <p>This is an automated notification from RainbowPaws</p>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
