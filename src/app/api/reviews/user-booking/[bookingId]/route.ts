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

    // Check if it's a JWT token or old format
    let userId = null;
    let _accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      try {
        const { decodeTokenUnsafe } = await import('@/lib/jwt');
        const payload = decodeTokenUnsafe(authToken);
        userId = payload?.userId?.toString() || null;
        _accountType = payload?.accountType || null;
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        _accountType = parts[1];
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Get the review for this booking by this user
    const reviews = await query(
      `SELECT
        id,
        rating,
        comment,
        images,
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

    const review = reviews[0];
    
    // Parse images JSON if it exists
    let images = [];
    if (review.images) {
      try {
        images = typeof review.images === 'string' 
          ? JSON.parse(review.images) 
          : review.images;
      } catch (error) {
        console.error('Error parsing review images:', error);
        images = [];
      }
    }

    // Return the review data
    return NextResponse.json({
      hasReview: true,
      review: {
        ...review,
        images
      }
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching the review'
    }, { status: 500 });
  }
}
