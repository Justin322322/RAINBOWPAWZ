import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// POST endpoint to create a new review
export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tokenUserId, accountType] = authToken.split('_');

    const body = await request.json();
    const { booking_id, user_id, service_provider_id, rating, comment } = body;

    // Validate required fields
    if (!booking_id || !user_id || !service_provider_id || !rating) {
      return NextResponse.json({
        error: 'Booking ID, User ID, Service Provider ID, and Rating are required'
      }, { status: 400 });
    }

    // Validate rating is between 1 and 5
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    // Check if the user has already reviewed this booking
    const existingReviews = await query(
      'SELECT id FROM reviews WHERE booking_id = ? AND user_id = ?',
      [booking_id, user_id]
    ) as any[];

    if (existingReviews && existingReviews.length > 0) {
      return NextResponse.json({
        error: 'You have already reviewed this booking. Once a review is submitted, it cannot be edited.'
      }, { status: 400 });
    }

    // Check if the booking was completed more than 5 days ago
    const bookingDateResult = await query(
      'SELECT booking_date, status, updated_at FROM service_bookings WHERE id = ? AND user_id = ?',
      [booking_id, user_id]
    ) as any[];

    if (bookingDateResult && bookingDateResult.length > 0) {
      const bookingDate = new Date(bookingDateResult[0].booking_date);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      if (bookingDate < fiveDaysAgo) {
        return NextResponse.json({
          error: 'Reviews can only be submitted within 5 days of the booking completion date.'
        }, { status: 400 });
      }
    }

    // Check if the booking exists and is completed
    let bookingResult: any[] = [];

    // Check which tables exist in the database
    try {
      const tablesResult = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('service_bookings')
      `) as any[];

      const existingTables = new Set(tablesResult.map((row: any) => row.TABLE_NAME));
      console.log('Existing tables for review submission:', Array.from(existingTables));

      if (existingTables.has('service_bookings')) {
        try {
          bookingResult = await query(
            'SELECT status FROM service_bookings WHERE id = ? AND user_id = ?',
            [booking_id, user_id]
          ) as any[];
          console.log('Found booking in service_bookings:', bookingResult.length > 0);
        } catch (error) {
          console.log('Error checking service_bookings table:', error);
        }
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    }

    // If still not found, return error
    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found or does not belong to this user'
      }, { status: 404 });
    }

    if (bookingResult[0].status !== 'completed') {
      return NextResponse.json({
        error: 'You can only review completed bookings'
      }, { status: 400 });
    }

    // Make sure the reviews table exists
    try {
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
    } catch (error) {
      console.error('Error creating reviews table:', error);
    }

    // Calculate expiration date (5 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 5);

    // Format expiration date for MySQL
    const formattedExpirationDate = expirationDate.toISOString().slice(0, 19).replace('T', ' ');

    // Check if the expiration_date column exists
    let hasExpirationColumn = false;
    try {
      const columnsResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
        AND COLUMN_NAME = 'expiration_date'
      `) as any[];

      hasExpirationColumn = columnsResult && columnsResult.length > 0;
    } catch (error) {
      console.error('Error checking for expiration_date column:', error);
    }

    // Insert the review with or without expiration date based on column existence
    let result;
    if (hasExpirationColumn) {
      result = await query(
        `INSERT INTO reviews (user_id, service_provider_id, booking_id, rating, comment, expiration_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, service_provider_id, booking_id, rating, comment || null, formattedExpirationDate]
      ) as any;
    } else {
      result = await query(
        `INSERT INTO reviews (user_id, service_provider_id, booking_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [user_id, service_provider_id, booking_id, rating, comment || null]
      ) as any;
    }

    // Create a notification for the service provider
    try {
      // Check if the notifications table exists
      const tablesResult = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('notifications', 'businesses')
      `) as any[];

      const existingTables = new Set(tablesResult.map((row: any) => row.TABLE_NAME));
      console.log('Existing tables for notifications:', Array.from(existingTables));

      if (!existingTables.has('notifications')) {
        console.log('Notifications table does not exist, skipping notification');
        return NextResponse.json({
          success: true,
          reviewId: result.insertId,
          message: 'Review created successfully'
        });
      }

      // Get the provider's user_id from businesses table
      let providerUserId: number | null = null;

      if (existingTables.has('businesses')) {
        const businessResult = await query(
          'SELECT user_id FROM businesses WHERE id = ?',
          [service_provider_id]
        ) as any[];

        if (businessResult && businessResult.length > 0) {
          providerUserId = businessResult[0].user_id;
          console.log('Found provider user ID from businesses table:', providerUserId);
        }
      }

      // If we couldn't find the provider user ID, try the service_providers table as fallback
      if (!providerUserId) {
        try {
          const providerResult = await query(
            'SELECT user_id FROM service_providers WHERE provider_id = ?',
            [service_provider_id]
          ) as any[];

          if (providerResult && providerResult.length > 0) {
            providerUserId = providerResult[0].user_id;
            console.log('Found provider user ID from service_providers table:', providerUserId);
          }
        } catch (error) {
          console.log('Error checking service_providers table:', error);
        }
      }

      if (providerUserId) {
        // Get the user's name
        const userResult = await query(
          'SELECT first_name, last_name FROM users WHERE user_id = ?',
          [user_id]
        ) as any[];

        const userName = userResult && userResult.length > 0
          ? `${userResult[0].first_name} ${userResult[0].last_name}`
          : 'A customer';

        // Create the notification
        await query(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, ?, ?, ?, ?)`,
          [
            providerUserId,
            'New Review Received',
            `${userName} left a ${rating}-star review for your service.`,
            'info',
            '/cremation/reviews'
          ]
        );
        console.log('Created notification for provider user ID:', providerUserId);
      } else {
        console.log('Could not find provider user ID for notification');
      }
    } catch (notificationError) {
      // Log the error but continue with the process
      console.error('Error creating notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      reviewId: result.insertId,
      message: 'Review created successfully'
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while creating the review'
    }, { status: 500 });
  }
}
