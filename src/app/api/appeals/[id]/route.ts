import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query, withTransaction } from '@/lib/db';
import { createNotification } from '@/services/NotificationService';
import { sendEmail } from '@/services/EmailService';
import { sendSMS } from '@/lib/smsService';

/**
 * GET - Fetch a specific appeal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appealId = parseInt(params.id);
    if (isNaN(appealId)) {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }

    // Fetch the appeal with user details
    const appeals = await query(`
      SELECT 
        a.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name
      FROM user_appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN users admin ON a.admin_id = admin.user_id
      WHERE a.appeal_id = ?
    `, [appealId]) as any[];

    if (!appeals || appeals.length === 0) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    const appeal = appeals[0];

    // Check permissions - users can only see their own appeals, admins can see all
    if (user.accountType !== 'admin' && appeal.user_id !== parseInt(user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse evidence files
    appeal.evidence_files = appeal.evidence_files ? JSON.parse(appeal.evidence_files) : [];

    return NextResponse.json({
      success: true,
      appeal
    });

  } catch (error) {
    console.error('Error fetching appeal:', error);
    return NextResponse.json({
      error: 'Failed to fetch appeal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT - Update appeal status (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update appeals
    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const appealId = parseInt(params.id);
    if (isNaN(appealId)) {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, admin_response } = body;

    // Validate status
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    // Fetch the current appeal
    const currentAppeals = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone
      FROM user_appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE a.appeal_id = ?
    `, [appealId]) as any[];

    if (!currentAppeals || currentAppeals.length === 0) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    const currentAppeal = currentAppeals[0];

    // Update the appeal
    const _result = await withTransaction(async (transaction) => {
      // Log the status change in appeal history
      await transaction.query(`
        INSERT INTO appeal_history (appeal_id, previous_status, new_status, admin_id, admin_response, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        appealId,
        currentAppeal.status,
        status,
        parseInt(user.userId),
        admin_response,
        `Status changed from ${currentAppeal.status} to ${status} by admin (ID: ${user.userId})`
      ]);

      const updateFields = ['status = ?', 'admin_id = ?', 'updated_at = NOW()'];
      const updateValues = [status, parseInt(user.userId)];

      if (admin_response) {
        updateFields.push('admin_response = ?');
        updateValues.push(admin_response);
      }

      if (status === 'under_review') {
        updateFields.push('reviewed_at = NOW()');
      } else if (status === 'approved' || status === 'rejected') {
        updateFields.push('resolved_at = NOW()');
      }

      updateValues.push(appealId);

      await transaction.query(`
        UPDATE user_appeals
        SET ${updateFields.join(', ')}
        WHERE appeal_id = ?
      `, updateValues);

      // If appeal is approved, remove user restriction
      if (status === 'approved') {
        // First, check if this is a business user by looking for service provider record
        const serviceProviderCheck = await transaction.query(`
          SELECT provider_id, application_status
          FROM service_providers
          WHERE user_id = ?
        `, [currentAppeal.user_id]);

        if (serviceProviderCheck && serviceProviderCheck.length > 0) {
          // This is a business user - update service_providers table
          const providerId = serviceProviderCheck[0].provider_id;

          await transaction.query(`
            UPDATE service_providers
            SET application_status = 'approved', updated_at = NOW()
            WHERE provider_id = ?
          `, [providerId]);
        }

        // Update user status for both personal and business users
        await transaction.query(`
          UPDATE users
          SET status = 'active', updated_at = NOW()
          WHERE user_id = ?
        `, [currentAppeal.user_id]);

        // Deactivate user restrictions
        await transaction.query(`
          UPDATE user_restrictions
          SET is_active = 0
          WHERE user_id = ? AND is_active = 1
        `, [currentAppeal.user_id]);

        // Log the account restoration
        await transaction.query(`
          INSERT INTO appeal_history (appeal_id, previous_status, new_status, admin_id, notes)
          VALUES (?, ?, ?, ?, ?)
        `, [
          appealId,
          status,
          status,
          parseInt(user.userId),
          `Account restrictions removed and user status restored to active`
        ]);
      }

      return true;
    });

    // Notify the user about the appeal status update
    await notifyUserOfAppealUpdate(currentAppeal, status, admin_response, user);

    return NextResponse.json({
      success: true,
      message: `Appeal ${status} successfully`
    });

  } catch (error) {
    console.error('Error updating appeal:', error);
    return NextResponse.json({
      error: 'Failed to update appeal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete an appeal (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete appeals
    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const appealId = parseInt(params.id);
    if (isNaN(appealId)) {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }

    // Check if appeal exists
    const existingAppeals = await query(`
      SELECT appeal_id FROM user_appeals WHERE appeal_id = ?
    `, [appealId]) as any[];

    if (!existingAppeals || existingAppeals.length === 0) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    // Delete the appeal
    await query(`DELETE FROM user_appeals WHERE appeal_id = ?`, [appealId]);

    return NextResponse.json({
      success: true,
      message: 'Appeal deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting appeal:', error);
    return NextResponse.json({
      error: 'Failed to delete appeal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to notify user of appeal status update
async function notifyUserOfAppealUpdate(
  appeal: any,
  newStatus: string,
  adminResponse: string | null,
  _: any
) {
  try {
    let title = '';
    let message = '';
    let emailTemplate: { subject: string; html: string };

    switch (newStatus) {
      case 'under_review':
        title = 'Appeal Under Review';
        message = 'Your appeal is now being reviewed by our team. We will update you once a decision is made.';
        emailTemplate = createAppealStatusEmail({
          userName: `${appeal.first_name} ${appeal.last_name}`,
          status: 'under_review',
          adminResponse: adminResponse || undefined,
          appealSubject: 'Your account restriction appeal'
        });
        break;
      case 'approved':
        title = 'Appeal Approved';
        message = 'Great news! Your appeal has been approved and your account restrictions have been lifted.';
        emailTemplate = createAppealStatusEmail({
          userName: `${appeal.first_name} ${appeal.last_name}`,
          status: 'approved',
          adminResponse: adminResponse || undefined,
          appealSubject: 'Your account restriction appeal'
        });
        break;
      case 'rejected':
        title = 'Appeal Rejected';
        message = 'Unfortunately, your appeal has been rejected. ' + (adminResponse || 'Please contact support for more information.');
        emailTemplate = createAppealStatusEmail({
          userName: `${appeal.first_name} ${appeal.last_name}`,
          status: 'rejected',
          adminResponse: adminResponse || undefined,
          appealSubject: 'Your account restriction appeal'
        });
        break;
      default:
        return;
    }

    // Create in-app notification
    await createNotification({
      userId: appeal.user_id,
      title,
      message,
      type: 'info',
      link: '/appeals',
      shouldSendEmail: false // We'll send custom email below
    });

    // Send custom email notification
    await sendEmail({
      to: appeal.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });

    // Send SMS notification for important status changes
    if ((newStatus === 'approved' || newStatus === 'rejected') && appeal.phone) {
      const smsMessage = newStatus === 'approved'
        ? `🎉 Great news! Your appeal has been approved and your account access has been restored. You can now log in to RainbowPaws.`
        : `❌ Your appeal has been reviewed and unfortunately was not approved. ${adminResponse ? 'Reason: ' + adminResponse.substring(0, 80) + '...' : 'Please contact support for more information.'}`;

      await sendSMS({
        to: appeal.phone,
        message: smsMessage
      });
    }

  } catch (error) {
    console.error('Error notifying user of appeal update:', error);
    // Don't throw error as this is not critical
  }
}

// Email template for appeal status updates
function createAppealStatusEmail({
  userName,
  status,
  adminResponse,
  appealSubject: _
}: {
  userName: string;
  status: 'under_review' | 'approved' | 'rejected';
  adminResponse?: string;
  appealSubject: string;
}) {
  let subject = '';
  let statusColor = '';
  let statusIcon = '';
  let statusTitle = '';
  let statusMessage = '';

  switch (status) {
    case 'under_review':
      subject = '👀 Your Appeal is Under Review';
      statusColor = '#3B82F6';
      statusIcon = '👀';
      statusTitle = 'Appeal Under Review';
      statusMessage = 'Our team is currently reviewing your appeal. We will notify you once a decision has been made.';
      break;
    case 'approved':
      subject = '🎉 Appeal Approved - Welcome Back!';
      statusColor = '#10B981';
      statusIcon = '🎉';
      statusTitle = 'Appeal Approved';
      statusMessage = 'Great news! Your appeal has been approved and your account restrictions have been lifted. You can now access all features of RainbowPaws.';
      break;
    case 'rejected':
      subject = '❌ Appeal Decision - Not Approved';
      statusColor = '#EF4444';
      statusIcon = '❌';
      statusTitle = 'Appeal Not Approved';
      statusMessage = 'After careful review, we were unable to approve your appeal at this time.';
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appeal Status Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
        .status-box { background-color: ${status === 'approved' ? '#ecfdf5' : status === 'rejected' ? '#fef2f2' : '#eff6ff'}; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .response-box { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusIcon} ${statusTitle}</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>

          <div class="status-box">
            <h3 style="margin-top: 0; color: ${statusColor};">${statusTitle}</h3>
            <p>${statusMessage}</p>
          </div>

          ${adminResponse ? `
          <div class="response-box">
            <h4>Admin Response:</h4>
            <p>${adminResponse}</p>
          </div>
          ` : ''}

          ${status === 'approved' ? `
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>You can now log in to your RainbowPaws account</li>
            <li>All features and services are available to you</li>
            <li>Please review our terms of service to avoid future restrictions</li>
          </ul>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" class="button">
            Log In to Your Account
          </a>
          ` : status === 'rejected' ? `
          <p><strong>What can you do?</strong></p>
          <ul>
            <li>Contact our support team for clarification</li>
            <li>Review our terms of service and community guidelines</li>
            <li>You may submit a new appeal after addressing the concerns</li>
          </ul>

          <a href="mailto:support@rainbowpaws.com" class="button">
            Contact Support
          </a>
          ` : `
          <p>We appreciate your patience while we review your appeal. You will receive another notification once a decision has been made.</p>
          `}
        </div>
        <div class="footer">
          <p>This is an automated notification from RainbowPaws</p>
          <p>If you have questions, please contact our support team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
