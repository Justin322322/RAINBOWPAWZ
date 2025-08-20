import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query, withTransaction } from '@/lib/db';
import { createNotificationFast } from '@/services/NotificationService';
import { sendEmail } from '@/services/EmailService';
import { sendSMS } from '@/lib/smsService';

// Create appeals table if it doesn't exist
async function ensureAppealsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_appeals (
        appeal_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_type ENUM('personal', 'business') NOT NULL DEFAULT 'personal',
        business_id INT NULL,
        appeal_type ENUM('restriction', 'suspension', 'ban') NOT NULL DEFAULT 'restriction',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        evidence_files JSON NULL,
        status ENUM('pending', 'under_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_response TEXT NULL,
        admin_id INT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_user_appeals (user_id),
        INDEX idx_status (status),
        INDEX idx_submitted_at (submitted_at)
      )
    `);

    // Create appeal history table for tracking status changes
    await query(`
      CREATE TABLE IF NOT EXISTS appeal_history (
        history_id INT AUTO_INCREMENT PRIMARY KEY,
        appeal_id INT NOT NULL,
        previous_status ENUM('pending', 'under_review', 'approved', 'rejected') NULL,
        new_status ENUM('pending', 'under_review', 'approved', 'rejected') NOT NULL,
        admin_id INT NULL,
        admin_response TEXT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT NULL,
        FOREIGN KEY (appeal_id) REFERENCES user_appeals(appeal_id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_appeal_history (appeal_id),
        INDEX idx_changed_at (changed_at)
      )
    `);
  } catch (error) {
    console.error('Error creating appeals tables:', error);
    throw error;
  }
}

/**
 * POST - Submit a new appeal
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      subject, 
      message, 
      appeal_type = 'restriction',
      evidence_files = [],
      business_id = null 
    } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json({
        error: 'Subject and message are required'
      }, { status: 400 });
    }

    if (subject.length > 255) {
      return NextResponse.json({
        error: 'Subject must be 255 characters or less'
      }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({
        error: 'Message must be 5000 characters or less'
      }, { status: 400 });
    }

    // Ensure appeals table exists
    await ensureAppealsTable();

    // Check if user already has a pending appeal
    const existingAppeal = await query(`
      SELECT appeal_id FROM user_appeals
      WHERE user_id = ? AND status IN ('pending', 'under_review')
      ORDER BY submitted_at DESC
      LIMIT 1
    `, [parseInt(user.userId)]) as any[];

    if (existingAppeal && existingAppeal.length > 0) {
      return NextResponse.json({
        error: 'You already have a pending appeal. Please wait for it to be reviewed.'
      }, { status: 400 });
    }

    // Determine user type and business ID
    const user_type = user.accountType === 'business' ? 'business' : 'personal';
    let actual_business_id = business_id;

    // For business users, get their business ID if not provided
    if (user_type === 'business' && !actual_business_id) {
      const businessResult = await query(`
        SELECT provider_id FROM service_providers WHERE user_id = ?
      `, [parseInt(user.userId)]) as any[];

      if (businessResult && businessResult.length > 0) {
        actual_business_id = businessResult[0].provider_id;
      }
    }

    // Create the appeal
    const result = await withTransaction(async (transaction) => {
      const insertResult = await transaction.query(`
        INSERT INTO user_appeals (
          user_id, user_type, business_id, appeal_type, subject, message, evidence_files
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        parseInt(user.userId),
        user_type,
        actual_business_id,
        appeal_type,
        subject,
        message,
        JSON.stringify(evidence_files)
      ]) as any;

      return insertResult.insertId;
    });

    // Notify all admins about the new appeal (non-blocking)
    notifyAdminsOfNewAppeal(result, user, subject).catch(error => {
      console.error('Failed to notify admins of new appeal:', error);
    });

    // Also create admin panel notification
    try {
      console.log('Creating admin panel notification for appeal:', result);

      // Fetch user's full details from database to get name
      const userDetails = await query(
        'SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1',
        [parseInt(user.userId)]
      ) as any[];

      const firstName = userDetails?.[0]?.first_name || 'User';
      const lastName = userDetails?.[0]?.last_name || user.userId;

      const { createAdminNotification } = await import('@/services/NotificationService');
      const notificationResult = await createAdminNotification({
        type: 'new_appeal',
        title: 'New Appeal Submitted',
        message: `${firstName} ${lastName} has submitted an appeal: "${subject}"`,
        entityType: user_type === 'business' ? 'business' : 'user', // This determines which admin page to link to
        entityId: result,
        shouldSendEmail: false // Already sending emails above
      });
      console.log('Admin panel notification result:', notificationResult);
    } catch (adminNotificationError) {
      console.error('Failed to create admin panel notification:', adminNotificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Appeal submitted successfully',
      appeal_id: result
    });

  } catch (error) {
    console.error('Error submitting appeal:', error);
    return NextResponse.json({
      error: 'Failed to submit appeal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Fetch appeals (admin only or user's own appeals)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Ensure appeals table exists
    await ensureAppealsTable();

    let whereClause = '';
    let queryParams: any[] = [];

    if (user.accountType === 'admin') {
      // Admins can see all appeals
      if (status) {
        whereClause = 'WHERE a.status = ?';
        queryParams.push(status);
      }
      if (user_id) {
        whereClause += whereClause ? ' AND a.user_id = ?' : 'WHERE a.user_id = ?';
        queryParams.push(user_id);
      }
    } else {
      // Regular users can only see their own appeals
      whereClause = 'WHERE a.user_id = ?';
      queryParams.push(parseInt(user.userId));

      if (status) {
        whereClause += ' AND a.status = ?';
        queryParams.push(status);
      }
    }

    // Add pagination
    queryParams.push(limit, offset);

    const appeals = await query(`
      SELECT 
        a.*,
        u.first_name,
        u.last_name,
        u.email,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name
      FROM user_appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN users admin ON a.admin_id = admin.user_id
      ${whereClause}
      ORDER BY a.submitted_at DESC
      LIMIT ? OFFSET ?
    `, queryParams) as any[];

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM user_appeals a
      ${whereClause.replace(/LIMIT.*/, '')}
    `, queryParams.slice(0, -2)) as any[];

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      appeals: appeals.map(appeal => ({
        ...appeal,
        evidence_files: appeal.evidence_files ? JSON.parse(appeal.evidence_files) : []
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching appeals:', error);
    return NextResponse.json({
      error: 'Failed to fetch appeals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to notify admins of new appeals
async function notifyAdminsOfNewAppeal(appealId: number, user: any, subject: string) {
  try {
    console.log(`Starting admin notification process for appeal ${appealId}`);

    // Get all admin users
    const admins = await query(`
      SELECT user_id, email, first_name, last_name, phone
      FROM users
      WHERE role = 'admin'
    `) as any[];

    console.log(`Found ${admins.length} admin users to notify`);

    if (admins.length === 0) {
      console.warn('No admin users found to notify about new appeal');
      return;
    }

    const emailTemplate = createAppealNotificationEmail({
      adminName: 'Admin',
      userName: `${user.first_name} ${user.last_name}`,
      userEmail: user.email,
      appealSubject: subject,
      appealId: appealId,
      userType: user.accountType === 'business' ? 'Business' : 'Personal'
    });

    // Process notifications for each admin individually to prevent one failure from affecting others
    const notificationResults = await Promise.allSettled(
      admins.map(async (admin) => {
        try {
          console.log(`Notifying admin ${admin.user_id} (${admin.email}) about appeal ${appealId}`);

          // Create in-app notification (using fast method)
          const notificationResult = await createNotificationFast({
            userId: admin.user_id,
            title: 'New Appeal Submitted',
            message: `${user.first_name} ${user.last_name} has submitted an appeal: "${subject}"`,
            type: 'warning',
            link: `/admin/users/${user.accountType === 'business' ? 'cremation' : 'furparents'}?appealId=${appealId}&userId=${user.userId}`
          });

          if (!notificationResult.success) {
            console.error(`Failed to create in-app notification for admin ${admin.user_id}:`, notificationResult.error);
          }

          // Send custom email notification
          try {
            await sendEmail({
              to: admin.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html
            });
            console.log(`Email sent successfully to admin ${admin.email}`);
          } catch (emailError) {
            console.error(`Failed to send email to admin ${admin.email}:`, emailError);
          }

          // Send SMS notification
          if (admin.phone) {
            try {
              await sendSMS({
                to: admin.phone,
                message: `🚨 New appeal from ${user.first_name} ${user.last_name}. Subject: "${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}". Review in admin panel.`
              });
              console.log(`SMS sent successfully to admin ${admin.phone}`);
            } catch (smsError) {
              console.error(`Failed to send SMS to admin ${admin.phone}:`, smsError);
            }
          }

          return { success: true, adminId: admin.user_id };
        } catch (adminError) {
          console.error(`Failed to notify admin ${admin.user_id}:`, adminError);
          return { success: false, adminId: admin.user_id, error: adminError };
        }
      })
    );

    // Log results
    const successful = notificationResults.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = notificationResults.length - successful;

    console.log(`Admin notification results for appeal ${appealId}: ${successful} successful, ${failed} failed`);

    if (failed > 0) {
      console.warn(`Some admin notifications failed for appeal ${appealId}`,
        notificationResults.filter(result => result.status === 'rejected' || !result.value.success)
      );
    }

  } catch (error) {
    console.error('Error in notifyAdminsOfNewAppeal function:', error);
    // Don't throw error as this is not critical for appeal submission
  }
}

// Email template for new appeal notifications
function createAppealNotificationEmail({
  adminName: _,
  userName,
  userEmail,
  appealSubject,
  appealId,
  userType
}: {
  adminName: string;
  userName: string;
  userEmail: string;
  appealSubject: string;
  appealId: number;
  userType: string;
}) {
  const subject = `🚨 New Appeal Submitted - Action Required`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Appeal Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
        .alert-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .user-info { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 New Appeal Submitted</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>⚠️ Immediate Action Required</strong><br>
            A user has submitted an appeal that requires admin review.
          </div>

          <h2>Appeal Details</h2>
          <div class="user-info">
            <p><strong>User:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>User Type:</strong> ${userType}</p>
            <p><strong>Appeal Subject:</strong> ${appealSubject}</p>
            <p><strong>Appeal ID:</strong> #${appealId}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p>Please review this appeal as soon as possible. Users are waiting for a response to restore their account access.</p>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/users/${userType.toLowerCase() === 'business' ? 'cremation' : 'furparents'}" class="button">
            Review Appeal in Admin Panel
          </a>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the appeal details and user's explanation</li>
            <li>Check the original restriction reason</li>
            <li>Approve or reject the appeal with appropriate response</li>
            <li>User will be automatically notified of your decision</li>
          </ul>
        </div>
        <div class="footer">
          <p>This is an automated notification from RainbowPaws Admin System</p>
          <p>Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
