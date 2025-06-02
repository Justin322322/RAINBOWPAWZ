import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

type Params = {
  params: {
    bookingId: string;
  };
};

/**
 * API endpoint to get a user's review for a specific booking
 * GET /api/reviews/user-booking/[bookingId]
 */
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    // First await the entire params object
    const awaitedParams = await params;
    // Then access the bookingId property
    const bookingId = awaitedParams.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Get the review for this booking by this user
    const reviews = await query(
      `SELECT
        id,
        rating,
        comment,
        created_at
      FROM reviews
      WHERE booking_id = ? AND user_id = ?`,
      [bookingId, userId]
    ) as any[];

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        hasReview: false,
        review: null
      });
    }

    // Return the review data
    return NextResponse.json({
      hasReview: true,
      review: reviews[0]
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching the review'
    }, { status: 500 });
  }
}
