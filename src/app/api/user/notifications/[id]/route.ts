import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { query } from '@/lib/db';

/**
 * DELETE - Remove a specific user notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get notification ID from params
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

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

    // Allow both regular users and business users (service providers) to delete notifications
    if (accountType !== 'user' && accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - User or business access required'
      }, { status: 403 });
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

    // Check if the notification exists and belongs to the user
    let selectQuery, deleteQuery;
    if (idColumn === 'notification_id') {
      selectQuery = 'SELECT notification_id FROM notifications WHERE notification_id = ? AND user_id = ?';
      deleteQuery = 'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?';
    } else {
      selectQuery = 'SELECT id FROM notifications WHERE id = ? AND user_id = ?';
      deleteQuery = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    }

    const notificationResult = await query(selectQuery, [notificationId, parseInt(userId)]) as any[];

    if (!notificationResult || notificationResult.length === 0) {
      return NextResponse.json({
        error: 'Notification not found or access denied'
      }, { status: 404 });
    }

    // Delete the notification
    await query(deleteQuery, [notificationId, parseInt(userId)]);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete user notification error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
