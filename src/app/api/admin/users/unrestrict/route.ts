import { NextRequest, NextResponse } from 'next/server';
import { broadcastToUser } from '@/app/api/notifications/sse/route';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { createNotification } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMS } from '@/lib/httpSmsService';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        success: false
      }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required',
        success: false
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, userType, businessId } = body;

    // Validate required fields
    if (!userId || !userType) {
      return NextResponse.json({
        error: 'User ID and user type are required',
        success: false
      }, { status: 400 });
    }

    // Validate user type
    if (!['personal', 'cremation_center'].includes(userType)) {
      return NextResponse.json({
        error: 'Invalid user type. Must be "personal" or "cremation_center"',
        success: false
      }, { status: 400 });
    }

    let restoredUser: any = null; // Store user info for notifications

    try {
      if (userType === 'personal') {
        // For personal users, simply update their status in users table
        await query(`
          UPDATE users
          SET status = 'active', updated_at = NOW()
          WHERE user_id = ?
        `, [userId]);

        // Update any existing restrictions to inactive
        await query(`
          UPDATE user_restrictions
          SET is_active = 0
          WHERE user_id = ? AND is_active = 1
        `, [userId]);

        // Get user details for notifications
        const userResult = await query(`
          SELECT user_id, first_name, last_name, email, phone, sms_notifications
          FROM users WHERE user_id = ?
        `, [userId]) as any[];
        
        if (userResult && userResult.length > 0) {
          restoredUser = userResult[0];
        }

      } else if (userType === 'cremation_center') {
        // For cremation centers, we need the businessId
        if (!businessId) {
          return NextResponse.json({
            error: 'Business ID is required for cremation centers',
            success: false
          }, { status: 400 });
        }

        // Check which table exists: service_providers or service_providers
        const tableCheckResult = await query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name IN ('service_providers', 'service_providers')
        `) as any[];

        const tableNames = tableCheckResult.map((row: any) => row.table_name);
        const useServiceProvidersTable = tableNames.includes('service_providers');
        
        // SECURITY FIX: Use validated table names instead of template literals
        if (useServiceProvidersTable) {
          // Handle service_providers table
          const businessExists = await query(
            'SELECT provider_id, user_id FROM service_providers WHERE provider_id = ?', 
            [businessId]
          ) as any[];
          
          if (!businessExists || businessExists.length === 0) {
            return NextResponse.json({
              error: `Service provider with ID ${businessId} not found`,
              success: false
            }, { status: 404 });
          }

          const businessUserId = businessExists[0].user_id;

          // Check available columns safely
          const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];
          const columnNames = columnsResult.map((col: any) => col.Field);

          // Build safe update query for service_providers
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push('verified');
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push('approved');
          }

          if (columnNames.includes('verification_date')) {
            updateParts.push('verification_date = NOW()');
          }

          if (columnNames.includes('restriction_reason')) {
            updateParts.push('restriction_reason = NULL');
          }

          if (columnNames.includes('restriction_date')) {
            updateParts.push('restriction_date = NULL');
          }

          if (columnNames.includes('restriction_duration')) {
            updateParts.push('restriction_duration = NULL');
          }

          if (columnNames.includes('updated_at')) {
            updateParts.push('updated_at = NOW()');
          }

          updateParams.push(businessId);

          if (updateParts.length > 0) {
            const updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;
            await query(updateQuery, updateParams);
          }

          // Update user status
          await query(`
            UPDATE users
            SET status = 'active', updated_at = NOW()
            WHERE user_id = ?
          `, [businessUserId]);

          // Update restrictions
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [businessUserId]);

          // Get user details for notifications
          const userResult = await query(`
            SELECT user_id, first_name, last_name, email, phone, sms_notifications
            FROM users WHERE user_id = ?
          `, [businessUserId]) as any[];
          
          if (userResult && userResult.length > 0) {
            restoredUser = userResult[0];
          }

        } else {
          // Handle service_providers table
          const businessExists = await query(
            'SELECT id, user_id FROM service_providers WHERE id = ?', 
            [businessId]
          ) as any[];
          
          if (!businessExists || businessExists.length === 0) {
            return NextResponse.json({
              error: `Business profile with ID ${businessId} not found`,
              success: false
            }, { status: 404 });
          }

          const businessUserId = businessExists[0].user_id;

          // Check available columns safely
          const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];
          const columnNames = columnsResult.map((col: any) => col.Field);

          // Build safe update query for service_providers
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push('verified');
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push('approved');
          }

          if (columnNames.includes('verification_date')) {
            updateParts.push('verification_date = NOW()');
          }

          if (columnNames.includes('restriction_reason')) {
            updateParts.push('restriction_reason = NULL');
          }

          if (columnNames.includes('restriction_date')) {
            updateParts.push('restriction_date = NULL');
          }

          if (columnNames.includes('restriction_duration')) {
            updateParts.push('restriction_duration = NULL');
          }

          if (columnNames.includes('updated_at')) {
            updateParts.push('updated_at = NOW()');
          }

          updateParams.push(businessId);

          if (updateParts.length > 0) {
            const updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE id = ?`;
            await query(updateQuery, updateParams);
          }

          // Update user status
          await query(`
            UPDATE users
            SET status = 'active', updated_at = NOW()
            WHERE user_id = ?
          `, [businessUserId]);

          // Update restrictions
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [businessUserId]);

          // Get user details for notifications
          const userResult = await query(`
            SELECT user_id, first_name, last_name, email, phone, sms_notifications
            FROM users WHERE user_id = ?
          `, [businessUserId]) as any[];
          
          if (userResult && userResult.length > 0) {
            restoredUser = userResult[0];
          }
        }
      } else {
        return NextResponse.json({
          error: 'Invalid user type',
          success: false
        }, { status: 400 });
      }
    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error when restoring user',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    // Send restoration notifications asynchronously after successful database operations
    if (restoredUser) {
      // Don't await this to prevent blocking the response
      notifyUserOfRestoration(restoredUser, userType)
        .catch(error => {
          console.error('Failed to send restoration notification:', error);
          // Don't throw error as this is not critical for the main operation
        });
    }

    return NextResponse.json({
      success: true,
      message: 'User restored successfully'
    });
  } catch (error) {
    // Provide more detailed error information
    let errorMessage = 'Failed to restore user';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        errorMessage = 'Database table not found';
        errorDetails = 'The required database table does not exist. Database schema may need to be updated.';
      } else if (error.message.includes('ER_BAD_FIELD_ERROR')) {
        errorMessage = 'Database column not found';
        errorDetails = 'A required column is missing from the database. Database schema may need to be updated.';
      } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        errorMessage = 'Database access denied';
        errorDetails = 'Could not access the database due to permission issues.';
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      success: false
    }, { status: statusCode });
  }
}

