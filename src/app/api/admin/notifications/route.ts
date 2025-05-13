import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Get admin notifications
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    let isAuthenticated = false;
    let accountType = '';

    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Get notifications from the database
    // First check if the admin_notifications table exists
    const tableCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'admin_notifications'
    `, [process.env.DB_NAME || 'rainbow_paws']);
    
    const tableExists = tableCheck && Array.isArray(tableCheck) && 
                        tableCheck[0] && tableCheck[0].count > 0;
    
    if (!tableExists) {
      // If the table doesn't exist, create it
      await query(`
        CREATE TABLE admin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          entity_type VARCHAR(50),
          entity_id INT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Created admin_notifications table');
    }

    // Get unread notifications
    const notifications = await query(`
      SELECT * FROM admin_notifications
      WHERE is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Get pending applications count
    const pendingApplications = await query(`
      SELECT COUNT(*) as count
      FROM business_profiles
      WHERE verification_status IS NULL OR verification_status = 'pending'
    `);

    const pendingCount = pendingApplications && pendingApplications[0] ? pendingApplications[0].count : 0;

    // If there are pending applications but no notification for them, create one
    if (pendingCount > 0) {
      const applicationNotification = await query(`
        SELECT * FROM admin_notifications
        WHERE type = 'pending_application' AND is_read = FALSE
        LIMIT 1
      `);

      if (!applicationNotification || applicationNotification.length === 0) {
        // Create a notification for pending applications
        await query(`
          INSERT INTO admin_notifications (type, title, message, entity_type)
          VALUES (?, ?, ?, ?)
        `, [
          'pending_application',
          'Pending Applications',
          `You have ${pendingCount} pending business application${pendingCount > 1 ? 's' : ''} to review.`,
          'business_profile'
        ]);

        // Fetch the newly created notification
        const newNotifications = await query(`
          SELECT * FROM admin_notifications
          WHERE is_read = FALSE
          ORDER BY created_at DESC
          LIMIT 50
        `);

        return NextResponse.json({
          success: true,
          notifications: newNotifications,
          pendingApplications: pendingCount
        });
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
      pendingApplications: pendingCount
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    let isAuthenticated = false;
    let accountType = '';

    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Get notification IDs from request body
    const body = await request.json();
    const { notificationIds, markAll, type } = body;

    if (markAll) {
      // Mark all notifications as read
      if (type) {
        // Mark all notifications of a specific type as read
        await query(`
          UPDATE admin_notifications
          SET is_read = TRUE
          WHERE type = ?
        `, [type]);
      } else {
        // Mark all notifications as read
        await query(`
          UPDATE admin_notifications
          SET is_read = TRUE
        `);
      }
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await query(`
        UPDATE admin_notifications
        SET is_read = TRUE
        WHERE id IN (?)
      `, [notificationIds]);
    } else {
      return NextResponse.json({
        error: 'Invalid request',
        details: 'Please provide notificationIds or set markAll to true',
        success: false
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({
      error: 'Failed to mark notifications as read',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
