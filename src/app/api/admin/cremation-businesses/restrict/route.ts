import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getServerAppUrl } from '@/utils/appUrl';
import { createNotification } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMS } from '@/lib/httpSmsService';

// API endpoint to restrict or restore access to a cremation business
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get the business ID and action from the request body
    const body = await request.json();
    const { businessId, action } = body;

    if (!businessId) {
      return NextResponse.json({
        error: 'Missing business ID',
        success: false
      }, { status: 400 });
    }

    if (action !== 'restrict' && action !== 'restore') {
      return NextResponse.json({
        error: 'Invalid action. Must be either "restrict" or "restore"',
        success: false
      }, { status: 400 });
    }

    // Determine the new status based on the action
    const newStatus = action === 'restrict' ? 'restricted' : 'verified';
    // For application_status, when restoring, use 'approved' (it's the new equivalent of 'verified')
    const newApplicationStatus = action === 'restrict' ? 'restricted' : 'approved';

    let result;
    let businessUserId: number | null = null; // Declare in broader scope
    const tableName = 'service_providers'; // Use only the service_providers table
    try {

      // SECURITY FIX: First, check if the business profile exists
      const checkResult = await query(`
        SELECT provider_id, user_id, application_status, provider_type
        FROM service_providers
        WHERE provider_id = ?
      `, [businessId]) as any[];


      if (!checkResult || checkResult.length === 0) {
        return NextResponse.json({
          error: 'Business profile not found',
          details: `No business profile found with ID ${businessId} in service_providers table`,
          success: false
        }, { status: 404 });
      }

      // Get the user ID from the check result
      businessUserId = checkResult[0].user_id;

      // SECURITY FIX: Check for available columns
      const columnsResult = await query('SHOW COLUMNS FROM service_providers') as any[];


      // Get all column names
      const columnNames = columnsResult.map((col: any) => col.Field);

      // Check for required columns
      const hasApplicationStatus = columnNames.includes('application_status');
      const hasStatus = columnNames.includes('status');
      const hasProviderType = columnNames.includes('provider_type');

      // Prepare update parts based on available columns
      let updateParts = [];
      let updateParams = [];

      // Update application_status (primary status field)
      if (hasApplicationStatus) {
        updateParts.push('application_status = ?');
        updateParams.push(newApplicationStatus);
      }

      // Update status field if it exists (though it should be removed in migration)
      if (hasStatus) {
        updateParts.push('status = ?');
        updateParams.push(action === 'restrict' ? 'restricted' : 'active');
      }

      // Add updated_at timestamp
      if (columnNames.includes('updated_at')) {
        updateParts.push('updated_at = NOW()');
      }

      // Add verification_date if we're approving/verifying the business
      if (action === 'restore' && columnNames.includes('verification_date')) {
        updateParts.push('verification_date = NOW()');
      }

      // Clear restriction fields when restoring
      if (action === 'restore') {
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

      // If there are no columns to update, return an error
      if (updateParts.length === 0) {
        return NextResponse.json({
          error: 'Database schema issue',
          details: 'Could not find appropriate columns to update',
          success: false
        }, { status: 500 });
      }

      // Add businessId to parameters
      updateParams.push(businessId);

      // SECURITY FIX: Build the final query with validated table name
      let updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;

      // Add provider_type condition if the column exists and the business type is known
      const businessType = checkResult[0].provider_type;
      if (hasProviderType && businessType) {
        updateQuery += ` AND provider_type = ?`;
        updateParams.push(businessType);
      }


      try {
        result = await query(updateQuery, updateParams);

        // If no rows were affected, try without the provider_type condition
        if (hasProviderType && (result as any).affectedRows === 0) {

          // Remove the provider_type condition and the last parameter
          if (businessType) {
            updateParams.pop();
          }
          updateQuery = `UPDATE service_providers SET ${updateParts.join(', ')} WHERE provider_id = ?`;

          result = await query(updateQuery, updateParams);
        }
      } catch (queryError) {
        return NextResponse.json({
          error: 'SQL error during update',
          details: queryError instanceof Error ? queryError.message : 'Unknown database error',
          success: false
        }, { status: 500 });
      }

      // Also update the user status if appropriate
      try {
        // SECURITY FIX: Get the user ID for this service provider
        const userResult = await query(`
          SELECT user_id FROM service_providers WHERE provider_id = ?
        `, [businessId]) as any[];

        if (userResult && userResult.length > 0) {
          const userId = userResult[0].user_id;

          // Update the user's status
          await query(`
            UPDATE users
            SET status = ?, updated_at = NOW()
            WHERE user_id = ?
          `, [action === 'restrict' ? 'restricted' : 'active', userId]);


          // Handle user_restrictions table if it exists
          const restrictionsTableResult = await query(`
            SHOW TABLES LIKE 'user_restrictions'
          `) as any[];

          if (restrictionsTableResult && restrictionsTableResult.length > 0) {
            if (action === 'restrict') {
              // Add a new restriction record
              await query(`
                INSERT INTO user_restrictions (user_id, reason, duration)
                VALUES (?, ?, ?)
              `, [userId, body.reason || 'Restricted by admin', body.duration || 'indefinite']);
            } else {
              // Mark existing restrictions as inactive
              await query(`
                UPDATE user_restrictions
                SET is_active = 0
                WHERE user_id = ? AND is_active = 1
              `, [userId]);
            }
          }
        }
      } catch {
        // Non-critical error, just log it
      }
    } catch (updateError) {
      throw updateError;
    }

    // Check if the update was successful
    if (!result) {
      return NextResponse.json({
        error: 'Failed to update business status',
        details: 'Database update failed',
        success: false
      }, { status: 500 });
    }

    // If no rows were affected, it could be because the business was already in the desired state
    // In this case, we'll still return success to avoid confusing the client
    if ((result as any).affectedRows === 0) {
      // SECURITY FIX: Check the current status to include in the response
      const currentStatusResult = await query(`
        SELECT application_status
        FROM service_providers
        WHERE provider_id = ?
      `, [businessId]) as any[];

      const currentStatus = currentStatusResult && currentStatusResult.length > 0
        ? currentStatusResult[0]
        : { application_status: newApplicationStatus };

      return NextResponse.json({
        success: true,
        message: `Business already in ${action === 'restrict' ? 'restricted' : 'restored'} state`,
        newStatus: newApplicationStatus,
        newApplicationStatus: currentStatus.application_status || newApplicationStatus,
        noChanges: true
      });
    }

    // Try to log the action for audit purposes
    try {
      // First check if the admin_logs table exists
      const tableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'admin_logs'
      `, [process.env.DB_NAME || 'rainbow_paws']);

      const tableExists = tableCheck && Array.isArray(tableCheck) &&
                          tableCheck[0] && tableCheck[0].count > 0;

      if (tableExists) {
        await query(`
          INSERT INTO admin_logs (action, entity_type, entity_id, admin_id, details)
          VALUES (?, ?, ?, ?, ?)
        `, [
          action === 'restrict' ? 'restrict_business' : 'restore_business',
          tableName, // Use the correct table name
          businessId,
          'admin', // In a real system, this would be the admin's ID
          JSON.stringify({ action, businessId, newStatus, newApplicationStatus })
        ]);
      } else {
      }
    } catch {
      // Non-critical error, just log it
    }

    // Send notifications asynchronously after successful database operations
    if (action === 'restrict' && businessUserId) {
      // Don't await this to prevent blocking the response
      notifyUserOfRestriction(businessUserId, body.reason || 'Restricted by admin', body.duration, businessId)
        .catch(error => {
          console.error('Failed to send restriction notification:', error);
          // Don't throw error as this is not critical for the main operation
        });
    } else if (action === 'restore' && businessUserId) {
      // Send restoration notifications
      notifyUserOfRestoration(businessUserId, businessId)
        .catch(error => {
          console.error('Failed to send restoration notification:', error);
          // Don't throw error as this is not critical for the main operation
        });
    }

    return NextResponse.json({
      success: true,
      message: `Business ${action === 'restrict' ? 'restricted' : 'restored'} successfully`,
      newStatus,
      newApplicationStatus
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update business status',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// Helper function to notify user of restriction
async function notifyUserOfRestriction(userId: number, reason: string, duration?: string, businessId?: number) {
  try {
    // Get user details for notifications with timeout
    const userResult = await Promise.race([
      query(
        `SELECT user_id, first_name, last_name, email, phone, sms_notifications
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('User query timeout')), 5000)
      )
    ]) as any[];

    if (!userResult || userResult.length === 0) {
      console.warn(`User not found for notification: ${userId}`);
      return;
    }

    const user = userResult[0];
    const title = 'Account Restricted';
    const message = `Your cremation center account has been restricted. Reason: ${reason}${duration ? ` Duration: ${duration}` : ''}. You can submit an appeal to request a review.`;

    // Create in-app notification with timeout and error handling
    try {
      await Promise.race([
        createNotification({
          userId: user.user_id,
          title,
          message,
          type: 'error',
          link: '/appeals',
          shouldSendEmail: false // We'll send custom email below
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Notification creation timeout')), 10000)
        )
      ]);
    } catch (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
      // Continue with other notifications even if this fails
    }

    // Send custom email notification (independent of in-app notification)
    try {
      const emailTemplate = createRestrictionNotificationEmail({
        userName: `${user.first_name} ${user.last_name}`,
        reason,
        duration,
        userType: 'cremation center'
      });

      const emailOptIn = user.email_notifications !== null && user.email_notifications !== undefined
        ? Boolean(user.email_notifications)
        : true;

      if (emailOptIn) {
        await Promise.race([
          sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email sending timeout')), 15000)
          )
        ]);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue with SMS even if email fails
    }

    // Send SMS notification (independent of other notifications)
    if (user.phone && (user.sms_notifications === 1 || user.sms_notifications === true)) {
      try {
        const smsResult = await sendSMS({
          to: user.phone,
          message: `🚨 Your RainbowPaws cremation center account has been restricted. Reason: ${reason}. You can submit an appeal at ${getServerAppUrl()}/appeals`
        });
        
        if (smsResult.success) {
          console.log(`✅ Restriction SMS sent successfully to ${user.phone} for cremation business #${businessId}`);
        } else {
          console.error(`❌ Restriction SMS failed for cremation business #${businessId}:`, smsResult.error);
        }
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
      }
    }

  } catch (error) {
    console.error('Error notifying user of restriction:', error);
    // Don't throw error as this is not critical for the main operation
  }
}

