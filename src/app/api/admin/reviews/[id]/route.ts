import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First await the entire params object
    const awaitedParams = await params;
    // Then access the id property
    const reviewId = awaitedParams.id;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tokenUserId, accountType] = authToken.split('_');

    // Only allow admins to access this endpoint
    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if the review exists
    const reviewResult = await query(
      'SELECT id FROM reviews WHERE id = ?',
      [reviewId]
    ) as any[];

    if (!reviewResult || reviewResult.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Delete the review
    await query(
      'DELETE FROM reviews WHERE id = ?',
      [reviewId]
    );

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while deleting the review'
    }, { status: 500 });
  }
}
