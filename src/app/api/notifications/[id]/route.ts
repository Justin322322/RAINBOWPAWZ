import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';

// DELETE endpoint to remove a specific notification
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
        createStandardErrorResponse('Invalid notification ID', 400),
        { status: 400 }
      );
    }

    // Get user ID from auth token
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401),
        { status: 401 }
      );
    }

    const [userId, accountType] = authToken.split('_');
    if (!userId) {
      return NextResponse.json(
        createStandardErrorResponse('Invalid authentication token', 401),
        { status: 401 }
      );
    }

    // Check if the notification exists and belongs to the user
    const notificationResult = await query(
      'SELECT notification_id, user_id FROM notifications WHERE notification_id = ?',
      [notificationId]
    ) as any[];

    if (!notificationResult || notificationResult.length === 0) {
      return NextResponse.json(
        createStandardErrorResponse('Notification not found', 404),
        { status: 404 }
      );
    }

    const notification = notificationResult[0];

    // Verify ownership (users can only delete their own notifications)
    if (notification.user_id.toString() !== userId) {
      return NextResponse.json(
        createStandardErrorResponse('Forbidden: You can only delete your own notifications', 403),
        { status: 403 }
      );
    }

    // Delete the notification
    await query('DELETE FROM notifications WHERE notification_id = ?', [notificationId]);

    return NextResponse.json(
      createStandardSuccessResponse(
        { notificationId },
        'Notification deleted successfully'
      )
    );
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to delete notification', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}
