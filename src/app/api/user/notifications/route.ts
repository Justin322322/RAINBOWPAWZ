import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/utils/userNotificationService';

/**
 * GET - Fetch user notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (!userId || !accountType) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Allow both regular users and business users (service providers) to access notifications
    if (accountType !== 'user' && accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch notifications
    const notifications = await getUserNotifications(parseInt(userId), limit);

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
    // Verify user authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (!userId || !accountType) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Allow both regular users and business users (service providers) to mark notifications as read
    if (accountType !== 'user' && accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      const success = await markAllNotificationsAsRead(parseInt(userId));
      
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
      const success = await markNotificationAsRead(notificationId, parseInt(userId));
      
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