// Helper function to notify user of restoration
async function notifyUserOfRestoration(user: any, userType: string) {
  try {
    const title = 'Account Access Restored';
    const userTypeText = userType === 'cremation_center' ? 'cremation center' : 'personal';
    const message = `Your ${userTypeText} account access has been restored. You can now use all features of RainbowPaws again.`;

    // Create in-app notification
    await createNotification({
      userId: user.user_id,
      title,
      message,
      type: 'success',
      link: userType === 'cremation_center' ? '/cremation/dashboard' : '/user/furparent_dashboard',
      shouldSendEmail: false // We'll send custom email below
    });

    // Broadcast via SSE for instant delivery
    try {
      const targetUserId = user.user_id?.toString();
      if (targetUserId) {
        broadcastToUser(targetUserId, userType === 'cremation_center' ? 'business' : 'user', {
          id: Date.now(),
          title,
          message,
          type: 'success',
          is_read: 0,
          link: userType === 'cremation_center' ? '/cremation/dashboard' : '/user/furparent_dashboard',
          created_at: new Date().toISOString()
        });
      }
    } catch {}

    // Send custom email notification
    const emailTemplate = createRestorationNotificationEmail({
      userName: `${user.first_name} ${user.last_name}`,
      userType: userTypeText
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
        const smsResult = await sendSMS({
          to: user.phone,
          message: `✅ Your RainbowPaws ${userTypeText} account access has been restored! You can now use all features again.`
        });
        
        if (smsResult.success) {
          console.log(`✅ Restoration SMS sent successfully to ${user.phone} for user #${user.user_id}`);
        } else {
          console.error(`❌ Restoration SMS failed for user #${user.user_id}:`, smsResult.error);
        }
      } catch (smsError) {
        console.error('Failed to send restoration SMS notification:', smsError);
      }
    }

  } catch (error) {
    console.error('Error notifying user of restoration:', error);
    // Don't throw error as this is not critical
  }
}

// Email template for restoration notifications
function createRestorationNotificationEmail({
  userName,
  userType
}: {
  userName: string;
  userType: string;
}) {
  const subject = '✅ Account Access Restored - Welcome Back!';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Restoration Notice</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
        .success-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .info-box { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Account Access Restored</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>

          <div class="success-box">
            <h3 style="margin-top: 0; color: #059669;">Great news! Your account access has been restored</h3>
            <p>We're pleased to inform you that your ${userType} account access has been fully restored. You can now use all features of RainbowPaws again.</p>
          </div>

          <div class="info-box">
            <h4>What this means:</h4>
            <ul>
              <li>✅ Full access to all platform features</li>
              <li>✅ Ability to make new bookings and requests</li>
              <li>✅ Access to your dashboard and account settings</li>
              <li>✅ All previous restrictions have been removed</li>
            </ul>
          </div>

          <p>We appreciate your patience during this process. If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://rainbowpaws.com'}/user/furparent_dashboard" class="button">
              Access Your Dashboard
            </a>
          </div>

          <p>Thank you for being part of the RainbowPaws community!</p>

          <p>Best regards,<br>The RainbowPaws Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 RainbowPaws. All rights reserved.</p>
          <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
