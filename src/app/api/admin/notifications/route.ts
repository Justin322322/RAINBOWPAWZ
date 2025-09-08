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

    // Get notifications from the unified notifications table
    const notifications_unified = await query(`
      SELECT 
        id,
        user_id,
        type,
        category,
        title,
        message,
        data,
        status,
        priority,
        created_at,
        read_at
      FROM notifications_unified
      WHERE user_id = ? AND category = 'admin'
      ${unreadOnly ? 'AND status != "read"' : ''}
      ORDER BY created_at DESC
      LIMIT 50
    `, [user.userId]);

      // Get pending applications count
      let pendingCount = 0;
      try {
        const pendingApplications = await query(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'pending'
        `) as any[];

        pendingCount = pendingApplications[0]?.count || 0;
      } catch (error) {
        console.log('Could not fetch pending applications count:', error);
      }

      // Calculate unread count from the notifications
      const unreadCount = notifications_unified.filter((notification: any) => notification.status !== 'read').length;

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

