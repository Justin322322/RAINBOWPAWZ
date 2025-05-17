import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get provider ID from the request query parameters
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const statusFilter = url.searchParams.get('status') || 'all';
    const searchTerm = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!providerId) {
      return NextResponse.json({
        error: 'Provider ID is required'
      }, { status: 400 });
    }

    // First, check which table structure is available
    const tablesCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_bookings', 'bookings')
    `;
    const tablesResult = await query(tablesCheckQuery) as any[];
    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());

    const useServiceBookings = tableNames.includes('service_bookings');
    console.log(`Using ${useServiceBookings ? 'service_bookings' : 'bookings'} table for cremation bookings`);

    // First, get the service packages for this provider
    const servicePackagesQuery = `
      SELECT id FROM service_packages WHERE service_provider_id = ?
    `;
    const servicePackages = await query(servicePackagesQuery, [providerId]) as any[];

    if (!servicePackages || servicePackages.length === 0) {
      return NextResponse.json({
        bookings: [],
        stats: {
          totalBookings: 0,
          scheduled: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          totalRevenue: 0
        }
      });
    }

    // Extract package IDs
    const packageIds = servicePackages.map((pkg: any) => pkg.id);

    // Build the SQL query with package IDs and filters
    let sql;
    const queryParams: any[] = [];

    if (useServiceBookings) {
      // Using service_bookings table
      sql = `
        SELECT sb.id, sb.status, sb.booking_date, sb.booking_time, sb.special_requests as notes,
               sb.created_at, sb.pet_name, sb.pet_type, sb.cause_of_death,
               sb.pet_image_url, sb.payment_method, sb.delivery_option, sb.delivery_distance,
               sb.delivery_fee, sb.price,
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
               sp.id as package_id, sp.name as service_name, sp.processing_time
        FROM service_bookings sb
        JOIN users u ON sb.user_id = u.id
        LEFT JOIN service_packages sp ON sb.package_id = sp.id
        WHERE (sb.package_id IN (?) OR sb.provider_id = ?)
        AND sb.status NOT IN ('completed', 'cancelled')
      `;
      queryParams.push(packageIds, providerId);
    } else {
      // Using traditional bookings table
      sql = `
        SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes,
               b.created_at, p.name as pet_name, p.species as pet_type, p.image_url as pet_image_url,
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
               sp.id as package_id, sp.name as service_name, sp.price, sp.processing_time
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN pets p ON p.user_id = u.id AND p.created_at <= DATE_ADD(b.created_at, INTERVAL 5 SECOND)
        JOIN service_packages sp ON b.business_service_id = sp.id
        WHERE b.business_service_id IN (?)
        AND b.status NOT IN ('completed', 'cancelled')
        GROUP BY b.id
      `;
      queryParams.push(packageIds);
    }

    // Add status filter if not 'all'
    if (statusFilter !== 'all') {
      sql += ' AND status = ?';
      queryParams.push(statusFilter);
    }

    // Add search term if provided
    if (searchTerm) {
      if (useServiceBookings) {
        sql += ` AND (
          pet_name LIKE ? OR
          u.first_name LIKE ? OR
          u.last_name LIKE ? OR
          sb.id LIKE ?
        )`;
      } else {
        sql += ` AND (
          u.first_name LIKE ? OR
          u.last_name LIKE ? OR
          b.id LIKE ?
        )`;
      }
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Add order by and limit
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Execute the query
    console.log('Executing query:', sql);
    console.log('With params:', queryParams);
    const bookings = await query(sql, queryParams) as any[];

    // Get booking stats - adjust queries based on the table being used
    let statsQueries;

    if (useServiceBookings) {
      statsQueries = {
        total: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?)`,
        pending: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'pending'`,
        confirmed: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'confirmed'`,
        inProgress: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'in_progress'`,
        completed: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'completed'`,
        cancelled: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'cancelled'`
      };
    } else {
      statsQueries = {
        total: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?)`,
        pending: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'pending'`,
        confirmed: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'confirmed'`,
        inProgress: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'in_progress'`,
        completed: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'completed'`,
        cancelled: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'cancelled'`
      };
    }

    const stats: Record<string, number> = {};

    for (const [key, sqlQuery] of Object.entries(statsQueries)) {
      const statsParams = useServiceBookings ? [packageIds, providerId] : [packageIds];
      const result = await query(sqlQuery, statsParams) as any[];
      stats[key] = result[0]?.count || 0;
    }

    // Calculate total revenue from the bookings
    const totalRevenue = bookings.reduce((total: number, booking: any) => {
      if (booking.status === 'completed') {
        return total + (booking.price || 0);
      }
      return total;
    }, 0);

    // Format the bookings data for response
    const formattedBookings = bookings.map((booking: any) => ({
      id: booking.id,
      petName: booking.pet_name || 'Unknown',
      petType: booking.pet_type || 'Unknown',
      causeOfDeath: booking.cause_of_death || 'Not specified',
      petImageUrl: booking.pet_image_url || null,
      owner: {
        name: `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Unknown',
        email: booking.email || 'Not provided',
        phone: booking.phone || 'Not provided'
      },
      service: booking.service_name || 'Unknown Service',
      package: booking.service_name || 'Unknown Package',
      status: booking.status || 'pending',
      scheduledDate: booking.booking_date ? formatDate(booking.booking_date) : 'Not scheduled',
      scheduledTime: booking.booking_time ? formatTime(booking.booking_time) : 'Not specified',
      notes: booking.notes || 'No special notes',
      price: booking.price || 0,
      paymentMethod: booking.payment_method || 'cash',
      deliveryOption: booking.delivery_option || 'pickup',
      deliveryDistance: booking.delivery_distance || 0,
      deliveryFee: booking.delivery_fee || 0,
      createdAt: formatDate(booking.created_at)
    }));

    return NextResponse.json({
      bookings: formattedBookings,
      stats: {
        totalBookings: stats.total,
        scheduled: stats.confirmed || 0,
        inProgress: stats.inProgress || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        pending: stats.pending || 0,
        totalRevenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching cremation bookings:', error);
    return NextResponse.json({
      error: 'Failed to fetch bookings data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      providerId,
      packageId,
      bookingDate,
      bookingTime,
      specialRequests,
      petId,
      petName,
      petType,
      petImageUrl,
      causeOfDeath,
      paymentMethod,
      deliveryOption,
      deliveryAddress,
      deliveryDistance,
      deliveryFee,
      price
    } = body;

    // Validate required fields
    const requiredFields = [];
    if (!userId) requiredFields.push('userId');
    if (!providerId) requiredFields.push('providerId');
    if (!packageId) requiredFields.push('packageId');
    if (!price) requiredFields.push('price');
    if (!petName) requiredFields.push('petName');
    if (!petType) requiredFields.push('petType');
    if (!bookingDate) requiredFields.push('bookingDate');
    if (!bookingTime) requiredFields.push('bookingTime');

    // Log the userId for debugging
    console.log('Creating booking with userId:', userId, 'type:', typeof userId);

    if (requiredFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${requiredFields.join(', ')} are required`,
        missingFields: requiredFields
      }, { status: 400 });
    }

    // Validate delivery option if selected
    if (deliveryOption === 'delivery' && (!deliveryAddress || deliveryAddress.trim() === '')) {
      return NextResponse.json({
        error: 'A valid delivery address is required when delivery option is selected. Please update your profile with a complete address.',
        missingFields: ['deliveryAddress']
      }, { status: 400 });
    }

    // Check if the service_bookings table exists
    const tableExistsQuery = `
      SELECT COUNT(*) as tableExists
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'service_bookings'
    `;

    const tableExistsResult = await query(tableExistsQuery) as any[];
    const tableExists = tableExistsResult[0]?.tableExists > 0;

    if (!tableExists) {
      return NextResponse.json({
        error: 'Database configuration issue',
        message: 'The service_bookings table does not exist. Please run the database migration first.'
      }, { status: 500 });
    }

    // Get all columns from the service_bookings table to ensure we're using the right schema
    const columnsQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_bookings'
    `;

    const columnsResult = await query(columnsQuery) as any[];
    const columns = columnsResult.map((col: any) => col.COLUMN_NAME.toLowerCase());

    // Check for required columns
    const requiredColumns = ['user_id', 'provider_id', 'package_id', 'booking_date', 'booking_time', 'price'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col.toLowerCase()));

    if (missingColumns.length > 0) {
      return NextResponse.json({
        error: 'Database schema issue',
        message: `The service_bookings table is missing required columns: ${missingColumns.join(', ')}. Please run the database migration.`
      }, { status: 500 });
    }

    // Build the insert query dynamically based on the available columns
    const availableColumns = [];
    const placeholders = [];
    const values = [];

    // Always include these required fields
    availableColumns.push('user_id', 'provider_id', 'package_id', 'booking_date', 'booking_time', 'price');
    placeholders.push('?', '?', '?', '?', '?', '?');

    // Convert userId to number if it's a string and can be parsed as a number
    let userIdValue = userId;
    if (typeof userId === 'string' && !isNaN(Number(userId))) {
      userIdValue = Number(userId);
      console.log('Converted userId to number for database insertion:', userIdValue);
    }

    values.push(
      userIdValue,
      providerId,
      packageId,
      bookingDate || null,
      bookingTime || null,
      price
    );

    // Add optional fields if they exist in the schema
    if (columns.includes('pet_id') && petId) {
      availableColumns.push('pet_id');
      placeholders.push('?');
      values.push(petId);
    }

    if (columns.includes('pet_name') && petName) {
      availableColumns.push('pet_name');
      placeholders.push('?');
      values.push(petName);
    }

    if (columns.includes('pet_type') && petType) {
      availableColumns.push('pet_type');
      placeholders.push('?');
      values.push(petType);
    }

    // Handle pet image URL with more flexibility
    if (columns.includes('pet_image_url')) {
      availableColumns.push('pet_image_url');
      placeholders.push('?');
      values.push(petImageUrl || null);
    }

    if (columns.includes('cause_of_death') && causeOfDeath) {
      availableColumns.push('cause_of_death');
      placeholders.push('?');
      values.push(causeOfDeath);
    }

    // Handle special requests with more flexibility
    if (columns.includes('special_requests')) {
      availableColumns.push('special_requests');
      placeholders.push('?');
      values.push(specialRequests || null);
    }

    if (columns.includes('payment_method')) {
      availableColumns.push('payment_method');
      placeholders.push('?');
      values.push(paymentMethod || 'cash');
    }

    // Add payment_status if the column exists
    if (columns.includes('payment_status')) {
      availableColumns.push('payment_status');
      placeholders.push('?');
      // If payment method is GCash, automatically set payment status to 'paid'
      // Otherwise, set it to 'not_paid' by default
      values.push(paymentMethod === 'gcash' ? 'paid' : 'not_paid');
    }

    if (columns.includes('delivery_option')) {
      availableColumns.push('delivery_option');
      placeholders.push('?');
      values.push(deliveryOption || 'pickup');
    }

    if (columns.includes('delivery_address') && deliveryAddress) {
      availableColumns.push('delivery_address');
      placeholders.push('?');
      values.push(deliveryAddress);
    }

    if (columns.includes('delivery_distance')) {
      availableColumns.push('delivery_distance');
      placeholders.push('?');
      values.push(deliveryDistance || 0);
    }

    if (columns.includes('delivery_fee')) {
      availableColumns.push('delivery_fee');
      placeholders.push('?');
      values.push(deliveryFee || 0);
    }

    // Build the final query
    const insertQuery = `
      INSERT INTO service_bookings (
        ${availableColumns.join(', ')}
      ) VALUES (${placeholders.join(', ')})
    `;

    const result = await query(insertQuery, values) as any;

    if (!result.insertId) {
      throw new Error('Failed to insert booking record');
    }

    // Return created booking data
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: result.insertId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating cremation booking:', error);

    // Check for specific database errors
    if (error instanceof Error) {
      // Handle MySQL specific errors
      const mysqlError = error as any;

      if (mysqlError.code === 'ER_NO_REFERENCED_ROW_2') {
        // Foreign key constraint error
        return NextResponse.json({
          error: 'Invalid reference: One of the IDs provided does not exist in the database',
          message: 'The provider, package, or user ID is invalid',
          code: mysqlError.code
        }, { status: 400 });
      }

      if (mysqlError.code === 'ER_DUP_ENTRY') {
        // Duplicate entry error
        return NextResponse.json({
          error: 'Duplicate booking',
          message: 'A booking with these details already exists',
          code: mysqlError.code
        }, { status: 409 });
      }

      if (mysqlError.code === 'ER_NO_SUCH_TABLE') {
        // Table doesn't exist
        return NextResponse.json({
          error: 'Database configuration issue',
          message: 'The required database tables are not set up correctly',
          code: mysqlError.code
        }, { status: 500 });
      }
    }

    // Generic error response
    return NextResponse.json({
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeString: string): string {
  if (!timeString) return '';

  // Handle SQL time format (HH:MM:SS)
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}