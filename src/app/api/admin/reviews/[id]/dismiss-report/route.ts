import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to dismiss a review report
 * PATCH /api/admin/reviews/[id]/dismiss-report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token to verify admin role
    let accountType = null;
    if (authToken.includes('.')) {
      try {
        const { decodeTokenUnsafe } = await import('@/lib/jwt');
        const payload = decodeTokenUnsafe(authToken);
        accountType = payload?.accountType || null;
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      const parts = authToken.split('_');
      if (parts.length === 2) {
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const reviewId = params.id;

    // Update the review report status to dismissed
    await query(
      `UPDATE reviews 
       SET report_status = 'dismissed'
       WHERE id = ?`,
      [reviewId]
    );

    return NextResponse.json({
      success: true,
      message: 'Report dismissed successfully'
    });
  } catch (error) {
    console.error('Error dismissing report:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while dismissing the report'
    }, { status: 500 });
  }
}
