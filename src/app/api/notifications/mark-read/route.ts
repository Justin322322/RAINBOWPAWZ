import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        success: false 
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    const [userId, accountType] = authToken.split('_');
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        success: false 
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    // Validate input
    if (!markAll && (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)) {
      return NextResponse.json({
        error: 'Either provide notification IDs or set markAll to true',
        success: false
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    let updateQuery;
    let queryParams;

    if (markAll) {
      // Mark all notifications as read for this user
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
      queryParams = [userId];
    } else {
      // Mark specific notifications as read
      // Use a safer approach with multiple parameters instead of IN clause with array
      const placeholders = notificationIds.map(() => '?').join(',');
      updateQuery = `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`;
      queryParams = [...notificationIds, userId];
    }

    try {
      // Execute the update
      const result = await query(updateQuery, queryParams) as any;

      return NextResponse.json({
        success: true,
        affectedRows: result.affectedRows,
        message: markAll 
          ? 'All notifications marked as read' 
          : `${result.affectedRows} notification(s) marked as read`
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (dbError) {
      console.error('Database error marking notifications as read:', dbError);
      return NextResponse.json({
        error: 'Database error while marking notifications as read',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        success: false
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({
      error: 'Failed to mark notifications as read',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}
