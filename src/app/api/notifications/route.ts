import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { RateLimiter, createRateLimitHeaders, createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';
import { createNotification } from '@/services/NotificationService';

// GET endpoint to fetch notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication for consistency
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Allow all authenticated users to access notifications
    if (!user.userId) {
      return NextResponse.json(
        createStandardErrorResponse('Invalid user', 401, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Implement proper server-side rate limiting
    const rateLimitResult = await RateLimiter.checkNotificationFetchLimit(user.userId);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createStandardErrorResponse(
          'Rate limit exceeded for notification fetching',
          429,
          {
            notifications: [],
            unreadCount: 0
          }
        ),
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Cap at 50
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Ensure the notifications table exists
    await ensureNotificationsTable();

    try {
      // Build the query based on parameters
      let notificationsQuery = `
        SELECT notification_id as id, title, message, type, is_read, link, created_at
        FROM notifications
        WHERE user_id = ?
      `;

      const queryParams: any[] = [user.userId];

      if (unreadOnly) {
        notificationsQuery += ' AND is_read = 0';
      }

      notificationsQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      // Execute the query
      const notifications = await query(notificationsQuery, queryParams) as any[];

      // Get the total count of notifications for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notifications
        WHERE user_id = ?
        ${unreadOnly ? 'AND is_read = 0' : ''}
      `;

      const countResult = await query(countQuery, [user.userId]) as any[];
      const total = countResult[0].total;

      // Get the count of unread notifications
      const unreadCountResult = await query(
        'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
        [user.userId]
      ) as any[];
      const unreadCount = unreadCountResult[0].unread;

      return NextResponse.json(
        createStandardSuccessResponse({
          notifications,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          },
          unreadCount
        }),
        {
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'private, max-age=30', // 30 second cache for notifications
            'Pragma': 'no-cache'
          }
        }
      );
    } catch (dbError) {
      // Return proper error instead of empty results
      console.error('Database error in notifications fetch:', dbError);
      return NextResponse.json(
        createStandardErrorResponse('Database query failed', 500, {
          notifications: [],
          pagination: { total: 0, limit, offset, hasMore: false },
          unreadCount: 0,
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }),
        {
          status: 500,
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }
  } catch (error) {
    // Always return a standardized error response
    console.error('Unexpected error in notifications fetch:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to fetch notifications', 500, {
        notifications: [],
        unreadCount: 0,
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}

// POST endpoint to create a new notification
export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token for rate limiting (optional for POST)
    const user = await verifySecureAuth(request);
    let userId: string | null = null;

    if (user) {
      userId = user.userId;
    }

    const body = await request.json();
    const { userId: targetUserId, title, message, type = 'info', link = null, shouldSendEmail = false, emailSubject } = body;

    // Validate required fields
    if (!targetUserId || !title || !message) {
      return NextResponse.json(
        createStandardErrorResponse('User ID, title, and message are required', 400),
        { status: 400 }
      );
    }

    // Apply rate limiting if we have a user context
    if (userId) {
      const rateLimitResult = await RateLimiter.checkNotificationCreateLimit(userId);
      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          createStandardErrorResponse(rateLimitResult.error || 'Rate limit exceeded', 429),
          {
            status: 429,
            headers: rateLimitHeaders
          }
        );
      }
    }

    // Use the notification service which supports email
    const notificationResult = await createNotification({
      userId: targetUserId,
      title,
      message,
      type,
      link,
      shouldSendEmail,
      emailSubject
    });

    if (!notificationResult.success) {
      return NextResponse.json(
        createStandardErrorResponse(notificationResult.error || 'Failed to create notification', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createStandardSuccessResponse({
        notificationId: notificationResult.notificationId
      }, 'Notification created successfully')
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to create notification', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}

// Helper function to ensure the notifications table exists
async function ensureNotificationsTable() {
  try {

    // First check if we can connect to the database
    try {
      await query('SELECT 1 as test');
    } catch {
      // Return without throwing to allow the API to continue with empty results
      // rather than crashing with a 500 error
      return false;
    }

    // Check if the table exists
    const tableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    ) as any[];

    if (!tableExists || !tableExists[0] || tableExists[0].count === 0) {

      // Check if users table exists first (since we have a foreign key)
      const usersTableExists = await query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'users'`
      ) as any[];

      if (!usersTableExists || !usersTableExists[0] || usersTableExists[0].count === 0) {
        return false;
      }

      // Create the table if it doesn't exist
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            link VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_is_read (is_read),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch {
        return false;
      }
    } else {
    }

    return true;
  } catch {
    // Return false instead of throwing to allow the API to continue
    return false;
  }
}