// Helper function to notify user of restoration
async function notifyUserOfRestoration(userId: number, businessId: number) {
  try {
    // Get user details for notifications with timeout
    const userResult = await Promise.race([
      query(
        `SELECT user_id, first_name, last_name, email, phone, sms_notifications
         FROM users WHERE user_id = ? LIMIT 1`,
        [userId]
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('User query timeout')), 5000)
      )
    ]) as any[];

    if (!userResult || userResult.length === 0) {
      console.warn(`User not found for restoration notification: ${userId}`);
      return;
    }

    const user = userResult[0];
    const title = 'Account Restored';
    const message = `Your cremation center account has been restored. You can now access all features of your account.`;

    // Create in-app notification with timeout and error handling
    try {
      await Promise.race([
        createNotification({
          userId: user.user_id,
          title,
          message,
          type: 'success',
          link: '/dashboard', // Or a specific dashboard link
          shouldSendEmail: false // We'll send custom email below
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Notification creation timeout')), 10000)
        )
      ]);
    } catch (notificationError) {
      console.error('Failed to create in-app notification for restoration:', notificationError);
      // Continue with other notifications even if this fails
    }

    // Send custom email notification (independent of in-app notification)
    try {
      const emailTemplate = createRestorationNotificationEmail({
        userName: `${user.first_name} ${user.last_name}`,
        userType: 'cremation center'
      });

      const emailOptIn = user.email_notifications !== null && user.email_notifications !== undefined
        ? Boolean(user.email_notifications)
        : true;

      if (emailOptIn) {
        await Promise.race([
          sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email sending timeout')), 15000)
          )
        ]);
      }
    } catch (emailError) {
      console.error('Failed to send email notification for restoration:', emailError);
      // Continue with SMS even if email fails
    }

    // Send SMS notification (independent of other notifications)
    if (user.phone && (user.sms_notifications === 1 || user.sms_notifications === true)) {
      try {
        const smsResult = await sendSMS({
          to: user.phone,
          message: `✅ Your RainbowPaws cremation center account has been restored. You can now access all features of your account.`
        });
        
        if (smsResult.success) {
          console.log(`✅ Restoration SMS sent successfully to ${user.phone} for cremation business #${businessId}`);
        } else {
          console.error(`❌ Restoration SMS failed for cremation business #${businessId}:`, smsResult.error);
        }
      } catch (smsError) {
        console.error('Failed to send SMS notification for restoration:', smsError);
      }
    }

  } catch (error) {
    console.error('Error notifying user of restoration:', error);
    // Don't throw error as this is not critical for the main operation
  }
}

