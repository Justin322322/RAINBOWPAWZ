import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

// Get admin notifications_unified
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication for consistency
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false,
        notifications_unified: []
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false,
        notifications_unified: []
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

    // Get notifications_unified from the database
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
            status TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

      }

      // Get notifications_unified based on unread_only parameter
      const notifications_unified = await query(`
        SELECT * FROM admin_notifications
        ${unreadOnly ? 'WHERE status = 0' : ''}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      // Check which table exists: service_providers or service_providers
      const tableCheckResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name IN ('service_providers', 'service_providers')
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
          FROM service_providers
          WHERE verification_status IS NULL OR verification_status = 'pending'
        `);

        pendingCount = pendingApplications && pendingApplications[0] ? pendingApplications[0].count : 0;
      }

      // If there are pending applications but no notification for them, create one
      if (pendingCount > 0) {
        const applicationNotification = await query(`
          SELECT * FROM admin_notifications
          WHERE type = 'pending_application' AND status = 0
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
            useServiceProvidersTable ? 'service_provider' : 'service_provider',
            '/admin/applications'
          ]);

          // Fetch notifications_unified based on unread_only parameter
          const newNotifications = await query(`
            SELECT * FROM admin_notifications
            ${unreadOnly ? 'WHERE status = 0' : ''}
            ORDER BY created_at DESC
            LIMIT 50
          `);

          // Calculate unread count from the new notifications_unified
          const unreadCount = newNotifications.filter((notification: any) => notification.status === 0).length;

          return NextResponse.json({
            success: true,
            notifications_unified: newNotifications,
            pendingApplications: pendingCount,
            unread_count: unreadCount
          }, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
        }
      }

      // Calculate unread count from the notifications_unified
      const unreadCount = notifications_unified.filter((notification: any) => notification.status === 0).length;

      return NextResponse.json({
        success: true,
        notifications_unified,
        pendingApplications: pendingCount,
        unread_count: unreadCount
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
        notifications_unified: [],
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
      error: 'Failed to fetch notifications_unified',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      notifications_unified: [],
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

// Mark notifications_unified as read (PATCH method for consistency with user API)
export async function PATCH(request: NextRequest) {
  try {
    // Use secure authentication for consistency
    const user = await verifySecureAuth(request);
    if (!user) {
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

    if (user.accountType !== 'admin') {
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

    // Get notification data from request body
    const body = await request.json();
    const { notificationId, markAll } = body;

    try {
      if (markAll) {
        // Mark all notifications_unified as read
        await query(`
          UPDATE admin_notifications
          SET status = 1
        `);
      } else if (notificationId) {
        // Mark specific notification as read
        await query(`
          UPDATE admin_notifications
          SET status = 1
          WHERE id = ?
        `, [notificationId]);
      } else {
        return NextResponse.json({
          error: 'Invalid request',
          details: 'Please provide notificationId or set markAll to true',
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
        message: 'Notification marked as read'
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

    } catch (dbError) {
      console.error('Database error marking admin notification as read:', dbError);
      return NextResponse.json({
        error: 'Database error',
        details: 'Failed to mark notification as read',
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
    console.error('Error marking admin notification as read:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: 'Failed to mark notification as read',
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

// Mark notifications_unified as read (POST method for bulk operations)
export async function POST(request: NextRequest) {
  try {
    // Use secure authentication for consistency
    const user = await verifySecureAuth(request);
    if (!user) {
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

    if (user.accountType !== 'admin') {
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
        // Mark all notifications_unified as read
        if (type) {
          // Mark all notifications_unified of a specific type as read
          await query(`
            UPDATE admin_notifications
            SET status = 1
            WHERE type = ?
          `, [type]);
        } else {
          // Mark all notifications_unified as read
          await query(`
            UPDATE admin_notifications
            SET status = 1
          `);
        }
      } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Mark specific notifications_unified as read
        // Use a safer approach with multiple parameters
        const placeholders = notificationIds.map(() => '?').join(',');
        await query(`
          UPDATE admin_notifications
          SET status = 1
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
        error: 'Database error while marking notifications_unified as read',
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
      error: 'Failed to mark notifications_unified as read',
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

