import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // First await the entire params object
    const awaitedParams = await params;
    // Then access the id property
    const providerId = awaitedParams.id;


    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    // First, let's check if there are any reviews for this provider directly
    const reviewsCheck = await query(
      `SELECT COUNT(*) as count FROM reviews WHERE service_provider_id = ?`,
      [providerId]
    ) as any[];

    const _reviewCount = reviewsCheck[0]?.count || 0;

    // Check if the provider exists in service_providers table
    const providerCheck = await query(
      `SELECT provider_id as id, name FROM service_providers WHERE provider_id = ?`,
      [providerId]
    ) as any[];

    if (providerCheck.length > 0) {
    } else {
    }

    // Get all reviews for the provider with user names and booking details
    let reviews: any[] = [];

    try {
      // First check if bookings table has the required columns
      const columnsResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings'
        AND COLUMN_NAME IN ('booking_date', 'service_name')
      `) as any[];

      const columns = columnsResult.map((row: any) => row.COLUMN_NAME);
      const hasServiceNameColumn = columns.includes('service_name');
      const hasBookingDateColumn = columns.includes('booking_date');

      // Check if report columns exist
      const reportColumnsResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
        AND COLUMN_NAME IN ('report_reason', 'report_status', 'reported_by', 'reported_at')
      `) as any[];

      const reportColumns = reportColumnsResult.map((row: any) => row.COLUMN_NAME);
      const hasReportColumns = reportColumns.length > 0;

      // Construct a query based on available columns
      let selectFields = `
        r.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        r.booking_id
      `;

      if (hasReportColumns) {
        if (reportColumns.includes('report_reason')) selectFields += `, r.report_reason`;
        if (reportColumns.includes('report_status')) selectFields += `, r.report_status`;
        if (reportColumns.includes('reported_by')) selectFields += `, r.reported_by`;
        if (reportColumns.includes('reported_at')) selectFields += `, r.reported_at`;
      }

      if (hasBookingDateColumn) {
        selectFields += `, sb.booking_date`;
      }

      if (hasServiceNameColumn) {
        selectFields += `, sb.service_name`;
      } else {
        // Try to get service name from service_packages if available
        selectFields += `, sp.name as service_name`;
      }

      let joinClause = `
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN bookings sb ON r.booking_id = sb.id
      `;

      // Add join to service_packages if service_name is not available in bookings
      if (!hasServiceNameColumn) {
        joinClause += ` LEFT JOIN service_packages sp ON sb.package_id = sp.package_id`;
      }

      // Make sure we're using the correct parameter type
      const providerIdParam = isNaN(Number(providerId)) ? providerId : Number(providerId);


      // SECURITY FIX: Build safe query with validated components
      const selectFieldsStr = selectFields;
      const fullQuery = `
        SELECT ${selectFieldsStr}
        FROM reviews r
        ${joinClause}
        WHERE r.service_provider_id = ?
        ORDER BY r.created_at DESC
      `;

      reviews = await query(fullQuery, [providerIdParam]) as any[];

      // Parse images JSON if it exists
      reviews = reviews.map(review => {
        if (review.images) {
          try {
            review.images = typeof review.images === 'string' 
              ? JSON.parse(review.images) 
              : review.images;
          } catch (error) {
            console.error('Error parsing review images:', error);
            review.images = [];
          }
        }
        return review;
      });

      // Log the first review for debugging
      if (reviews.length > 0) {
        console.log('First review sample:', {
          id: reviews[0].id,
          user_id: reviews[0].user_id,
          service_provider_id: reviews[0].service_provider_id,
          booking_id: reviews[0].booking_id,
          rating: reviews[0].rating
        });
      }
    } catch (joinError) {
      console.error('Error with dynamic JOIN query:', joinError);

      // Fallback to a simpler query without the bookings join
      try {
        // Make sure we're using the correct parameter type
        const providerIdParam = isNaN(Number(providerId)) ? providerId : Number(providerId);


        // Try to get reviews with just user information
        reviews = await query(
          `SELECT
            r.*,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.email as user_email,
            r.booking_id
           FROM reviews r
           JOIN users u ON r.user_id = u.user_id
           WHERE r.service_provider_id = ?
           ORDER BY r.created_at DESC`,
          [providerIdParam]
        ) as any[];

        // Parse images JSON if it exists
        reviews = reviews.map(review => {
          if (review.images) {
            try {
              review.images = typeof review.images === 'string' 
                ? JSON.parse(review.images) 
                : review.images;
            } catch (error) {
              console.error('Error parsing review images:', error);
              review.images = [];
            }
          }
          return review;
        });

        // Log the first review for debugging
        if (reviews.length > 0) {
          console.log('First review sample from simplified query:', {
            id: reviews[0].id,
            user_id: reviews[0].user_id,
            service_provider_id: reviews[0].service_provider_id,
            booking_id: reviews[0].booking_id,
            rating: reviews[0].rating
          });
        }


        // If we have reviews and they have booking IDs, try to enhance them with booking data
        if (reviews.length > 0) {
          // Get a list of all booking IDs
          const bookingIds = reviews.filter(r => r.booking_id).map(r => r.booking_id);

          if (bookingIds.length > 0) {
            try {
              // Try to get booking dates FROM bookings
              const placeholders = bookingIds.map(() => '?').join(',');
              const bookingsData = await query(
                `SELECT id, booking_date FROM bookings WHERE id IN (${placeholders})`,
                bookingIds
              ) as any[];

              // Create a map of booking ID to booking date
              const bookingDates = bookingsData.reduce((acc: any, booking: any) => {
                acc[booking.id] = booking.booking_date;
                return acc;
              }, {});

              // Enhance reviews with booking dates
              reviews = reviews.map(review => {
                if (review.booking_id && bookingDates[review.booking_id]) {
                  review.booking_date = bookingDates[review.booking_id];
                }
                return review;
              });
            } catch {
            }
          }
        }
      } catch (simpleError) {
        console.error('Error with simplified JOIN query:', simpleError);

        // Last resort - just get the reviews without any joins
        try {
          // Make sure we're using the correct parameter type
          const providerIdParam = isNaN(Number(providerId)) ? providerId : Number(providerId);


          reviews = await query(
            `SELECT * FROM reviews WHERE service_provider_id = ? ORDER BY created_at DESC`,
            [providerIdParam]
          ) as any[];


          // If we found reviews, try to enhance them with user data
          if (reviews.length > 0) {
            try {
              // Get all user IDs from the reviews
              const userIds = [...new Set(reviews.map(r => r.user_id))];

              if (userIds.length > 0) {
                const userPlaceholders = userIds.map(() => '?').join(',');
                const usersData = await query(
                  `SELECT user_id, CONCAT(first_name, ' ', last_name) as user_name, email
                   FROM users WHERE user_id IN (${userPlaceholders})`,
                  userIds
                ) as any[];

                // Create a map of user ID to user data
                const usersMap = usersData.reduce((acc: any, user: any) => {
                  acc[user.user_id] = user;
                  return acc;
                }, {});

                // Enhance reviews with user data
                reviews = reviews.map(review => {
                  if (review.user_id && usersMap[review.user_id]) {
                    review.user_name = usersMap[review.user_id].user_name;
                    review.user_email = usersMap[review.user_id].email;
                  }
                  return review;
                });
              }
            } catch {
            }
          }
        } catch (basicError) {
          console.error('Error with basic query:', basicError);

          // One final attempt with a very simple query
          try {
            reviews = await query(
              'SELECT * FROM reviews WHERE service_provider_id = ?',
              [providerId]
            ) as any[];
          } catch (finalError) {
            console.error('Final query attempt failed:', finalError);
            reviews = []; // Ensure we return an empty array rather than undefined
          }
        }
      }
    }

    // Calculate average rating - make sure we use the correct parameter type
    const providerIdParam = isNaN(Number(providerId)) ? providerId : Number(providerId);


    const ratingResult = await query(
      `SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
       FROM reviews
       WHERE service_provider_id = ?`,
      [providerIdParam]
    ) as any[];

    // Ensure averageRating is a number
    let averageRating = 0;
    if (ratingResult[0]?.average_rating !== null && ratingResult[0]?.average_rating !== undefined) {
      // MySQL might return this as a string or special object, so ensure it's a number
      averageRating = typeof ratingResult[0].average_rating === 'number'
        ? ratingResult[0].average_rating
        : parseFloat(ratingResult[0].average_rating) || 0;
    }

    const totalReviews = parseInt(ratingResult[0]?.total_reviews) || 0;


    return NextResponse.json({
      reviews,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while fetching reviews'
    }, { status: 500 });
  }
}
