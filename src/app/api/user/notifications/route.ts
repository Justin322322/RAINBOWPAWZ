
import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/utils/userNotificationService';

/**
 * GET - Fetch user notifications_unified
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow both regular users and business users (service providers) to access notifications_unified
    if (user.accountType !== 'user' && user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch notifications
    const raw = await getUserNotifications(parseInt(user.userId), limit);
    // Normalize shape
    const notifications_unified = (raw || []).map(n => ({
      ...n,
      status: n.status ? 1 : 0,
    }));

    // Calculate unread count
    const unreadCount = notifications_unified.filter(n => n.status === 0).length;

    return NextResponse.json({
      success: true,
      notifications: notifications_unified,
      notifications_unified,
      unreadCount,
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Fetch notifications_unified error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PATCH - Mark notification(s) as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow both regular users and business users (service providers) to mark notifications_unified as read
    if (user.accountType !== 'user' && user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all notifications_unified as read
      const success = await markAllNotificationsAsRead(parseInt(user.userId));
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'All notifications_unified marked as read'
        });
      } else {
        return NextResponse.json({
          error: 'Failed to mark notifications_unified as read'
        }, { status: 500 });
      }
    } else if (notificationId) {
      // Mark specific notification as read
      const success = await markNotificationAsRead(notificationId, parseInt(user.userId));
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Notification marked as read'
        });
      } else {
        return NextResponse.json({
          error: 'Failed to mark notification as read'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        error: 'Either notificationId or markAll must be provided'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

