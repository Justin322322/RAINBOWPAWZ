import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// DELETE endpoint to remove a specific admin notification
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
        { error: 'Invalid notification ID', success: false },
        { status: 400 }
      );
    }

    // Verify admin authentication
    let isAuthenticated = false;
    let accountType = '';

    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Check if the notification exists
    const notificationResult = await query(
      'SELECT id FROM admin_notifications WHERE id = ?',
      [notificationId]
    ) as any[];

    if (!notificationResult || notificationResult.length === 0) {
      return NextResponse.json({
        error: 'Notification not found',
        success: false
      }, { 
        status: 404,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    // Delete the notification
    await query('DELETE FROM admin_notifications WHERE id = ?', [notificationId]);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
      notificationId
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error deleting admin notification:', error);
    return NextResponse.json({
      error: 'Failed to delete notification',
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
