import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { RateLimiter, createRateLimitHeaders, createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';

/**
 * GET - Fetch unified notifications for the authenticated user
 * This endpoint provides a unified view of all notifications from the notifications_unified table
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Allow all authenticated users to access notifications
    if (!user.userId) {
      return NextResponse.json(
        createStandardErrorResponse('Invalid user', 401, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Implement proper server-side rate limiting
    const rateLimitResult = await RateLimiter.checkNotificationFetchLimit(user.userId);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createStandardErrorResponse(rateLimitResult.error || 'Rate limit exceeded', 429, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100); // Default 50, max 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const category = searchParams.get('category'); // booking, payment, refund, review, admin, marketing, system

    try {
      // Build the query based on parameters
      let notificationsQuery = `
        SELECT 
          id,
          user_id,
          provider_id,
          type,
          category,
          title,
          message,
          data,
          status,
          priority,
          scheduled_at,
          sent_at,
          read_at,
          created_at,
          updated_at
        FROM notifications_unified
        WHERE user_id = ?
      `;

      const queryParams: any[] = [user.userId];

      // Filter by category if specified
      if (category) {
        notificationsQuery += ' AND category = ?';
        queryParams.push(category);
      }

      // Filter by unread status if specified
      if (unreadOnly) {
        notificationsQuery += ' AND status != ?';
        queryParams.push('read');
      }

      notificationsQuery += ` ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

      // Execute the query
      const notifications = await query(notificationsQuery, queryParams) as any[];

      // Transform notifications to include read status as boolean
      const transformedNotifications = notifications.map(notification => ({
        ...notification,
        isRead: notification.status === 'read',
        data: notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : null
      }));

      // Get the total count of notifications for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM notifications_unified
        WHERE user_id = ?
      `;
      const countParams = [user.userId];

      if (category) {
        countQuery += ' AND category = ?';
        countParams.push(category);
      }

      if (unreadOnly) {
        countQuery += ' AND status != ?';
        countParams.push('read');
      }

      const countResult = await query(countQuery, countParams) as any[];
      const total = countResult[0].total;

      // Get the count of unread notifications
      const unreadCountResult = await query(
        'SELECT COUNT(*) as unread FROM notifications_unified WHERE user_id = ? AND status != ?',
        [user.userId, 'read']
      ) as any[];
      const unreadCount = unreadCountResult[0].unread;

      return NextResponse.json(
        createStandardSuccessResponse({
          notifications: transformedNotifications,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          },
          unreadCount
        }),
        {
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'private, max-age=30', // 30 second cache for notifications
            'Pragma': 'no-cache'
          }
        }
      );
    } catch (dbError) {
      console.error('Database error in unified notifications:', dbError);
      return NextResponse.json(
        createStandardErrorResponse('Database error', 500, {
          notifications: [],
          unreadCount: 0
        }),
        {
          status: 500,
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in unified notifications endpoint:', error);
    return NextResponse.json(
      createStandardErrorResponse('Internal server error', 500, {
        notifications: [],
        unreadCount: 0
      }),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}

/**
 * PATCH - Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401),
        { status: 401 }
      );
    }

    if (!user.userId) {
      return NextResponse.json(
        createStandardErrorResponse('Invalid user', 401),
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await RateLimiter.checkNotificationCreateLimit(user.userId);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createStandardErrorResponse(rateLimitResult.error || 'Rate limit exceeded', 429),
        {
          status: 429,
          headers: rateLimitHeaders
        }
      );
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    try {
      if (markAllAsRead) {
        // Mark all notifications as read for the user
        await query(
          'UPDATE notifications_unified SET status = ?, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND status != ?',
          ['read', user.userId, 'read']
        );
      } else if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Mark specific notifications as read
        const placeholders = notificationIds.map(() => '?').join(',');
        await query(
          `UPDATE notifications_unified SET status = ?, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND id IN (${placeholders}) AND status != ?`,
          ['read', user.userId, ...notificationIds, 'read']
        );
      } else {
        return NextResponse.json(
          createStandardErrorResponse('Either notificationIds or markAllAsRead must be provided', 400),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createStandardSuccessResponse({}, 'Notifications marked as read'),
        {
          headers: rateLimitHeaders
        }
      );
    } catch (dbError) {
      console.error('Database error updating notifications:', dbError);
      return NextResponse.json(
        createStandardErrorResponse('Failed to update notifications', 500),
        {
          status: 500,
          headers: rateLimitHeaders
        }
      );
    }
  } catch (error) {
    console.error('Error in PATCH unified notifications:', error);
    return NextResponse.json(
      createStandardErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}
