import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query, withTransaction } from '@/lib/db';
import { createNotificationFast } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMSAsync } from '@/lib/httpSmsService';

// Common error handler
function handleError(error: any, operation: string) {
  console.error(`Error ${operation}:`, error);
  
  let errorMessage = `Failed to ${operation}`;
  let statusCode = 500;
  
  if (error instanceof Error) {
    if (error.message.includes('ER_NO_SUCH_TABLE')) {
      errorMessage = 'Appeals system is not properly configured. Please contact support.';
      statusCode = 503;
    } else if (error.message.includes('ER_ACCESS_DENIED')) {
      errorMessage = 'Database access denied. Please contact support.';
      statusCode = 503;
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      errorMessage = 'Database connection failed. Please try again later.';
      statusCode = 503;
    } else {
      errorMessage = error.message;
    }
  }
  
  return NextResponse.json({
    error: errorMessage,
    details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: statusCode });
}

// Check if appeals table exists
async function checkTableExists() {
  const tableExists = await query("SHOW TABLES LIKE 'appeals'");
  return (tableExists as any[]).length > 0;
}

// Create appeals table if it doesn't exist
async function ensureAppealsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS appeals (
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
        INDEX idx_user_appeals (user_id),
        INDEX idx_status (status),
        INDEX idx_submitted_at (submitted_at)
      )
    `);

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
    const user = await verifySecureAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('🔍 [Appeals POST] User:', { userId: user.userId, accountType: user.accountType, userIdType: typeof user.userId });

    const { subject, message, appeal_type = 'restriction', evidence_files = [], business_id = null } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    if (subject.length > 255 || message.length > 5000) {
      return NextResponse.json({ error: 'Subject must be ≤255 chars, message must be ≤5000 chars' }, { status: 400 });
    }

    try {
      await ensureAppealsTable();
    } catch (error) {
      console.error('Failed to ensure appeals table exists:', error);
    }

    const tableExists = await checkTableExists();
    console.log('🔍 [Appeals POST] Table exists:', tableExists);
    
    if (!tableExists) {
      console.log('🔍 [Appeals POST] Table does not exist, returning error');
      return NextResponse.json({
        error: 'Appeals system is not properly configured. Please contact support.',
        details: 'Appeals table does not exist'
      }, { status: 503 });
    }

    // Check for existing pending appeal - handle both string and integer user IDs
    const parsedUserId = parseInt(user.userId);
    const originalUserId = user.userId;
    console.log('🔍 [Appeals POST] Checking for existing appeals:', { 
      original_user_id: originalUserId, 
      parsed_user_id: parsedUserId, 
      isNaN: isNaN(parsedUserId),
      user_id_type: typeof originalUserId 
    });
    
    // Try both string and integer user ID formats to ensure we catch all cases
    const existingAppeal = await query(`
      SELECT appeal_id FROM appeals
      WHERE (user_id = ? OR user_id = ?) AND status IN ('pending', 'under_review')
      ORDER BY submitted_at DESC LIMIT 1
    `, [parsedUserId, originalUserId]) as any[];
    console.log('🔍 [Appeals POST] Existing appeals found:', existingAppeal.length);

    if (existingAppeal?.length > 0) {
      return NextResponse.json({
        error: 'You already have a pending appeal. Please wait for it to be reviewed.'
      }, { status: 400 });
    }

    // Determine user type and business ID
    const user_type = user.accountType === 'business' ? 'business' : 'personal';
    let actual_business_id = business_id;

    if (user_type === 'business' && !actual_business_id) {
      // Try both string and integer user ID formats for business lookup
      const businessResult = await query(`
        SELECT provider_id FROM service_providers WHERE (user_id = ? OR user_id = ?)
      `, [parsedUserId, originalUserId]) as any[];
      actual_business_id = businessResult?.[0]?.provider_id;
    }

    // Create appeal
    console.log('🔍 [Appeals POST] Creating appeal:', { user_id: parsedUserId, user_type, actual_business_id, appeal_type, subject, isNaN: isNaN(parsedUserId) });
    const result = await withTransaction(async (transaction) => {
      const insertResult = await transaction.query(`
        INSERT INTO appeals (user_id, user_type, business_id, appeal_type, subject, message, evidence_files)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [parsedUserId, user_type, actual_business_id, appeal_type, subject, message, JSON.stringify(evidence_files)]) as any;
      console.log('🔍 [Appeals POST] Appeal created with ID:', insertResult.insertId);
      return insertResult.insertId;
    });

    // Notify admins (non-blocking)
    notifyAdminsOfNewAppeal(result, user, subject).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Appeal submitted successfully',
      appeal_id: result
    });

  } catch (error) {
    return handleError(error, 'submitting appeal');
  }
}

