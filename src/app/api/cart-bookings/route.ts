import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// POST endpoint to create a new booking from cart
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Allow both fur_parent and user account types to create bookings
    if (accountType !== 'fur_parent' && accountType !== 'user') {
      return NextResponse.json({
        error: 'Only fur parent accounts can create bookings'
      }, { status: 403 });
    }

    // Get booking data from request body
    const body = await request.json();
    const {
      packageId,
      providerId,
      petId,
      quantity = 1,
      selectedAddOns = [],
      totalPrice,
      specialRequests = ''
    } = body;

    // Validate required fields
    if (!packageId || !providerId || !petId) {
      return NextResponse.json({
        error: 'Missing required fields: packageId, providerId, and petId are required'
      }, { status: 400 });
    }

    // Get package details to determine booking date and time
    const packageResult = await query(`
      SELECT
        processing_time,
        name
      FROM service_packages
      WHERE id = ? AND is_active = TRUE
    `, [packageId]) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found or is inactive'
      }, { status: 404 });
    }

    // Calculate booking date based on processing time
    const packageDetails = packageResult[0];
    const currentDate = new Date();
    let bookingDate = new Date(currentDate);

    // Add days based on processing time
    if (packageDetails.processing_time.includes('Same day')) {
      // Same day - use current date
    } else if (packageDetails.processing_time.includes('1-2')) {
      // Add 1 day
      bookingDate.setDate(bookingDate.getDate() + 1);
    } else if (packageDetails.processing_time.includes('2-3')) {
      // Add 2 days
      bookingDate.setDate(bookingDate.getDate() + 2);
    } else {
      // Default: add 1 day
      bookingDate.setDate(bookingDate.getDate() + 1);
    }

    // Format date for MySQL
    const formattedDate = bookingDate.toISOString().split('T')[0];

    // Default booking time (10:00 AM)
    const bookingTime = '10:00:00';

    // Check which table structure to use
    let bookingResult;

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // First, check if the bookings table has service_provider_id column
      const serviceProviderCheck = await query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'service_provider_id'"
      ) as any[];

      if (serviceProviderCheck && serviceProviderCheck.length > 0) {
        // Use the updated structure with service_provider_id and package_id
        bookingResult = await query(`
          INSERT INTO bookings (
            user_id,
            pet_id,
            service_provider_id,
            package_id,
            booking_date,
            booking_time,
            status,
            total_amount,
            special_requests,
            quantity
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `, [
          userId,
          petId,
          providerId,
          packageId,
          formattedDate,
          bookingTime,
          totalPrice || 0,
          specialRequests,
          quantity
        ]) as any;
      } else {
        // Check if the bookings table has business_service_id column
        const businessServiceCheck = await query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'business_service_id'"
        ) as any[];

        if (businessServiceCheck && businessServiceCheck.length > 0) {
          // Use the older structure with business_service_id
          bookingResult = await query(`
            INSERT INTO bookings (
              user_id,
              pet_id,
              business_service_id,
              booking_date,
              booking_time,
              status,
              total_amount,
              special_requests
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
          `, [
            userId,
            petId,
            packageId, // Use packageId as business_service_id
            formattedDate,
            bookingTime,
            totalPrice || 0,
            specialRequests
          ]) as any;
        } else {
          // If neither column exists, try a simple insert with minimal fields
          bookingResult = await query(`
            INSERT INTO bookings (
              user_id,
              pet_id,
              booking_date,
              booking_time,
              status,
              total_amount,
              special_requests
            ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
          `, [
            userId,
            petId,
            formattedDate,
            bookingTime,
            totalPrice || 0,
            specialRequests
          ]) as any;
        }
      }

      const bookingId = bookingResult.insertId;

      // Insert selected add-ons if any
      if (selectedAddOns && selectedAddOns.length > 0) {
        try {
          // Check if booking_addons table exists
          const addonsTableCheck = await query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'booking_addons'"
          ) as any[];

          if (addonsTableCheck && addonsTableCheck[0].count > 0) {
            // booking_addons table exists, insert add-ons
            for (const addOn of selectedAddOns) {
              // Extract add-on name and price
              let addOnName = addOn;
              let addOnPrice = null;

              const priceMatch = addOn.match(/\(\+₱([\d,]+)\)/);
              if (priceMatch) {
                addOnPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
                addOnName = addOn.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
              }

              await query(`
                INSERT INTO booking_addons (
                  booking_id,
                  addon_name,
                  addon_price
                ) VALUES (?, ?, ?)
              `, [
                bookingId,
                addOnName,
                addOnPrice
              ]);
            }
          } else {
            // Store add-ons as a JSON string in special_requests if booking_addons table doesn't exist
            const addOnsText = selectedAddOns.join(', ');
            const updatedSpecialRequests = specialRequests
              ? `${specialRequests}\n\nSelected Add-ons: ${addOnsText}`
              : `Selected Add-ons: ${addOnsText}`;

            await query(
              'UPDATE bookings SET special_requests = ? WHERE id = ?',
              [updatedSpecialRequests, bookingId]
            );
          }
        } catch (addOnError) {
          // Continue with the booking process even if add-ons fail
        }
      }

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({
        success: true,
        bookingId,
        message: 'Booking created successfully'
      });
    } catch (error) {
      // Rollback the transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
