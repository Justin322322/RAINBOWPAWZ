import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

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

    // Use secure authentication for consistency
    const user = verifySecureAuth(request);
    if (!user) {
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

    if (user.accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, {
        status: 403,
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
