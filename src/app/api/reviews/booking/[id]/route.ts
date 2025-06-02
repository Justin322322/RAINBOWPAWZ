import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    // First await the entire params object
    const awaitedParams = await params;
    // Then access the id property
    const bookingId = awaitedParams.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Check if a review exists for this booking
    const reviews = await query(
      'SELECT id FROM reviews WHERE booking_id = ?',
      [bookingId]
    ) as any[];

    const hasReview = reviews && reviews.length > 0;

    return NextResponse.json({
      hasReview,
      reviewId: hasReview ? reviews[0].id : null
    });
  } catch (error) {
    console.error('Error checking booking review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while checking for reviews'
    }, { status: 500 });
  }
}
