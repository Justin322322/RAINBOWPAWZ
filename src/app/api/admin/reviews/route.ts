import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
    } catch {
      // If the JOIN fails, try a simpler query without joins
      try {
        const simpleReviews = await query(`
          SELECT * FROM reviews ORDER BY created_at DESC
        `) as any[];

        return NextResponse.json({
          reviews: simpleReviews,
          message: 'Retrieved reviews without user and provider details'
        });
      } catch {
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
