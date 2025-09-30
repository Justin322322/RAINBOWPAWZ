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
    const user = await verifySecureAuth(request);
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

    // Prefer deleting from unified notifications table; fall back to legacy table
    let deletedFrom: 'unified' | 'legacy' | 'none' = 'none';
    try {
      const unifiedResult = await query(
        'DELETE FROM notifications_unified WHERE id = ? AND user_id = ? AND category = "admin"',
        [notificationId, user.userId]
      ) as any;
      if (unifiedResult && typeof unifiedResult.affectedRows === 'number' && unifiedResult.affectedRows > 0) {
        deletedFrom = 'unified';
      }
    } catch {}

    if (deletedFrom === 'none') {
      try {
        const legacyDelete = await query('DELETE FROM admin_notifications WHERE id = ?', [notificationId]) as any;
        if (legacyDelete && typeof legacyDelete.affectedRows === 'number' && legacyDelete.affectedRows > 0) {
          deletedFrom = 'legacy';
        }
      } catch {}
    }

    // Always return success to keep client UX smooth, even if already deleted elsewhere
    return NextResponse.json({
      success: true,
      message: deletedFrom === 'none' ? 'Notification already removed' : 'Notification deleted successfully',
      notificationId,
      deletedFrom
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
