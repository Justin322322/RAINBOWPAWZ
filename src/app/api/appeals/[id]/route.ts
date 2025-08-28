import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query, withTransaction } from '@/lib/db';
import { createNotification } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMS } from '@/lib/httpSmsService';

// Common error handler
function handleError(error: any, operation: string) {
  console.error(`Error ${operation}:`, error);
  return NextResponse.json({
    error: `Failed to ${operation}`,
    details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
}

// Common validation
function validateAppealId(id: string) {
  const appealId = parseInt(id);
  if (isNaN(appealId)) {
    throw new Error('Invalid appeal ID');
  }
  return appealId;
}

// Common authentication check
async function verifyAuth(request: NextRequest) {
  const user = await verifySecureAuth(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Status configuration
const STATUS_CONFIG = {
  under_review: {
    subject: '👀 Your Appeal is Under Review',
    color: '#3B82F6',
    icon: '👀',
    title: 'Appeal Under Review',
    message: 'Our team is currently reviewing your appeal. We will notify you once a decision has been made.',
    bgColor: '#eff6ff'
  },
  approved: {
    subject: '🎉 Appeal Approved - Welcome Back!',
    color: '#10B981',
    icon: '🎉',
    title: 'Appeal Approved',
    message: 'Great news! Your appeal has been approved and your account restrictions have been lifted. You can now access all features of RainbowPaws.',
    bgColor: '#ecfdf5'
  },
  rejected: {
    subject: '❌ Appeal Decision - Not Approved',
    color: '#EF4444',
    icon: '❌',
    title: 'Appeal Not Approved',
    message: 'After careful review, we were unable to approve your appeal at this time.',
    bgColor: '#fef2f2'
  }
};

// Email template generator
function createStatusEmail(status: string, userName: string, adminResponse?: string) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!config) throw new Error('Invalid status');

  const nextSteps = status === 'approved' ? `
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
      <li>Review our terms of service and community guidelines</li>
      <li>You may submit a new appeal after addressing the concerns</li>
    </ul>
  ` : `
    <p>We appreciate your patience while we review your appeal. You will receive another notification once a decision has been made.</p>
  `;

  return {
    subject: config.subject,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appeal Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${config.color}, ${config.color}dd); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
          .status-box { background-color: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .response-box { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background-color: ${config.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.icon} ${config.title}</h1>
          </div>
          <div class="content">
            <p>Dear ${userName},</p>
            <div class="status-box">
              <h3 style="margin-top: 0; color: ${config.color};">${config.title}</h3>
              <p>${config.message}</p>
            </div>
            ${adminResponse ? `
            <div class="response-box">
              <h4>Admin Response:</h4>
              <p>${adminResponse}</p>
            </div>
            ` : ''}
            ${nextSteps}
          </div>
          <div class="footer">
            <p>This is an automated notification from RainbowPaws</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * GET - Fetch a specific appeal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    const appealId = validateAppealId(params.id);

    const appeals = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.sms_notifications,
             admin.first_name as admin_first_name, admin.last_name as admin_last_name
      FROM user_appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN users admin ON a.admin_id = admin.user_id
      WHERE a.appeal_id = ?
    `, [appealId]) as any[];

    if (!appeals?.length) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    const appeal = appeals[0];
    if (user.accountType !== 'admin' && appeal.user_id !== parseInt(user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    appeal.evidence_files = appeal.evidence_files ? JSON.parse(appeal.evidence_files) : [];
    return NextResponse.json({ success: true, appeal });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Invalid appeal ID') {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }
    return handleError(error, 'fetching appeal');
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
    const user = await verifyAuth(request);
    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const appealId = validateAppealId(params.id);
    const { status, admin_response } = await request.json();

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get appeal details
    const appeals = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.sms_notifications
      FROM user_appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE a.appeal_id = ?
    `, [appealId]) as any[];

    if (!appeals?.length) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    const appeal = appeals[0];
    const previousStatus = appeal.status;

    // Update appeal status
    await withTransaction(async (transaction) => {
      await transaction.query(`
        UPDATE user_appeals 
        SET status = ?, admin_response = ?, admin_id = ?, reviewed_at = NOW(), 
            resolved_at = CASE WHEN ? IN ('approved', 'rejected') THEN NOW() ELSE NULL END
        WHERE appeal_id = ?
      `, [status, admin_response, user.userId, status, appealId]);

      // Record in appeal history
      await transaction.query(`
        INSERT INTO appeal_history (appeal_id, previous_status, new_status, admin_id, admin_response)
        VALUES (?, ?, ?, ?, ?)
      `, [appealId, previousStatus, status, user.userId, admin_response]);
    });

    // Send notifications
    const emailTemplate = createStatusEmail(status, `${appeal.first_name} ${appeal.last_name}`, admin_response);
    
    try {
      await sendEmail({
        to: appeal.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }

    // Send SMS if enabled
    if (appeal.sms_notifications && appeal.phone) {
      try {
        const smsMessage = status === 'approved' 
          ? `🎉 Your appeal has been approved! You can now log in to your RainbowPaws account.`
          : status === 'rejected'
          ? `❌ Your appeal has been reviewed and unfortunately was not approved. ${admin_response ? 'Reason: ' + admin_response.substring(0, 80) + '...' : 'Please review the response and consider submitting a new appeal.'}`
          : `👀 Your appeal is now under review. We will notify you once a decision has been made.`;

        const smsResult = await sendSMS({ to: appeal.phone, message: smsMessage });
        
        if (smsResult.success) {
          console.log(`✅ Appeal SMS sent successfully to ${appeal.phone} for appeal #${appeal.id}`);
        } else {
          console.error(`❌ Appeal SMS failed for appeal #${appeal.id}:`, smsResult.error);
        }
      } catch (error) {
        console.error('Failed to send SMS notification:', error);
      }
    }

    // Create in-app notification
    try {
      await createNotification({
        userId: appeal.user_id,
        title: `Appeal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: status === 'approved' 
          ? 'Your appeal has been approved! Welcome back to RainbowPaws.'
          : status === 'rejected'
          ? 'Your appeal has been reviewed. Please check your email for details.'
          : 'Your appeal is now under review. We will notify you of the decision.',
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
        link: '/appeals'
      });
    } catch (error) {
      console.error('Failed to create in-app notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Appeal status updated successfully'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Invalid appeal ID') {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }
    return handleError(error, 'updating appeal');
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
    const user = await verifyAuth(request);
    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const appealId = validateAppealId(params.id);

    // Check if appeal exists
    const existingAppeals = await query(`
      SELECT appeal_id FROM user_appeals WHERE appeal_id = ?
    `, [appealId]) as any[];

    if (!existingAppeals?.length) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    // Delete the appeal
    await query(`DELETE FROM user_appeals WHERE appeal_id = ?`, [appealId]);

    return NextResponse.json({
      success: true,
      message: 'Appeal deleted successfully'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Invalid appeal ID') {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }
    return handleError(error, 'deleting appeal');
  }
}
