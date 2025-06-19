import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';
import { RateLimiter, createRateLimitHeaders, createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401),
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    const [userId] = authToken.split('_');
    if (!userId) {
      return NextResponse.json(
        createStandardErrorResponse('Invalid authentication token', 401),
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
    const rateLimitResult = await RateLimiter.checkNotificationMarkReadLimit(userId);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        createStandardErrorResponse(rateLimitResult.error || 'Rate limit exceeded', 429),
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

    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    // Validate input
    if (!markAll && (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)) {
      return NextResponse.json(
        createStandardErrorResponse('Either provide notification IDs or set markAll to true', 400),
        {
          status: 400,
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
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

    let updateQuery;
    let queryParams;

    if (markAll) {
      // Mark all notifications as read for this user
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
      queryParams = [userId];
    } else {
      // Mark specific notifications as read
      // SECURITY FIX: Build safe parameterized query without template literals
      const placeholders = notificationIds.map(() => '?').join(',');
      if (idColumn === 'notification_id') {
        updateQuery = `UPDATE notifications SET is_read = 1 WHERE notification_id IN (${placeholders}) AND user_id = ?`;
      } else {
        updateQuery = `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`;
      }
      queryParams = [...notificationIds, userId];
    }

    try {
      // Execute the update
      const result = await query(updateQuery, queryParams) as any;

      return NextResponse.json(
        createStandardSuccessResponse({
          affectedRows: result.affectedRows
        }, markAll
          ? 'All notifications marked as read'
          : `${result.affectedRows} notification(s) marked as read`
        ),
        {
          headers: {
            ...rateLimitHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    } catch (dbError) {
      console.error('Database error in mark-read:', dbError);
      return NextResponse.json(
        createStandardErrorResponse('Database error while marking notifications as read', 500, {
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
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
    console.error('Unexpected error in mark-read:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to mark notifications as read', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
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
