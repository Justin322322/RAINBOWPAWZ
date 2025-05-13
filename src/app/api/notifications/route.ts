import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// GET endpoint to fetch notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      console.log('No auth token found in request');
      return NextResponse.json({
        error: 'Unauthorized',
        notifications: [],
        unreadCount: 0
      }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (!userId) {
      console.log('Invalid auth token format, no userId found');
      return NextResponse.json({
        error: 'Unauthorized',
        notifications: [],
        unreadCount: 0
      }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    console.log('Fetching notifications for user:', userId, 'unreadOnly:', unreadOnly);

    // First, ensure the notifications table exists
    const tableExists = await ensureNotificationsTable();

    // If table check failed, return empty results instead of an error
    if (!tableExists) {
      console.log('Notifications table check failed, returning empty results');
      return NextResponse.json({
        notifications: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        },
        unreadCount: 0
      });
    }

    try {
      // Build the query based on parameters
      let notificationsQuery = `
        SELECT id, title, message, type, is_read, link, created_at
        FROM notifications
        WHERE user_id = ?
      `;

      const queryParams = [userId];

      if (unreadOnly) {
        notificationsQuery += ' AND is_read = 0';
      }

      notificationsQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      // Execute the query
      const notifications = await query(notificationsQuery, queryParams) as any[];
      console.log(`Found ${notifications.length} notifications for user ${userId}`);

      // Get the total count of notifications for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notifications
        WHERE user_id = ?
        ${unreadOnly ? 'AND is_read = 0' : ''}
      `;

      const countResult = await query(countQuery, [userId]) as any[];
      const total = countResult[0].total;

      // Get the count of unread notifications
      const unreadCountResult = await query(
        'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      ) as any[];
      const unreadCount = unreadCountResult[0].unread;

      return NextResponse.json({
        notifications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        unreadCount
      });
    } catch (queryError) {
      console.error('Error executing notification queries:', queryError);
      // Return empty results instead of an error
      return NextResponse.json({
        notifications: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        },
        unreadCount: 0
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Always return a valid JSON response even on error
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
      notifications: [],
      unreadCount: 0
    }, { status: 500 });
  }
}

// POST endpoint to create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type = 'info', link = null } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json({
        error: 'User ID, title, and message are required'
      }, { status: 400 });
    }

    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    return NextResponse.json({
      success: true,
      notificationId: result.insertId,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({
      error: 'Failed to create notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to ensure the notifications table exists
async function ensureNotificationsTable() {
  try {
    console.log('Checking if notifications table exists...');

    // First check if we can connect to the database
    try {
      await query('SELECT 1 as test');
    } catch (connectionError) {
      console.error('Database connection error:', connectionError);
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
      console.log('Notifications table does not exist. Creating now...');

      // Check if users table exists first (since we have a foreign key)
      const usersTableExists = await query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'users'`
      ) as any[];

      if (!usersTableExists || !usersTableExists[0] || usersTableExists[0].count === 0) {
        console.error('Cannot create notifications table: users table does not exist');
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Notifications table created successfully');
      } catch (createError) {
        console.error('Error creating notifications table:', createError);
        return false;
      }
    } else {
      console.log('Notifications table already exists');
    }

    return true;
  } catch (error) {
    console.error('Error ensuring notifications table:', error);
    // Return false instead of throwing to allow the API to continue
    return false;
  }
}
