import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { decodeTokenUnsafe } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check account type if we have a token
    if (authToken) {
      let accountType: string | null = null;

      // Check if it's a JWT token or old format
      if (authToken.includes('.')) {
        // JWT token format
        const payload = decodeTokenUnsafe(authToken);
        accountType = payload?.accountType || null;
      } else {
        // Old format fallback
        const parts = authToken.split('_');
        accountType = parts.length === 2 ? parts[1] : null;
      }

      // Only allow admins to access this endpoint (unless in development)
      if (accountType !== 'admin' && !isDevelopment) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // First check if the reviews table exists
    try {
      const tablesResult = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
      `) as any[];

      if (!tablesResult || tablesResult.length === 0) {
        // Table doesn't exist, return empty array instead of error
        return NextResponse.json({
          reviews: [],
          message: 'Reviews table does not exist'
        });
      }
    } catch (tableError) {
      console.error('Error checking reviews table:', tableError);
      // Return empty array with a message instead of error
      return NextResponse.json({
        reviews: [],
        message: 'Could not verify reviews table'
      });
    }

    // Get all reviews with user and provider names
    try {
      const reviews = await query(`
        SELECT r.*,
               CONCAT(u.first_name, ' ', u.last_name) as user_name,
               sp.name as provider_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        JOIN service_providers sp ON r.service_provider_id = sp.provider_id
        ORDER BY r.created_at DESC
      `) as any[];

      return NextResponse.json({
        reviews
      });
    } catch (queryError) {
      // If the JOIN fails, try a simpler query without joins
      try {
        const simpleReviews = await query(`
          SELECT * FROM reviews ORDER BY created_at DESC
        `) as any[];

        return NextResponse.json({
          reviews: simpleReviews,
          message: 'Retrieved reviews without user and provider details'
        });
      } catch (fallbackError) {
        // If even the simple query fails, return empty array
        return NextResponse.json({
          reviews: [],
          message: 'Could not retrieve reviews'
        });
      }
    }
  } catch (error) {
    // Error logged for debugging
    // Return empty array instead of error to prevent error loops
    return NextResponse.json({
      reviews: [],
      error: error instanceof Error ? error.message : 'An error occurred while fetching reviews'
    });
  }
}