/**
 * GET - Fetch appeals (admin only or user's own appeals)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('🔍 [Appeals API] User:', { userId: user.userId, accountType: user.accountType, userIdType: typeof user.userId });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const user_id = searchParams.get('user_id');
    const business_id = searchParams.get('business_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('🔍 [Appeals API] Query params:', { status, user_id, business_id, limit, offset });

    try {
      await ensureAppealsTable();
    } catch (error) {
      console.error('Failed to ensure appeals table exists:', error);
    }

    const tableExists = await checkTableExists();
    console.log('🔍 [Appeals API] Table exists:', tableExists);
    
    if (!tableExists) {
      console.log('🔍 [Appeals API] Table does not exist, returning empty array');
      return NextResponse.json({
        success: true,
        appeals: [],
        pagination: { total: 0, limit, offset, hasMore: false }
      });
    }

    // Debug: Check if there are any appeals in the database at all
    try {
      const allAppealsCheck = await query(`SELECT COUNT(*) as total FROM appeals`) as any[];
      console.log('🔍 [Appeals API] Total appeals in database:', allAppealsCheck[0]?.total || 0);
      
      const parsedUserId = parseInt(user.userId);
      const originalUserId = user.userId;
      console.log('🔍 [Appeals API] User ID debug:', { 
        original_user_id: originalUserId, 
        parsed_user_id: parsedUserId, 
        isNaN: isNaN(parsedUserId),
        user_id_type: typeof originalUserId 
      });
      
      // Check with both string and integer user ID formats
      const userAppealsCheck = await query(`SELECT COUNT(*) as total FROM appeals WHERE (user_id = ? OR user_id = ?)`, [parsedUserId, originalUserId]) as any[];
      console.log('🔍 [Appeals API] Appeals for this user:', userAppealsCheck[0]?.total || 0);
    } catch (error) {
      console.error('🔍 [Appeals API] Error checking appeals count:', error);
    }

    // Build query
    let whereClause = '';
    let queryParams: any[] = [];

    if (user.accountType === 'admin') {
      if (status) {
        whereClause = 'WHERE a.status = ?';
        queryParams.push(status);
      }
      if (user_id) {
        whereClause += whereClause ? ' AND a.user_id = ?' : 'WHERE a.user_id = ?';
        queryParams.push(user_id);
      }
      if (business_id) {
        whereClause += whereClause ? ' AND a.business_id = ?' : 'WHERE a.business_id = ?';
        queryParams.push(business_id);
      }
    } else {
      const parsedUserId = parseInt(user.userId);
      const originalUserId = user.userId;
      console.log('🔍 [Appeals API] Parsed user ID:', { original: originalUserId, parsed: parsedUserId, isNaN: isNaN(parsedUserId) });
      whereClause = 'WHERE (a.user_id = ? OR a.user_id = ?)';
      queryParams.push(parsedUserId, originalUserId);
      if (status) {
        whereClause += ' AND a.status = ?';
        queryParams.push(status);
      }
    }

    // Fetch appeals
    console.log('🔍 [Appeals API] Query:', { whereClause, queryParams });
    const appeals = await query(`
      SELECT a.*, u.first_name, u.last_name, u.email,
             admin.first_name as admin_first_name, admin.last_name as admin_last_name
      FROM appeals a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN users admin ON a.admin_id = admin.user_id
      ${whereClause}
      ORDER BY a.submitted_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, queryParams) as any[];

    console.log('🔍 [Appeals API] Found appeals:', appeals.length);
    if (appeals.length > 0) {
      console.log('🔍 [Appeals API] First appeal sample:', {
        appeal_id: appeals[0].appeal_id,
        user_id: appeals[0].user_id,
        subject: appeals[0].subject,
        status: appeals[0].status,
        submitted_at: appeals[0].submitted_at
      });
    }

    // Get total count - use the same whereClause and queryParams as the main query
    const countResult = await query(`
      SELECT COUNT(*) as total FROM appeals a ${whereClause}
    `, queryParams) as any[];

    const total = countResult[0]?.total || 0;
    console.log('🔍 [Appeals API] Total count:', total);

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
    return handleError(error, 'fetching appeals');
  }
}

// Notify admins of new appeal
async function notifyAdminsOfNewAppeal(appealId: number, user: any, subject: string) {
  try {
    const admins = await query(`
      SELECT user_id, email, first_name, last_name, phone
      FROM users WHERE role = 'admin'
    `) as any[];

    if (admins.length === 0) return;

    const emailTemplate = createAppealNotificationEmail({
      adminName: 'Admin',
      userName: `${user.first_name} ${user.last_name}`,
      userEmail: user.email,
      appealSubject: subject,
      appealId: appealId,
      userType: user.accountType === 'business' ? 'Business' : 'Personal'
    });

    await Promise.allSettled(admins.map(async (admin) => {
      try {
        // In-app notification
        await createNotificationFast({
          userId: admin.user_id,
          title: 'New Appeal Submitted',
          message: `${user.first_name} ${user.last_name} has submitted an appeal: "${subject}"`,
          type: 'warning',
          link: `/admin/users/${user.accountType === 'business' ? 'cremation' : 'furparents'}?appealId=${appealId}&userId=${user.userId}`
        });

        // Email notification
        await sendEmail({
          to: admin.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });

        // SMS notification
        if (admin.phone) {
          try {
            sendSMSAsync({
              to: admin.phone,
              message: `🚨 New appeal from ${user.first_name} ${user.last_name}. Subject: "${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}". Review in admin panel.`
            });
          } catch (smsError) {
            console.error('Failed to send SMS notification to admin:', smsError);
          }
        }
      } catch (error) {
        console.error(`Failed to notify admin ${admin.user_id}:`, error);
      }
    }));

    // Create admin panel notification
    try {
      const userDetails = await query(
        'SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1',
        [parseInt(user.userId)]
      ) as any[];

      const { createAdminNotification } = await import('@/utils/adminNotificationService');
      await createAdminNotification({
        type: 'new_appeal',
        title: 'New Appeal Submitted',
        message: `${userDetails?.[0]?.first_name || 'User'} ${userDetails?.[0]?.last_name || user.userId} has submitted an appeal: "${subject}"`,
        entityType: user.accountType === 'business' ? 'business' : 'user',
        entityId: appealId,
        shouldSendEmail: false
      });
    } catch (error) {
      console.error('Failed to create admin panel notification:', error);
    }
  } catch (error) {
    console.error('Error in notifyAdminsOfNewAppeal:', error);
  }
}

// Email template for new appeal notifications_unified
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
