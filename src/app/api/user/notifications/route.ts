
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

    // Fetch notifications_unified
    const notifications_unified = await getUserNotifications(parseInt(user.userId), limit);

    // Calculate unread count from the notifications_unified
    const unreadCount = notifications_unified.filter(notification => notification.status === 0).length;

    return NextResponse.json({
      success: true,
      notifications_unified,
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

