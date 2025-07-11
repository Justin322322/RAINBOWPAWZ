import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { createNotification } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMS } from '@/lib/smsService';

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
    const { userId, userType, businessId, action, reason, duration } = body;

    // Validate required fields
    if (!userId || !userType || !action) {
      return NextResponse.json({
        error: 'User ID, user type, and action are required',
        success: false
      }, { status: 400 });
    }

    // Validate action
    if (!['restrict', 'restore'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be "restrict" or "restore"',
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

    // For restrict action, require reason
    if (action === 'restrict' && !reason) {
      return NextResponse.json({
        error: 'Reason is required for restriction',
        success: false
      }, { status: 400 });
    }

    try {
      if (userType === 'personal') {
        // Handle personal users
        const userStatus = action === 'restrict' ? 'restricted' : 'active';

        await query(`
          UPDATE users
          SET status = ?, updated_at = NOW()
          WHERE user_id = ?
        `, [userStatus, userId]);

        // Get user details for notifications
        const userDetails = await query(`
          SELECT user_id, first_name, last_name, email, phone
          FROM users
          WHERE user_id = ?
        `, [userId]) as any[];

        if (action === 'restrict') {
          // Add entry to user_restrictions table
          await query(`
            INSERT INTO user_restrictions (user_id, reason, duration, is_active)
            VALUES (?, ?, ?, 1)
          `, [userId, reason, duration || null]);

          // Notify user of restriction
          if (userDetails && userDetails.length > 0) {
            await notifyUserOfRestriction(userDetails[0], reason, duration);
          }
        } else {
          // Update existing restrictions to inactive
          await query(`
            UPDATE user_restrictions
            SET is_active = 0
            WHERE user_id = ? AND is_active = 1
          `, [userId]);
        }

      } else if (userType === 'cremation_center') {
        // For cremation centers, we need the businessId
        if (!businessId) {
          return NextResponse.json({
            error: 'Business ID is required for cremation centers',
            success: false
          }, { status: 400 });
        }

        // Check which table exists: business_profiles or service_providers
        const tableCheckResult = await query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name IN ('business_profiles', 'service_providers')
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

          // Determine new status values based on action
          const newVerificationStatus = action === 'restrict' ? 'restricted' : 'verified';
          const newApplicationStatus = action === 'restrict' ? 'restricted' : 'approved';

          // Build safe update query for service_providers
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push(newVerificationStatus);
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push(newApplicationStatus);
          }

          if (action === 'restrict') {
            if (columnNames.includes('restriction_reason')) {
              updateParts.push('restriction_reason = ?');
              updateParams.push(reason);
            }

            if (columnNames.includes('restriction_date')) {
              updateParts.push('restriction_date = NOW()');
            }

            if (columnNames.includes('restriction_duration')) {
              updateParts.push('restriction_duration = ?');
              updateParams.push(duration || null);
            }
          } else {
            if (columnNames.includes('restriction_reason')) {
              updateParts.push('restriction_reason = NULL');
            }
            if (columnNames.includes('restriction_date')) {
              updateParts.push('restriction_date = NULL');
            }
            if (columnNames.includes('restriction_duration')) {
              updateParts.push('restriction_duration = NULL');
            }
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
          const userStatus = action === 'restrict' ? 'restricted' : 'active';
          await query(`
            UPDATE users
            SET status = ?, updated_at = NOW()
            WHERE user_id = ?
          `, [userStatus, businessUserId]);

          // Get user details for notifications
          const userDetails = await query(`
            SELECT user_id, first_name, last_name, email, phone
            FROM users
            WHERE user_id = ?
          `, [businessUserId]) as any[];

          if (action === 'restrict') {
            await query(`
              INSERT INTO user_restrictions (user_id, reason, duration, is_active)
              VALUES (?, ?, ?, 1)
            `, [businessUserId, reason, duration || null]);

            // Notify user of restriction
            if (userDetails && userDetails.length > 0) {
              await notifyUserOfRestriction(userDetails[0], reason, duration);
            }
          } else {
            await query(`
              UPDATE user_restrictions
              SET is_active = 0
              WHERE user_id = ? AND is_active = 1
            `, [businessUserId]);
          }

        } else {
          // Handle business_profiles table
          const businessExists = await query(
            'SELECT id, user_id FROM business_profiles WHERE id = ?', 
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
          const columnsResult = await query('SHOW COLUMNS FROM business_profiles') as any[];
          const columnNames = columnsResult.map((col: any) => col.Field);

          // Determine new status values based on action
          const newVerificationStatus = action === 'restrict' ? 'restricted' : 'verified';
          const newApplicationStatus = action === 'restrict' ? 'restricted' : 'approved';

          // Build safe update query for business_profiles
          const updateParts = [];
          const updateParams = [];

          if (columnNames.includes('verification_status')) {
            updateParts.push('verification_status = ?');
            updateParams.push(newVerificationStatus);
          }

          if (columnNames.includes('application_status')) {
            updateParts.push('application_status = ?');
            updateParams.push(newApplicationStatus);
          }

          if (action === 'restrict') {
            if (columnNames.includes('restriction_reason')) {
              updateParts.push('restriction_reason = ?');
              updateParams.push(reason);
            }

            if (columnNames.includes('restriction_date')) {
              updateParts.push('restriction_date = NOW()');
            }

            if (columnNames.includes('restriction_duration')) {
              updateParts.push('restriction_duration = ?');
              updateParams.push(duration || null);
            }
          } else {
            if (columnNames.includes('restriction_reason')) {
              updateParts.push('restriction_reason = NULL');
            }
            if (columnNames.includes('restriction_date')) {
              updateParts.push('restriction_date = NULL');
            }
            if (columnNames.includes('restriction_duration')) {
              updateParts.push('restriction_duration = NULL');
            }
          }

          if (columnNames.includes('updated_at')) {
            updateParts.push('updated_at = NOW()');
          }

          updateParams.push(businessId);

          if (updateParts.length > 0) {
            const updateQuery = `UPDATE business_profiles SET ${updateParts.join(', ')} WHERE id = ?`;
            await query(updateQuery, updateParams);
          }

          // Update user status
          const userStatus = action === 'restrict' ? 'restricted' : 'active';
          await query(`
            UPDATE users
            SET status = ?, updated_at = NOW()
            WHERE user_id = ?
          `, [userStatus, businessUserId]);

          // Get user details for notifications
          const userDetails = await query(`
            SELECT user_id, first_name, last_name, email, phone
            FROM users
            WHERE user_id = ?
          `, [businessUserId]) as any[];

          if (action === 'restrict') {
            await query(`
              INSERT INTO user_restrictions (user_id, reason, duration, is_active)
              VALUES (?, ?, ?, 1)
            `, [businessUserId, reason, duration || null]);

            // Notify user of restriction
            if (userDetails && userDetails.length > 0) {
              await notifyUserOfRestriction(userDetails[0], reason, duration);
            }
          } else {
            await query(`
              UPDATE user_restrictions
              SET is_active = 0
              WHERE user_id = ? AND is_active = 1
            `, [businessUserId]);
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
        error: `Database error when ${action === 'restrict' ? 'restricting' : 'restoring'} user`,
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === 'restrict' ? 'restricted' : 'restored'} successfully`
    });
  } catch (error) {
    // Provide more detailed error information
    let errorMessage = 'Failed to update user status';
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

// Helper function to notify user of restriction
async function notifyUserOfRestriction(user: any, reason: string, duration?: string) {
  try {
    const title = 'Account Restricted';
    const message = `Your account has been restricted. Reason: ${reason}${duration ? ` Duration: ${duration}` : ''}. You can submit an appeal to request a review.`;

    // Create in-app notification
    await createNotification({
      userId: user.user_id || user.id,
      title,
      message,
      type: 'error',
      link: '/appeals',
      shouldSendEmail: false // We'll send custom email below
    });

    // Send custom email notification
    const emailTemplate = createRestrictionNotificationEmail({
      userName: `${user.first_name} ${user.last_name}`,
      reason,
      duration
    });

    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });

    // Send SMS notification
    if (user.phone) {
      await sendSMS({
        to: user.phone,
        message: `🚨 Your RainbowPaws account has been restricted. Reason: ${reason}. You can submit an appeal at ${process.env.NEXT_PUBLIC_BASE_URL}/appeals`
      });
    }

  } catch (error) {
    console.error('Error notifying user of restriction:', error);
    // Don't throw error as this is not critical
  }
}

// Email template for restriction notifications
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
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Restriction Notice</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #EF4444, #DC2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
        .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .info-box { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Account Restricted</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>

          <div class="alert-box">
            <h3 style="margin-top: 0; color: #dc2626;">Your account has been restricted</h3>
            <p>We have temporarily restricted your access to RainbowPaws due to a violation of our terms of service.</p>
          </div>

          <div class="info-box">
            <h4>Restriction Details:</h4>
            <p><strong>Reason:</strong> ${reason}</p>
            ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : '<p><strong>Duration:</strong> Until further review</p>'}
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <h3>What can you do?</h3>
          <ul>
            <li><strong>Submit an Appeal:</strong> If you believe this restriction was made in error, you can submit an appeal for review</li>
            <li><strong>Contact Support:</strong> Reach out to our support team for clarification</li>
            <li><strong>Review Guidelines:</strong> Familiarize yourself with our terms of service and community guidelines</li>
          </ul>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/appeals" class="button">
            Submit an Appeal
          </a>

          <p><strong>Important:</strong> While your account is restricted, you will not be able to access most features of RainbowPaws. However, you can still submit appeals and contact our support team.</p>

          <p>We take these matters seriously and appreciate your understanding as we work to maintain a safe and respectful community for all users.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from RainbowPaws</p>
          <p>If you have questions, please contact our support team at support@rainbowpaws.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

