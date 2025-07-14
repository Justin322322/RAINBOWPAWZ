import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * Handles GET requests to retrieve all reviews submitted by a specific user, including the names of associated service providers.
 *
 * Returns a JSON response containing the user's reviews, or an error message with the appropriate HTTP status code if authentication fails, the user ID is missing, or an internal error occurs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [_tokenUserId, _accountType] = authToken.split('_');

    // First await the entire params object
    const awaitedParams = await params;
    // Then access the id property
    const userId = awaitedParams.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all reviews by the user with provider names
    const reviews = await query(
      `SELECT r.*, sp.name as provider_name
       FROM reviews r
       JOIN service_providers sp ON r.service_provider_id = sp.provider_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    ) as any[];

    return NextResponse.json({
      reviews
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching reviews'
    }, { status: 500 });
  }
}
