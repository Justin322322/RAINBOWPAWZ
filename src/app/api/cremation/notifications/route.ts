import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET - Fetch cremation provider notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check which column name to use (id or notification_id)
    let idColumn = 'id';
    try {
      const tableInfo = await query(`DESCRIBE notifications`) as any[];
      const hasNotificationId = tableInfo.some((col: any) => col.Field === 'notification_id');
      const hasId = tableInfo.some((col: any) => col.Field === 'id');
      
      if (hasNotificationId && !hasId) {
        idColumn = 'notification_id';
      }
    } catch (describeError) {
      console.warn('Could not describe notifications table:', describeError);
    }

    // Fetch notifications for this cremation provider
    const notifications = await query(`
      SELECT 
        ${idColumn} as id,
        title,
        message,
        type,
        link,
        is_read,
        created_at
      FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(user.userId), limit, offset]) as any[];

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM notifications 
      WHERE user_id = ?
    `, [parseInt(user.userId)]) as any[];

    const total = countResult[0]?.total || 0;

    // Get unread count
    const unreadResult = await query(`
      SELECT COUNT(*) as unread 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [parseInt(user.userId)]) as any[];

    const unreadCount = unreadResult[0]?.unread || 0;

    return NextResponse.json({
      success: true,
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
    console.error('Fetch cremation provider notifications error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH - Mark cremation provider notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    // Check which column name to use (id or notification_id)
    let idColumn = 'id';
    try {
      const tableInfo = await query(`DESCRIBE notifications`) as any[];
      const hasNotificationId = tableInfo.some((col: any) => col.Field === 'notification_id');
      const hasId = tableInfo.some((col: any) => col.Field === 'id');
      
      if (hasNotificationId && !hasId) {
        idColumn = 'notification_id';
      }
    } catch (describeError) {
      console.warn('Could not describe notifications table:', describeError);
    }

    let updateQuery;
    let queryParams;

    if (markAll) {
      // Mark all notifications as read for this cremation provider
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
      queryParams = [parseInt(user.userId)];
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      // SECURITY FIX: Build safe parameterized query without template literals
      const placeholders = notificationIds.map(() => '?').join(',');
      if (idColumn === 'notification_id') {
        updateQuery = `UPDATE notifications SET is_read = 1 WHERE notification_id IN (${placeholders}) AND user_id = ?`;
      } else {
        updateQuery = `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`;
      }
      queryParams = [...notificationIds, parseInt(user.userId)];
    } else {
      return NextResponse.json({
        error: 'Either provide notification IDs or set markAll to true'
      }, { status: 400 });
    }

    const result = await query(updateQuery, queryParams) as any;

    return NextResponse.json({
      success: true,
      message: markAll 
        ? 'All notifications marked as read' 
        : `${result.affectedRows} notification(s) marked as read`,
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('Mark cremation provider notifications as read error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete cremation provider notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationIds, deleteAll = false } = body;

    // Check which column name to use (id or notification_id)
    let idColumn = 'id';
    try {
      const tableInfo = await query(`DESCRIBE notifications`) as any[];
      const hasNotificationId = tableInfo.some((col: any) => col.Field === 'notification_id');
      const hasId = tableInfo.some((col: any) => col.Field === 'id');
      
      if (hasNotificationId && !hasId) {
        idColumn = 'notification_id';
      }
    } catch (describeError) {
      console.warn('Could not describe notifications table:', describeError);
    }

    let deleteQuery;
    let queryParams;

    if (deleteAll) {
      // Delete all notifications for this cremation provider
      deleteQuery = 'DELETE FROM notifications WHERE user_id = ?';
      queryParams = [parseInt(user.userId)];
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Delete specific notifications
      // SECURITY FIX: Build safe parameterized query without template literals
      const placeholders = notificationIds.map(() => '?').join(',');
      if (idColumn === 'notification_id') {
        deleteQuery = `DELETE FROM notifications WHERE notification_id IN (${placeholders}) AND user_id = ?`;
      } else {
        deleteQuery = `DELETE FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`;
      }
      queryParams = [...notificationIds, parseInt(user.userId)];
    } else {
      return NextResponse.json({
        error: 'Either provide notification IDs or set deleteAll to true'
      }, { status: 400 });
    }

    const result = await query(deleteQuery, queryParams) as any;

    return NextResponse.json({
      success: true,
      message: deleteAll 
        ? 'All notifications deleted' 
        : `${result.affectedRows} notification(s) deleted`,
      deletedCount: result.affectedRows
    });

  } catch (error) {
    console.error('Delete cremation provider notifications error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 