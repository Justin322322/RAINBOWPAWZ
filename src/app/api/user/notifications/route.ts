import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/utils/userNotificationService';

/**
 * GET - Fetch user notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow both regular users and business users (service providers) to access notifications
    if (user.accountType !== 'user' && user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch notifications
    const notifications = await getUserNotifications(parseInt(user.userId), limit);

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error('Fetch notifications error:', error);
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

    // Allow both regular users and business users (service providers) to mark notifications as read
    if (user.accountType !== 'user' && user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      const success = await markAllNotificationsAsRead(parseInt(user.userId));
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        });
      } else {
        return NextResponse.json({
          error: 'Failed to mark notifications as read'
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

