import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to fetch completed bookings that need reviews
 * GET /api/reviews/pending
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');


    // In development, allow any account type for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (accountType !== 'user' && !isDevelopment) {
      return NextResponse.json({ error: 'Forbidden: User access required' }, { status: 403 });
    }

    // First, check if the reviews table exists
    try {
      const tablesResult = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
      `) as any[];

      if (!tablesResult || tablesResult.length === 0) {

        // Create the reviews table if it doesn't exist
        await query(`
          CREATE TABLE IF NOT EXISTS reviews (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            service_provider_id INT NOT NULL,
            booking_id INT NOT NULL,
            rating INT NOT NULL,
            comment TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            expiration_date TIMESTAMP NULL,
            PRIMARY KEY (id),
            UNIQUE INDEX unique_booking_review (booking_id ASC)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      }
    } catch (error) {
      console.error('Error checking/creating reviews table:', error);
    }

    // Get all completed bookings for this user
    let pendingReviews: any[] = [];

    // Check which tables exist in the database
    try {
      const tablesResult = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('business_services', 'service_bookings')
      `) as any[];

      const existingTables = new Set(tablesResult.map((row: any) => row.TABLE_NAME));

      // Get all completed bookings using the business_services table
      if (existingTables.has('business_services')) {
        try {
          const completedBookingsQuery = `
            SELECT sb.id as booking_id,
                  sp.provider_id as service_provider_id,
                  spr.name as provider_name,
                  sb.booking_date,
                  sp.package_id as service_type_id,
                  sp.name as service_name
            FROM service_bookings sb
            JOIN service_packages sp ON sb.package_id = sp.package_id
            JOIN service_providers spr ON sp.provider_id = spr.provider_id
            WHERE sb.user_id = ?
            AND sb.status = 'completed'
            ORDER BY sb.booking_date DESC
          `;

          const allCompletedBookings = await query(completedBookingsQuery, [userId]) as any[];

          if (allCompletedBookings && allCompletedBookings.length > 0) {
            // Now get all reviews for this user
            const reviewsQuery = `
              SELECT booking_id
              FROM reviews
              WHERE user_id = ?
            `;

            const existingReviews = await query(reviewsQuery, [userId]) as any[];

            // Create a set of booking IDs that already have reviews
            const reviewedBookingIds = new Set(existingReviews.map(review => review.booking_id));

            // Filter out bookings that already have reviews
            pendingReviews = allCompletedBookings.filter(booking => {
              // Check if this booking already has a review
              if (reviewedBookingIds.has(booking.booking_id)) {
                return false;
              }

              // Check if the booking was completed more than 5 days ago
              const bookingDate = new Date(booking.booking_date);
              const fiveDaysAgo = new Date();
              fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

              // If booking date is older than 5 days, don't include it
              if (bookingDate < fiveDaysAgo) {
                return false;
              }

              return true;
            });


            return NextResponse.json({
              pendingReviews,
              debug: {
                method: 'business_services',
                completedBookings: allCompletedBookings.length,
                existingReviews: existingReviews.length,
                pendingReviews: pendingReviews.length
              }
            });
          }
        } catch (error) {
          console.error('Error with business_services query:', error);
        }
      }

      // If we have service_bookings but no results yet, try a simpler query
      if (existingTables.has('service_bookings') && pendingReviews.length === 0) {
        try {
          const directQuery = `
            SELECT
              sb.id as booking_id,
              sb.provider_id as service_provider_id,
              'Service Provider' as provider_name,
              sb.booking_date,
              'Cremation Service' as service_name
            FROM service_bookings sb
            WHERE sb.user_id = ?
            AND sb.status = 'completed'
            ORDER BY sb.booking_date DESC
          `;

          const directResults = await query(directQuery, [userId]) as any[];

          if (directResults && directResults.length > 0) {
            // Now get all reviews for this user
            const reviewsQuery = `
              SELECT booking_id
              FROM reviews
              WHERE user_id = ?
            `;

            const existingReviews = await query(reviewsQuery, [userId]) as any[];

            // Create a set of booking IDs that already have reviews
            const reviewedBookingIds = new Set(existingReviews.map(review => review.booking_id));

            // Filter out bookings that already have reviews
            pendingReviews = directResults.filter(booking => {
              // Check if this booking already has a review
              if (reviewedBookingIds.has(booking.booking_id)) {
                return false;
              }

              // Check if the booking was completed more than 5 days ago
              const bookingDate = new Date(booking.booking_date);
              const fiveDaysAgo = new Date();
              fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

              // If booking date is older than 5 days, don't include it
              if (bookingDate < fiveDaysAgo) {
                return false;
              }

              return true;
            });


            return NextResponse.json({
              pendingReviews,
              debug: {
                method: 'direct_query',
                completedBookings: directResults.length,
                existingReviews: existingReviews.length,
                pendingReviews: pendingReviews.length
              }
            });
          }
        } catch (error) {
          console.error('Error with direct query:', error);
        }
      }

      // If still no results, try the most basic query
      if (pendingReviews.length === 0) {
        try {
          const fallbackQuery = `
            SELECT
              id as booking_id,
              provider_id as service_provider_id,
              'Service Provider' as provider_name,
              booking_date,
              'Cremation Service' as service_name
            FROM service_bookings
            WHERE user_id = ?
            AND status = 'completed'
            ORDER BY booking_date DESC
          `;

          const fallbackResults = await query(fallbackQuery, [userId]) as any[];

          if (fallbackResults && fallbackResults.length > 0) {
            // Now get all reviews for this user
            const reviewsQuery = `
              SELECT booking_id
              FROM reviews
              WHERE user_id = ?
            `;

            const existingReviews = await query(reviewsQuery, [userId]) as any[];

            // Create a set of booking IDs that already have reviews
            const reviewedBookingIds = new Set(existingReviews.map(review => review.booking_id));

            // Filter out bookings that already have reviews
            pendingReviews = fallbackResults.filter(booking => {
              // Check if this booking already has a review
              if (reviewedBookingIds.has(booking.booking_id)) {
                return false;
              }

              // Check if the booking was completed more than 5 days ago
              const bookingDate = new Date(booking.booking_date);
              const fiveDaysAgo = new Date();
              fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

              // If booking date is older than 5 days, don't include it
              if (bookingDate < fiveDaysAgo) {
                return false;
              }

              return true;
            });

          }
        } catch (error) {
          console.error('Error with fallback query:', error);
        }
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    }

    // Return whatever we have at this point
    return NextResponse.json({
      pendingReviews: pendingReviews || [],
      debug: {
        method: 'final_result',
        pendingReviews: pendingReviews.length
      }
    });
  } catch (error) {
    console.error('Error in pending reviews API:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching pending reviews',
      pendingReviews: []
    }, { status: 500 });
  }
}