// Email template for restriction notifications
function createRestrictionNotificationEmail({
  userName,
  reason,
  duration,
  userType = 'user'
}: {
  userName: string;
  reason: string;
  duration?: string;
  userType?: string;
}) {
  const subject = '�� Account Restricted - Action Required';
  const appUrl = getServerAppUrl();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Restricted</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Account Restricted</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>

          <div class="warning">
            <strong>Your ${userType} account has been restricted.</strong>
          </div>

          <p><strong>Reason:</strong> ${reason}</p>
          ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : ''}

          <p>This restriction prevents you from accessing certain features of your account. If you believe this restriction was applied in error, you can submit an appeal for review.</p>

          <div style="text-align: center;">
            <a href="${appUrl}/appeals" class="button">Submit an Appeal</a>
          </div>

          <p>If you have any questions, please contact our support team.</p>

          <p>Thank you,<br>The RainbowPaws Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} RainbowPaws - Pet Memorial Services</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// Email template for restoration notifications
function createRestorationNotificationEmail({
  userName,
  userType = 'user'
}: {
  userName: string;
  userType?: string;
}) {
  const subject = '✅ Account Restored - Access Granted';
  const appUrl = getServerAppUrl();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Restored</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .success { background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Account Restored</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>

          <div class="success">
            <strong>Your ${userType} account has been restored.</strong>
          </div>

          <p>You can now access all features of your account. If you have any questions, please contact our support team.</p>

          <div style="text-align: center;">
            <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
          </div>

          <p>Thank you,<br>The RainbowPaws Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} RainbowPaws - Pet Memorial Services</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

