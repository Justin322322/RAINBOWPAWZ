import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to fetch all reviews for admin
 * GET /api/admin/reviews
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify admin is authenticated
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

    // Fetch all reviews with user and provider information
    const reviews = await query(`
      SELECT 
        r.id,
        r.user_id,
        r.service_provider_id,
        r.booking_id,
        r.rating,
        r.comment,
        r.images,
        r.created_at,
        r.updated_at,
        r.report_reason,
        r.report_status,
        r.reported_by,
        r.reported_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        COALESCE(sp.name, bp.business_name, 'Unknown Provider') as provider_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN service_providers sp ON r.service_provider_id = sp.provider_id
      LEFT JOIN business_profiles bp ON r.service_provider_id = bp.id
      ORDER BY r.created_at DESC
    `) as any[];

    // Parse images JSON for each review
    const reviewsWithImages = reviews.map(review => {
      let parsedImages = null;
      if (review.images) {
        try {
          // If it's already an array, use it directly
          if (Array.isArray(review.images)) {
            parsedImages = review.images;
          } else if (typeof review.images === 'string') {
            // If it's a string, parse it
            parsedImages = JSON.parse(review.images);
          }
        } catch (error) {
          console.error('Error parsing images for review', review.id, error);
          parsedImages = null;
        }
      }
      return {
        ...review,
        images: parsedImages
      };
    });

    return NextResponse.json({
      success: true,
      reviews: reviewsWithImages || []
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching reviews'
    }, { status: 500 });
  }
}
