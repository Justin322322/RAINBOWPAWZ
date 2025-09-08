import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { createBookingNotification, scheduleBookingReminders } from '@/utils/comprehensiveNotificationService';

// Helper function to ensure payment_receipts table exists
async function ensurePaymentReceiptsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      receipt_path VARCHAR(500),
      notes TEXT,
      status ENUM('awaiting', 'confirmed', 'rejected') DEFAULT 'awaiting',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_by INT NULL,
      confirmed_at TIMESTAMP NULL,
      rejection_reason TEXT,
      INDEX idx_booking_id (booking_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  try {
    await query(createTableQuery);
  } catch (error) {
    console.error('Error creating payment_receipts table:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: GET /api/cremation/bookings called');

    // Get provider ID from the request query parameters
    const requestUrl = new URL(request.url);
    const providerId = requestUrl.searchParams.get('providerId');
    const statusFilter = requestUrl.searchParams.get('status') || 'all';
    const searchTerm = requestUrl.searchParams.get('search') || '';
    const paymentStatusFilter = requestUrl.searchParams.get('paymentStatus') || 'all';
    const limit = parseInt(requestUrl.searchParams.get('limit') || '50');
    const offset = parseInt(requestUrl.searchParams.get('offset') || '0');

    console.log('🔍 DEBUG: Query parameters:', { providerId, statusFilter, searchTerm, paymentStatusFilter, limit, offset });

    if (!providerId) {
      return NextResponse.json({
        error: 'Provider ID is required'
      }, { status: 400 });
    }

    console.log('🔍 DEBUG: Checking table structure...');

    // First, check which table structure is available
    const tablesCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('bookings', 'bookings')
    `;

    console.log('🔍 DEBUG: Executing table check query...');
    const tablesResult = await query(tablesCheckQuery) as any[];
    console.log('🔍 DEBUG: Table check result:', tablesResult);

    const tableNames = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    console.log('🔍 DEBUG: Available tables:', tableNames);

    const useServiceBookings = tableNames.includes('bookings');
    console.log('🔍 DEBUG: Using bookings table:', useServiceBookings);

    console.log('🔍 DEBUG: Fetching service packages for provider:', providerId);

    // First, get the service packages for this provider
    const servicePackagesQuery = `
      SELECT package_id FROM service_packages WHERE provider_id = ?
    `;
    console.log('🔍 DEBUG: Executing service packages query...');
    const servicePackages = await query(servicePackagesQuery, [providerId]) as any[];
    console.log('🔍 DEBUG: Service packages result:', servicePackages);

    if (!servicePackages || servicePackages.length === 0) {
      console.log('⚠️ DEBUG: No service packages found for provider');
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
    const packageIds = servicePackages.map((pkg: any) => pkg.package_id);

    // Build the SQL query with package IDs and filters
    let sql;
    const queryParams: any[] = [];

    console.log('🔍 DEBUG: Checking payment_status column...');

    // Check if payment_status column exists in bookings table
    const columnsQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
    `;

    console.log('🔍 DEBUG: Executing columns query...');
    const columnsResult = await query(columnsQuery) as any[];
    console.log('🔍 DEBUG: Columns result:', columnsResult);

    const columns = columnsResult.map((col: any) => col.COLUMN_NAME.toLowerCase());
    console.log('🔍 DEBUG: Available columns:', columns);

    const hasPaymentStatusColumn = columns.includes('payment_status');
    console.log('🔍 DEBUG: Has payment_status column:', hasPaymentStatusColumn);

    if (useServiceBookings) {
      // Using bookings table
      // Create placeholders for each package ID
      const packagePlaceholders = packageIds.map(() => '?').join(',');

      // Build the SQL query based on available columns
      sql = `
        SELECT sb.id, sb.status, sb.booking_date, sb.booking_time, sb.special_requests as notes,
               sb.created_at, sb.pet_name, sb.pet_type, sb.cause_of_death,
               sb.pet_image_url, sb.payment_method, ${hasPaymentStatusColumn ? 'sb.payment_status,' : "'not_paid' as payment_status,"} sb.delivery_option, sb.delivery_distance,
               sb.delivery_fee, sb.total_price as price,
               u.user_id as user_id, u.first_name, u.last_name, u.email, u.phone as phone,
               sp.package_id as package_id, sp.name as service_name, sp.processing_time
        FROM bookings sb
        JOIN users u ON sb.user_id = u.user_id
        LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
        WHERE (sb.package_id IN (${packagePlaceholders}) OR sb.provider_id = ?)
        AND sb.status NOT IN ('completed', 'cancelled')
      `;

      // Add each package ID as a separate parameter, then add providerId
      queryParams.push(...packageIds, providerId);
    } else {
      // Using traditional bookings table
      // Create placeholders for each package ID
      const packagePlaceholders = packageIds.map(() => '?').join(',');

      sql = `
        SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes,
               b.created_at, p.name as pet_name, p.species as pet_type, p.image_url as pet_image_url,
               u.user_id as user_id, u.first_name, u.last_name, u.email, u.phone as phone,
               sp.package_id as package_id, sp.name as service_name, sp.price, sp.processing_time
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN pets p ON p.user_id = u.user_id AND p.created_at <= DATE_ADD(b.created_at, INTERVAL 5 SECOND)
        JOIN service_packages sp ON b.package_id = sp.package_id
        WHERE b.package_id IN (${packagePlaceholders})
        AND b.status NOT IN ('completed', 'cancelled')
        GROUP BY b.id
      `;

      // Add each package ID as a separate parameter
      queryParams.push(...packageIds);
    }

    // Add status filter if not 'all'
    if (statusFilter !== 'all') {
      sql += ' AND status = ?';
      queryParams.push(statusFilter);
    }

    // Add payment status filter if not 'all'
    if (paymentStatusFilter !== 'all') {
      if (paymentStatusFilter === 'gcash') {
        // Special case for GCash payments
        sql += ' AND payment_method = ?';
        queryParams.push('gcash');
      } else if (hasPaymentStatusColumn) {
        // For other payment statuses, only if the column exists
        sql += ' AND payment_status = ?';
        queryParams.push(paymentStatusFilter);
      }
      // If payment_status column doesn't exist, we skip this filter
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
        const searchPattern = `%${searchTerm}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      } else {
        sql += ` AND (
          u.first_name LIKE ? OR
          u.last_name LIKE ? OR
          b.id LIKE ?
        )`;
        const searchPattern = `%${searchTerm}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }
    }

    // Add order by and limit (inline to avoid MySQL prepared statement issues)
    const limitInt = Number(limit);
    const offsetInt = Number(offset);
    sql += ` ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;

    console.log('🔍 DEBUG: Final SQL query:', sql);
    console.log('🔍 DEBUG: Query parameters:', queryParams);

    // Execute the query
    console.log('🔍 DEBUG: Executing main bookings query...');
    const bookings = await query(sql, queryParams) as any[];
    console.log('🔍 DEBUG: Bookings query result count:', bookings?.length || 0);

    // Get booking stats - adjust queries based on the table being used
    let statsQueries;

    // Create placeholders for each package ID
    const packagePlaceholders = packageIds.map(() => '?').join(',');

    if (useServiceBookings) {
      statsQueries = {
        total: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?)`,
        pending: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'pending'`,
        confirmed: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'confirmed'`,
        inProgress: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'in_progress'`,
        completed: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'completed'`,
        cancelled: `SELECT COUNT(*) as count FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'cancelled'`,
        totalRevenue: `SELECT COALESCE(SUM(total_price + IFNULL(delivery_fee, 0)), 0) as revenue FROM bookings WHERE (package_id IN (${packagePlaceholders}) OR provider_id = ?) AND status = 'completed'`
      };
    } else {
      statsQueries = {
        total: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (${packagePlaceholders})`,
        pending: `SELECT COUNT(*) as count FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'pending'`,
        confirmed: `SELECT COUNT(*) as count FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'confirmed'`,
        inProgress: `SELECT COUNT(*) as count FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'in_progress'`,
        completed: `SELECT COUNT(*) as count FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'completed'`,
        cancelled: `SELECT COUNT(*) as count FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'cancelled'`,
        totalRevenue: `SELECT COALESCE(SUM(total_price), 0) as revenue FROM bookings WHERE package_id IN (${packagePlaceholders}) AND status = 'completed'`
      };
    }

    const stats: Record<string, number> = {};

    for (const [key, sqlQuery] of Object.entries(statsQueries)) {
      let statsParams: (string | number)[] = [];
      if (useServiceBookings) {
        // For bookings, we need to add each package ID and the provider ID
        statsParams = [...packageIds, providerId];
      } else {
        // For regular bookings, we just need the package IDs
        statsParams = packageIds;
      }

      const result = await query(sqlQuery as string, statsParams) as any[];
      if (key === 'totalRevenue') {
        stats[key] = parseFloat(result[0]?.revenue || '0');
      } else {
        stats[key] = result[0]?.count || 0;
      }
    }

    // Calculate total revenue from the bookings
    const _totalRevenue = bookings.reduce((total: number, booking: any) => {
      if (booking.status === 'completed') {
        return total + (booking.price || 0);
      }
      return total;
    }, 0);

    // Fetch add-ons for each booking
    const bookingIds = bookings.map((booking: any) => booking.id);
    let bookingAddOns: Record<number, any[]> = {};

    if (bookingIds.length > 0) {
      try {
        // Check if booking_addons table exists
        const addonsTableCheck = await query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'booking_addons'"
        ) as any[];

        if (addonsTableCheck && addonsTableCheck[0].count > 0) {
          // Fetch add-ons for all bookings in one query
          if (bookingIds.length > 0) {
            // SECURITY FIX: Create parameterized query for booking add-ons
            const bookingPlaceholders = bookingIds.map(() => '?').join(',');

            const addOnsQuery = `
              SELECT booking_id, addon_name, addon_price, is_selected
              FROM booking_addons
              WHERE booking_id IN (${bookingPlaceholders})
              AND is_selected = 1
            `;

            const addOns = await query(addOnsQuery, bookingIds) as any[];

            // Group add-ons by booking_id
            bookingAddOns = addOns.reduce((acc: Record<number, any[]>, addon: any) => {
              if (!acc[addon.booking_id]) {
                acc[addon.booking_id] = [];
              }
              acc[addon.booking_id].push({
                name: addon.addon_name,
                price: parseFloat(addon.addon_price) || 0
              });
              return acc;
            }, {});
          }
        }
      } catch (error) {
        // Continue without add-ons if there's an error
        console.error('Error fetching booking add-ons:', error);
      }
    }

    // Fetch payment receipts for all bookings (graceful if table not present)
    let paymentReceipts: Record<number, any> = {};
    if (bookingIds.length > 0) {
      try {
        await ensurePaymentReceiptsTable();

        // Verify table exists before querying to avoid errors when DDL is blocked
        let tableExists = false;
        try {
          const t = await query("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'") as any[];
          tableExists = (t?.[0]?.c || 0) > 0;
        } catch {}

        let receipts: any[] = [];
        if (tableExists) {
          const receiptsQuery = `
            SELECT booking_id, receipt_path, notes, status, uploaded_at, confirmed_by, confirmed_at, rejection_reason
            FROM payment_receipts
            WHERE booking_id IN (${bookingIds.map(() => '?').join(',')})
            ORDER BY uploaded_at DESC
          `;
          receipts = await query(receiptsQuery, bookingIds) as any[];
        } else {
          // Fallback: parse from special_requests where we appended "Receipt: <url>"
          const specials = await query(
            `SELECT id, special_requests FROM bookings WHERE id IN (${bookingIds.map(() => '?').join(',')})`,
            bookingIds
          ) as any[];
          receipts = (specials || []).map((r: any) => {
            const text: string = r?.special_requests || '';
            const m = text.match(/Receipt:\s*(\S+)/i);
            return m ? { booking_id: r.id, receipt_path: m[1], status: 'awaiting' } : null;
          }).filter(Boolean) as any[];
        }

        // Group receipts by booking_id (take the latest one)
        paymentReceipts = receipts.reduce((acc: Record<number, any>, receipt: any) => {
          if (!acc[receipt.booking_id]) {
            acc[receipt.booking_id] = receipt;
          }
          return acc;
        }, {});
      } catch (error) {
        console.error('Error fetching payment receipts:', error);
      }
    }

    // Format the bookings data for response
    const formattedBookings = bookings.map((booking: any) => {
      // Get add-ons for this booking
      const addOns = bookingAddOns[booking.id] || [];

      // Calculate add-ons total price
      const addOnsTotal = addOns.reduce((total: number, addon: any) => total + addon.price, 0);

      // Get payment receipt info
      const paymentReceipt = paymentReceipts[booking.id];

      // Determine payment status with manual payment logic
      let paymentStatus = booking.payment_method === 'gcash' ? 'paid' : (hasPaymentStatusColumn ? (booking.payment_status || 'not_paid') : 'not_paid');

      // If payment method is qr_transfer and there's a receipt, update status accordingly
      if (booking.payment_method === 'qr_transfer') {
        if (paymentReceipt) {
          if (paymentReceipt.status === 'confirmed') {
            paymentStatus = 'paid';
          } else if (paymentReceipt.status === 'awaiting') {
            paymentStatus = 'awaiting_payment_confirmation';
          } else if (paymentReceipt.status === 'rejected') {
            paymentStatus = 'payment_rejected';
          }
        } else {
          paymentStatus = 'awaiting_payment_confirmation';
        }
      }

      return {
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
        basePrice: (booking.price || 0) - addOnsTotal - (booking.delivery_fee || 0),
        paymentMethod: booking.payment_method || 'cash',
        paymentStatus: paymentStatus,
        deliveryOption: booking.delivery_option || 'pickup',
        deliveryDistance: booking.delivery_distance || 0,
        deliveryFee: booking.delivery_fee || 0,
        addOns: addOns,
        addOnsTotal: addOnsTotal,
        createdAt: formatDate(booking.created_at),
        paymentReceipt: paymentReceipt ? {
          receiptPath: paymentReceipt.receipt_path,
          notes: paymentReceipt.notes,
          status: paymentReceipt.status,
          uploadedAt: formatDate(paymentReceipt.uploaded_at),
          rejectionReason: paymentReceipt.rejection_reason
        } : null
      };
    });

    return NextResponse.json({
      bookings: formattedBookings,
      stats: {
        totalBookings: stats.total,
        scheduled: stats.confirmed || 0,
        inProgress: stats.inProgress || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        pending: stats.pending || 0,
        totalRevenue: stats.totalRevenue || 0
      }
    });
  } catch (error) {
    console.error('❌ ERROR in GET /api/cremation/bookings:', error);
    console.error('❌ ERROR details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code || 'NO_CODE'
    });

    // Return more detailed error information for debugging
    return NextResponse.json({
      error: 'Failed to fetch bookings data',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      details: JSON.stringify(error),
      debug_info: {
        providerId: null, // Will be available in production logs
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await query('SELECT 1 as connection_test');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        message: 'Unable to connect to the database. Please try again later.',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

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
      price,
      selectedAddOns
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

    // PlanetScale: manually validate references since FKs may be unenforced
    try {
      const [userExists] = await query(
        'SELECT COUNT(*) as c FROM users WHERE user_id = ? LIMIT 1',
        [userId]
      ) as any[];
      if (!userExists || Number(userExists.c) === 0) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
      }

      const [providerExists] = await query(
        'SELECT COUNT(*) as c FROM service_providers WHERE provider_id = ? LIMIT 1',
        [providerId]
      ) as any[];
      if (!providerExists || Number(providerExists.c) === 0) {
        return NextResponse.json({ error: 'Invalid providerId' }, { status: 400 });
      }

      const [packageExists] = await query(
        'SELECT COUNT(*) as c FROM service_packages WHERE package_id = ? LIMIT 1',
        [packageId]
      ) as any[];
      if (!packageExists || Number(packageExists.c) === 0) {
        return NextResponse.json({ error: 'Invalid packageId' }, { status: 400 });
      }
    } catch (refErr) {
      return NextResponse.json({ error: 'Reference validation failed', details: String(refErr) }, { status: 500 });
    }

    // Check if the bookings table exists
    const tableExistsQuery = `
      SELECT COUNT(*) as tableExists
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'bookings'
    `;

    const tableExistsResult = await query(tableExistsQuery) as any[];
    const tableExists = tableExistsResult[0]?.tableExists > 0;

    if (!tableExists) {
      return NextResponse.json({
        error: 'Database configuration issue',
        message: 'The bookings table does not exist. Please run the database migration first.'
      }, { status: 500 });
    }

    // Get all columns from the bookings table to ensure we're using the right schema
    const columnsQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
    `;

    const columnsResult = await query(columnsQuery) as any[];
    const columns = columnsResult.map((col: any) => col.COLUMN_NAME.toLowerCase());

    // Check for required columns
    const requiredColumns = ['user_id', 'provider_id', 'package_id', 'booking_date', 'booking_time', 'price'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col.toLowerCase()));

    if (missingColumns.length > 0) {
      return NextResponse.json({
        error: 'Database schema issue',
        message: `The bookings table is missing required columns: ${missingColumns.join(', ')}. Please run the database migration.`
      }, { status: 500 });
    }

    // Build the insert query dynamically based on the available columns
    const availableColumns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    // Always include these required fields - using consistent table structure
    availableColumns.push('user_id', 'provider_id', 'package_id', 'booking_date', 'booking_time', 'price');
    placeholders.push('?', '?', '?', '?', '?', '?');

    // Convert userId to number if it's a string and can be parsed as a number
    let userIdValue = userId;
    if (typeof userId === 'string' && !isNaN(Number(userId))) {
      userIdValue = Number(userId);
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
      // Always set payment status to 'not_paid' initially
      // Payment status will be updated to 'paid' after successful payment processing
      values.push('not_paid');
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

    if (columns.includes('status')) {
      availableColumns.push('status');
      placeholders.push('?');
      values.push('pending');
    }

    // Build the final query
    const insertQuery = `
      INSERT INTO bookings (
        ${availableColumns.join(', ')}
      ) VALUES (${placeholders.join(', ')})
    `;

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      const bookingResult = await transaction.query(insertQuery, values) as any;

      if (!bookingResult.insertId) {
        throw new Error('Failed to insert booking record');
      }

      const bookingId = bookingResult.insertId;

      // Insert selected add-ons if any
      if (selectedAddOns && selectedAddOns.length > 0) {
        try {
          // Check if booking_addons table exists
          const addonsTableCheck = await transaction.query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'booking_addons'"
          ) as any[];

          if (addonsTableCheck && addonsTableCheck[0].count > 0) {
            // booking_addons table exists, insert add-ons
            for (const addOn of selectedAddOns) {
              await transaction.query(`
                INSERT INTO booking_addons (
                  booking_id,
                  addon_name,
                  addon_price,
                  is_selected
                ) VALUES (?, ?, ?, ?)
              `, [
                bookingId,
                addOn.name,
                addOn.price,
                1 // is_selected = true
              ]);
            }
          } else {
            // Store add-ons as a JSON string in special_requests if booking_addons table doesn't exist
            const addOnsText = selectedAddOns.map((addon: any) =>
              `${addon.name} (₱${addon.price.toLocaleString()})`
            ).join(', ');

            const updatedSpecialRequests = specialRequests
              ? `${specialRequests}\n\nSelected Add-ons: ${addOnsText}`
              : `Selected Add-ons: ${addOnsText}`;

            await transaction.query(
              'UPDATE bookings SET special_requests = ? WHERE id = ?',
              [updatedSpecialRequests, bookingId]
            );
          }
        } catch (addOnError) {
          // Continue with the booking process even if add-ons fail
          console.error('Error inserting add-ons:', addOnError);
        }
      }

      return { bookingId };
    });

    // **🔥 FIX: Handle external operations outside transaction to avoid conflicts**
    const bookingId = result.bookingId;

    // Remove the booked time slot from normalized tables and update day availability
    try {
      const dateStr = String(bookingDate);
      const timeStr = String(bookingTime).substring(0, 5); // HH:MM

      // Delete the specific slot
      await query(
        `DELETE FROM availability_time_slots 
         WHERE provider_id = ? 
           AND availability_date = ? 
           AND start_time = STR_TO_DATE(?, '%H:%i') 
         LIMIT 1`,
        [providerId, dateStr, timeStr]
      );

      // Count remaining slots for that date
      const remainRows = await query(
        `SELECT COUNT(*) AS c 
           FROM availability_time_slots 
          WHERE provider_id = ? AND availability_date = ?`,
        [providerId, dateStr]
      ) as any[];
      const remaining = Number(remainRows?.[0]?.c || 0);

      // Update day availability: no slots -> mark unavailable; otherwise ensure available
      await query(
        `INSERT INTO provider_availability (provider_id, availability_date, is_available)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), updated_at = NOW()`,
        [providerId, dateStr, remaining > 0 ? 1 : 0]
      );
    } catch (timeSlotError) {
      // Log the error but don't fail the booking creation
      console.error('Error removing time slot after booking creation:', timeSlotError);
    }

    // Create booking notification and schedule reminders
    try {
      // Create booking created notification
      await createBookingNotification(bookingId, 'booking_created');

      // Schedule reminder notifications_unified if booking date is in the future
      if (bookingDate && bookingTime) {
        await scheduleBookingReminders(bookingId);
      }
    } catch (notificationError) {
      // Log notification errors but don't fail the booking creation
      console.error('Error creating booking notifications_unified:', notificationError);
    }

    // Create notification for the business user about the new pending booking
    try {
      // Get the provider user ID from the service_providers table
      const providerUserResult = await query(
        'SELECT user_id FROM service_providers WHERE provider_id = ?',
        [providerId]
      ) as any[];

      if (providerUserResult && providerUserResult.length > 0) {
        const providerUserId = providerUserResult[0].user_id;
        
        // Create notification for the business user
        const { createBusinessNotification } = await import('@/utils/businessNotificationService');
        await createBusinessNotification({
          userId: providerUserId,
          title: 'New Pending Booking',
          message: `You have received a new booking for ${petName}'s cremation service. Please review and confirm.`,
          type: 'info',
          link: `/cremation/bookings/${bookingId}`,
          shouldSendEmail: true,
          emailSubject: 'New Pending Booking - Action Required'
        });
      }
    } catch (notificationError) {
      console.error('Error creating pending booking notification:', notificationError);
      // Continue with booking creation even if notification fails
    }

    // Return created booking data
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: bookingId
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/cremation/bookings:', error);

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

      if (mysqlError.code === 'ECONNREFUSED') {
        // Connection refused
        return NextResponse.json({
          error: 'Database connection refused',
          message: 'Unable to connect to the database server. Please ensure MySQL is running.',
          code: mysqlError.code
        }, { status: 500 });
      }

      if (mysqlError.code === 'ER_ACCESS_DENIED_ERROR') {
        // Access denied
        return NextResponse.json({
          error: 'Database access denied',
          message: 'Database authentication failed. Please check credentials.',
          code: mysqlError.code
        }, { status: 500 });
      }

      if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST') {
        // Connection lost
        return NextResponse.json({
          error: 'Database connection lost',
          message: 'The database connection was lost during the operation. Please try again.',
          code: mysqlError.code
        }, { status: 500 });
      }

      // For any other database errors, return a generic response
      return NextResponse.json({
        error: 'Database operation failed',
        message: error.message || 'An unexpected database error occurred. Please try again.',
        code: mysqlError.code || 'UNKNOWN_ERROR'
      }, { status: 500 });
    }

    // For non-database errors
    return NextResponse.json({
      error: 'Failed to create booking',
      message: 'An unexpected error occurred while creating the booking. Please try again.',
      details: error instanceof Error ? error.message : String(error)
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