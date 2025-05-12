import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    // Validate input
    if (!markAll && (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)) {
      return NextResponse.json({
        error: 'Either provide notification IDs or set markAll to true'
      }, { status: 400 });
    }

    let updateQuery;
    let queryParams;

    if (markAll) {
      // Mark all notifications as read for this user
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
      queryParams = [userId];
    } else {
      // Mark specific notifications as read
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE id IN (?) AND user_id = ?';
      queryParams = [notificationIds, userId];
    }

    // Execute the update
    const result = await query(updateQuery, queryParams) as any;

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
      message: markAll 
        ? 'All notifications marked as read' 
        : `${result.affectedRows} notification(s) marked as read`
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({
      error: 'Failed to mark notifications as read',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
