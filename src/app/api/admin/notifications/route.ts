import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Get admin notifications
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false,
        notifications: []
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Check if it's a JWT token or old format
    let userId = null;
    let accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false,
        notifications: []
      }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Get notifications from the database
    // First check if the admin_notifications table exists
    try {
      const tableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'admin_notifications'
      `);

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
            link VARCHAR(255),
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

      }

      // Get notifications based on unread_only parameter
      const notifications = await query(`
        SELECT * FROM admin_notifications
        ${unreadOnly ? 'WHERE is_read = 0' : ''}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      // Check which table exists: business_profiles or service_providers
      const tableCheckResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name IN ('business_profiles', 'service_providers')
      `) as any[];

      const tableNames = tableCheckResult.map((row: any) => row.table_name);
      const useServiceProvidersTable = tableNames.includes('service_providers');

      // Get pending applications count
      let pendingCount = 0;

      if (useServiceProvidersTable) {
        const pendingApplications = await query(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'pending'
        `);

        pendingCount = pendingApplications && pendingApplications[0] ? pendingApplications[0].count : 0;
      } else {
        const pendingApplications = await query(`
          SELECT COUNT(*) as count
          FROM business_profiles
          WHERE verification_status IS NULL OR verification_status = 'pending'
        `);

        pendingCount = pendingApplications && pendingApplications[0] ? pendingApplications[0].count : 0;
      }

      // If there are pending applications but no notification for them, create one
      if (pendingCount > 0) {
        const applicationNotification = await query(`
          SELECT * FROM admin_notifications
          WHERE type = 'pending_application' AND is_read = 0
          LIMIT 1
        `);

        if (!applicationNotification || applicationNotification.length === 0) {
          // Create a notification for pending applications
          await query(`
            INSERT INTO admin_notifications (type, title, message, entity_type, link)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'pending_application',
            'Pending Applications',
            `You have ${pendingCount} pending business application${pendingCount > 1 ? 's' : ''} to review.`,
            useServiceProvidersTable ? 'service_provider' : 'business_profile',
            '/admin/applications'
          ]);

          // Fetch notifications based on unread_only parameter
          const newNotifications = await query(`
            SELECT * FROM admin_notifications
            ${unreadOnly ? 'WHERE is_read = 0' : ''}
            ORDER BY created_at DESC
            LIMIT 50
          `);

          return NextResponse.json({
            success: true,
            notifications: newNotifications,
            pendingApplications: pendingCount
          }, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        notifications,
        pendingApplications: pendingCount
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (dbError) {
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        notifications: [],
        pendingApplications: 0
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      notifications: [],
      pendingApplications: 0
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}

// Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Check if it's a JWT token or old format
    let userId = null;
    let accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Get notification IDs from request body
    const body = await request.json();
    const { notificationIds, markAll, type } = body;

    try {
      if (markAll) {
        // Mark all notifications as read
        if (type) {
          // Mark all notifications of a specific type as read
          await query(`
            UPDATE admin_notifications
            SET is_read = 1
            WHERE type = ?
          `, [type]);
        } else {
          // Mark all notifications as read
          await query(`
            UPDATE admin_notifications
            SET is_read = 1
          `);
        }
      } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Mark specific notifications as read
        // Use a safer approach with multiple parameters
        const placeholders = notificationIds.map(() => '?').join(',');
        await query(`
          UPDATE admin_notifications
          SET is_read = 1
          WHERE id IN (${placeholders})
        `, [...notificationIds]);
      } else {
        return NextResponse.json({
          error: 'Invalid request',
          details: 'Please provide notificationIds or set markAll to true',
          success: false
        }, { 
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Notifications marked as read'
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error while marking notifications as read',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to mark notifications as read',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}
