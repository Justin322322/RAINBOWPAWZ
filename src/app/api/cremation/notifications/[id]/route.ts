import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET - Get specific cremation provider notification
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const notificationId = params.id;

    if (!notificationId || isNaN(parseInt(notificationId))) {
      return NextResponse.json({
        error: 'Invalid notification ID'
      }, { status: 400 });
    }

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

    // Fetch the specific notification for this cremation provider
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
      WHERE ${idColumn} = ? AND user_id = ?
    `, [parseInt(notificationId), parseInt(user.userId)]) as any[];

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        error: 'Notification not found'
      }, { status: 404 });
    }

    const notification = notifications[0];

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Get cremation provider notification error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH - Mark specific cremation provider notification as read
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const notificationId = params.id;

    if (!notificationId || isNaN(parseInt(notificationId))) {
      return NextResponse.json({
        error: 'Invalid notification ID'
      }, { status: 400 });
    }

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

    // Mark the specific notification as read for this cremation provider
    const result = await query(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE ${idColumn} = ? AND user_id = ?
    `, [parseInt(notificationId), parseInt(user.userId)]) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json({
        error: 'Notification not found or already read'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark cremation provider notification as read error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 