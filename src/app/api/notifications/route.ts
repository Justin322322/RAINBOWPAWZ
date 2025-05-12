import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

// GET endpoint to fetch notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    console.log('Fetching notifications for user:', userId);

    // First, ensure the notifications table exists
    await ensureNotificationsTable();

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
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
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
    // Check if the table exists
    const tableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    ) as any[];

    if (tableExists[0].count === 0) {
      console.log('Notifications table does not exist. Creating now...');
      // Create the table if it doesn't exist
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
      console.log('Notifications table created');
    }
  } catch (error) {
    console.error('Error ensuring notifications table:', error);
    throw error;
  }
}
