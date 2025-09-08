import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET - Fetch cremation provider notifications_unified
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

    // Fetch notifications for this cremation provider
    const rawNotifications = await query(`
      SELECT 
        id,
        title,
        message,
        type,
        category,
        status,
        priority,
        created_at,
        read_at,
        link
      FROM notifications_unified 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, [parseInt(user.userId)]) as any[];

    // Normalize to the shape the frontend expects
    const notifications_unified = (rawNotifications || []).map((n: any) => ({
      id: Number(n.id),
      title: n.title,
      message: n.message,
      // Map arbitrary type values to allowed UI types; default to 'info'
      type: (['info','success','warning','error'].includes(String(n.type))) ? n.type : 'info',
      // Convert to numeric status: 0 = unread, 1 = read
      status: String(n.status).toLowerCase() === 'read' || n.read_at ? 1 : 0,
      created_at: n.created_at,
      link: n.link ?? null
    }));

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM notifications_unified 
      WHERE user_id = ?
    `, [parseInt(user.userId)]) as any[];

    const total = countResult[0]?.total || 0;

    // Get unread count - check for 'pending' status or NULL read_at
    const unreadResult = await query(`
      SELECT COUNT(*) as unread 
      FROM notifications_unified 
      WHERE user_id = ? AND (status != 'read' OR read_at IS NULL)
    `, [parseInt(user.userId)]) as any[];

    const unreadCount = unreadResult[0]?.unread || 0;

    // Also check for pending bookings that should create notifications_unified
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
          FROM bookings
          WHERE provider_id = ? AND status = 'pending'
        `, [providerId]) as any[];

        pendingBookingsCount = pendingBookings[0]?.count || 0;
      }
    } catch (error) {
      console.warn('Error checking pending bookings for notification count:', error);
    }

    // Keep unread count strictly to real notifications to avoid UI mismatch
    const totalUnreadCount = unreadCount;

    console.log('Notification counts:', {
      notifications_unified: notifications_unified.length,
      total,
      unread: unreadCount,
      pendingBookings: pendingBookingsCount,
      totalUnread: totalUnreadCount
    });

    return NextResponse.json({
      success: true,
      notifications: notifications_unified,
      notifications_unified,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      unreadCount: totalUnreadCount,
      unread_count: totalUnreadCount,
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
 * PATCH - Mark cremation provider notifications_unified as read
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
        UPDATE notifications_unified 
        SET status = 'read', read_at = NOW() 
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
      UPDATE notifications_unified 
      SET status = 'read', read_at = NOW() 
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
 * DELETE - Delete cremation provider notifications_unified
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

    let deleteQuery;
    let queryParams;

    if (deleteAll) {
      // Delete all notifications_unified for this cremation provider
      deleteQuery = 'DELETE FROM notifications_unified WHERE user_id = ?';
      queryParams = [parseInt(user.userId)];
    } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Delete specific notifications_unified
      // SECURITY FIX: Build safe parameterized query without template literals
      const placeholders = notificationIds.map(() => '?').join(',');
      deleteQuery = `DELETE FROM notifications_unified WHERE id IN (${placeholders}) AND user_id = ?`;
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
