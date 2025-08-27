import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET - Fetch cremation provider notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
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

    // Get unread count - ensure proper boolean handling
    const unreadResult = await query(`
      SELECT COUNT(*) as unread 
      FROM notifications 
      WHERE user_id = ? AND (is_read = 0 OR is_read = false OR is_read IS NULL)
    `, [parseInt(user.userId)]) as any[];

    const unreadCount = unreadResult[0]?.unread || 0;

    // Also check for pending bookings that should create notifications
    let pendingBookingsCount = 0;
    try {
      // Get provider ID for this business user
      const providerResult = await query(
        'SELECT provider_id FROM service_providers WHERE user_id = ?',
        [user.userId]
      ) as any[];

      if (providerResult && providerResult.length > 0) {
        const providerId = providerResult[0].provider_id;
        
        // Check for pending bookings
        const pendingBookings = await query(`
          SELECT COUNT(*) as count
          FROM service_bookings
          WHERE provider_id = ? AND status = 'pending'
        `, [providerId]) as any[];

        pendingBookingsCount = pendingBookings[0]?.count || 0;
      }
    } catch (error) {
      console.warn('Error checking pending bookings for notification count:', error);
    }

    // Calculate total unread count including pending bookings
    const totalUnreadCount = unreadCount + pendingBookingsCount;

    console.log('Notification counts:', {
      notifications: notifications.length,
      total,
      unread: unreadCount,
      pendingBookings: pendingBookingsCount,
      totalUnread: totalUnreadCount
    });

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      unreadCount: totalUnreadCount,
      breakdown: {
        notifications: unreadCount,
        pendingBookings: pendingBookingsCount
      }
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
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      await query(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE user_id = ?
      `, [parseInt(user.userId)]);

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    if (!notificationId) {
      return NextResponse.json({
        error: 'Notification ID is required'
      }, { status: 400 });
    }

    // Mark specific notification as read
    const result = await query(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND user_id = ?
    `, [notificationId, parseInt(user.userId)]) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: 'Notification not found or already marked as read'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
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
    const user = await verifySecureAuth(request);
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
