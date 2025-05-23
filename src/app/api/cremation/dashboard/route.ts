import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get provider ID from the request query parameters
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({
        error: 'Provider ID is required'
      }, { status: 400 });
    }

    // Check if this is the dummy provider ID (999)
    const isDummyProvider = providerId === '999';

    // Get business information
    let providerInfo: any[] = [];

    if (!isDummyProvider) {
      providerInfo = await query(
        `SELECT name, provider_type, contact_first_name, contact_last_name
         FROM service_providers WHERE provider_id = ? LIMIT 1`,
        [providerId]
      ) as any[];

      if (!providerInfo || providerInfo.length === 0) {
        return NextResponse.json({
          error: 'Provider not found'
        }, { status: 404 });
      }
    } else {
      // For dummy provider, still query the table structure but use a non-existent ID
      // This ensures we're using the real table structure
      providerInfo = await query(
        `SELECT name, provider_type, contact_first_name, contact_last_name
         FROM service_providers WHERE provider_id = ? LIMIT 1`,
        [providerId]
      ) as any[];

      // If no provider found (which is expected), create a dummy one
      if (!providerInfo || providerInfo.length === 0) {
        providerInfo = [{
          name: 'Rainbow Paws Cremation Center',
          provider_type: 'cremation',
          contact_first_name: 'Justin',
          contact_last_name: 'Sibonga'
        }];
      }
    }

    // Get revenue data
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let revenueChange = 0;

    try {
      // Query for total revenue
      const revenueResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM payments
        WHERE provider_id = ?`,
        [providerId]
      ) as any[];

      totalRevenue = revenueResult[0]?.total_revenue || 0;

      // Query for monthly revenue
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const monthlyRevenueResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as monthly_revenue
        FROM payments
        WHERE provider_id = ? AND payment_date >= ?`,
        [providerId, firstDayOfMonth]
      ) as any[];

      monthlyRevenue = monthlyRevenueResult[0]?.monthly_revenue || 0;

      // Calculate revenue change (simplified for demo)
      revenueChange = totalRevenue > 0 ? 15 : 0; // Placeholder
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Continue with default values
    }

    // Get client data
    let newClients = 0;
    let clientsChange = 0;

    try {
      // Query for new clients in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newClientsResult = await query(`
        SELECT COUNT(DISTINCT user_id) as new_clients
        FROM bookings
        WHERE provider_id = ? AND created_at >= ?`,
        [providerId, thirtyDaysAgo]
      ) as any[];

      newClients = newClientsResult[0]?.new_clients || 0;

      // Calculate clients change (simplified for demo)
      clientsChange = newClients > 0 ? 20 : 0; // Placeholder
    } catch (error) {
      console.error('Error fetching client data:', error);
      // Continue with default values
    }

    // Get booking data
    let activeBookings = 0;
    let bookingsChange = 0;

    try {
      // Query for active bookings
      const activeBookingsResult = await query(`
        SELECT COUNT(*) as active_bookings
        FROM bookings
        WHERE provider_id = ? AND status IN ('pending', 'confirmed', 'in_progress')`,
        [providerId]
      ) as any[];

      activeBookings = activeBookingsResult[0]?.active_bookings || 0;

      // Calculate bookings change (simplified for demo)
      bookingsChange = activeBookings > 0 ? 25 : 0; // Placeholder
    } catch (error) {
      console.error('Error fetching booking data:', error);
      // Continue with default values
    }

    // Get rating data
    let avgRating = 0;
    let ratingChange = 0;

    try {
      // Query for average rating - use service_provider_id instead of provider_id
      const ratingResult = await query(`
        SELECT AVG(rating) as avg_rating
        FROM reviews
        WHERE service_provider_id = ?`,
        [providerId]
      ) as any[];

      avgRating = parseFloat(ratingResult[0]?.avg_rating || "0");

      // Calculate rating change (simplified for demo)
      ratingChange = avgRating > 0 ? 0.2 : 0; // Placeholder
    } catch (error) {
      console.error('Error fetching rating data:', error);
      // Continue with default values
    }

    // Get recent bookings
    let recentBookings: any[] = [];

    try {
      // Query for recent bookings - use correct column names
      recentBookings = await query(`
        SELECT b.booking_id as id, p.name as pet_name, p.species as pet_type,
               u.first_name, u.last_name,
               s.name as service_name, b.status, b.booking_date as scheduled_date,
               b.booking_time as scheduled_time, b.created_at
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.user_id
        LEFT JOIN pets p ON b.pet_id = p.pet_id
        LEFT JOIN service_packages s ON b.package_id = s.package_id
        WHERE b.provider_id = ?
        ORDER BY b.created_at DESC
        LIMIT 5`,
        [providerId]
      ) as any[];
    } catch (error) {
      console.error('Error fetching recent bookings:', error);
      // Continue with empty array
    }

    // If no bookings found for dummy provider, create sample data
    if (isDummyProvider && recentBookings.length === 0) {
      recentBookings = [
        {
          id: 1001,
          pet_name: 'Max',
          pet_type: 'Dog',
          first_name: 'John',
          last_name: 'Smith',
          service_name: 'Premium Cremation',
          status: 'completed',
          scheduled_date: '2023-06-15',
          scheduled_time: '10:00:00',
          created_at: '2023-06-10'
        },
        {
          id: 1002,
          pet_name: 'Luna',
          pet_type: 'Cat',
          first_name: 'Maria',
          last_name: 'Garcia',
          service_name: 'Standard Cremation',
          status: 'in_progress',
          scheduled_date: '2023-07-05',
          scheduled_time: '14:30:00',
          created_at: '2023-07-01'
        },
        {
          id: 1003,
          pet_name: 'Buddy',
          pet_type: 'Dog',
          first_name: 'David',
          last_name: 'Johnson',
          service_name: 'Premium Cremation',
          status: 'pending',
          scheduled_date: '2023-07-12',
          scheduled_time: '11:00:00',
          created_at: '2023-07-08'
        }
      ];
    }

    // Get service packages
    let servicePackages: any[] = [];

    try {
      // Query for service packages - use correct column names
      servicePackages = await query(`
        SELECT package_id as id, name, description, price, processing_time
        FROM service_packages
        WHERE provider_id = ?
        ORDER BY price ASC`,
        [providerId]
      ) as any[];
    } catch (error) {
      console.error('Error fetching service packages:', error);
      // Continue with empty array
    }

    // If no packages found for dummy provider, create sample data
    if (isDummyProvider && servicePackages.length === 0) {
      servicePackages = [
        {
          id: 101,
          name: 'Standard Cremation',
          description: 'A dignified individual cremation service for your beloved pet.',
          price: 3500,
          processing_time: '24-48 hours',
          inclusions: JSON.stringify(['Individual cremation', 'Standard urn', 'Memorial certificate', 'Paw print keepsake']),
          image: '/uploads/packages/standard-cremation.jpg',
          images: JSON.stringify(['/uploads/packages/standard-cremation.jpg'])
        },
        {
          id: 102,
          name: 'Premium Cremation',
          description: 'A premium service with additional keepsakes and memorials.',
          price: 5500,
          processing_time: '24 hours',
          inclusions: JSON.stringify(['Private viewing', 'Premium wooden urn', 'Memorial certificate', 'Paw print in clay', 'Fur clipping']),
          image: '/uploads/packages/premium-cremation.jpg',
          images: JSON.stringify(['/uploads/packages/premium-cremation.jpg'])
        },
        {
          id: 103,
          name: 'Memorial Service',
          description: 'A complete memorial service to honor your pet\'s memory.',
          price: 8500,
          processing_time: '48 hours',
          inclusions: JSON.stringify(['Private viewing room', 'Custom engraved urn', 'Memorial photo frame', 'Paw print in clay', 'Fur clipping', 'Memorial video']),
          image: '/uploads/packages/memorial-service.jpg',
          images: JSON.stringify(['/uploads/packages/memorial-service.jpg'])
        }
      ];
    }

    // Check which tables are available in the database
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_bookings', 'bookings', 'service_packages', 'payments', 'reviews')
    `) as any[];

    const availableTables = tablesResult.map(row => row.TABLE_NAME.toLowerCase());

    const hasServiceBookings = availableTables.includes('service_bookings');
    const hasBookings = availableTables.includes('bookings');

    // Calculate stats
    // 1. Get revenue, using successful_bookings table first (same as admin dashboard)
    // Note: totalRevenue and monthlyRevenue are already declared above

    // Check if successful_bookings table exists
    const successfulBookingsExists = await query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'successful_bookings'
    `) as any[];

    const hasSuccessfulBookings = successfulBookingsExists[0]?.count > 0;

    if (hasSuccessfulBookings) {
      // Get total revenue from all successful bookings (same as admin dashboard)
      const totalRevenueResult = await query(`
        SELECT COALESCE(SUM(transaction_amount), 0) as total
        FROM successful_bookings
        WHERE provider_id = ? AND payment_status = 'completed'
      `, [providerId]) as any[];

      totalRevenue = parseFloat(String(totalRevenueResult[0]?.total || '0'));

      // Get current month's revenue (same as admin dashboard)
      const currentMonthRevenueResult = await query(`
        SELECT COALESCE(SUM(transaction_amount), 0) as total
        FROM successful_bookings
        WHERE provider_id = ? AND payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(CURRENT_DATE())
        AND YEAR(payment_date) = YEAR(CURRENT_DATE())
      `, [providerId]) as any[];

      monthlyRevenue = parseFloat(String(currentMonthRevenueResult[0]?.total || '0'));
    }
    // Fallback to service_bookings and bookings tables if successful_bookings doesn't exist
    else {
      if (hasServiceBookings) {
        const serviceBookingsRevenue = await query(
          `SELECT COALESCE(SUM(price), 0) as total_revenue
           FROM service_bookings
           WHERE provider_id = ? AND status = 'completed'`,
          [providerId]
        ) as any[];

        totalRevenue += serviceBookingsRevenue[0]?.total_revenue || 0;

        // Get monthly revenue from service_bookings
        const monthlyServiceBookingsRevenue = await query(
          `SELECT COALESCE(SUM(price), 0) as total_revenue
           FROM service_bookings
           WHERE provider_id = ? AND status = 'completed'
           AND MONTH(created_at) = MONTH(CURRENT_DATE())
           AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
          [providerId]
        ) as any[];

        monthlyRevenue += monthlyServiceBookingsRevenue[0]?.total_revenue || 0;
      }

      if (hasBookings) {
        const bookingsRevenue = await query(
          `SELECT COALESCE(SUM(b.total_price), 0) as total_revenue
           FROM bookings b
           WHERE b.provider_id = ? AND b.status = 'completed'`,
          [providerId]
        ) as any[];

        totalRevenue += bookingsRevenue[0]?.total_revenue || 0;

        // Get monthly revenue from bookings
        const monthlyBookingsRevenue = await query(
          `SELECT COALESCE(SUM(b.total_price), 0) as total_revenue
           FROM bookings b
           WHERE b.provider_id = ? AND b.status = 'completed'
           AND MONTH(b.created_at) = MONTH(CURRENT_DATE())
           AND YEAR(b.created_at) = YEAR(CURRENT_DATE())`,
          [providerId]
        ) as any[];

        monthlyRevenue += monthlyBookingsRevenue[0]?.total_revenue || 0;
      }
    }

    // 2. Get new clients count (last 30 days unique users)
    // Note: newClients is already declared above
    newClients = 0;

    if (hasServiceBookings) {
      const serviceBookingsClients = await query(
        `SELECT COUNT(DISTINCT user_id) as new_clients
         FROM service_bookings
         WHERE provider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [providerId]
      ) as any[];

      newClients += serviceBookingsClients[0]?.new_clients || 0;
    }

    if (hasBookings) {
      const bookingsClients = await query(
        `SELECT COUNT(DISTINCT b.user_id) as new_clients
         FROM bookings b
         WHERE b.provider_id = ? AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [providerId]
      ) as any[];

      newClients += bookingsClients[0]?.new_clients || 0;
    }

    // 3. Get active bookings count
    // Note: activeBookings is already declared above
    activeBookings = 0;

    if (hasServiceBookings) {
      const serviceActiveBookings = await query(
        `SELECT COUNT(*) as active_bookings
         FROM service_bookings
         WHERE provider_id = ? AND status IN ('pending', 'confirmed', 'in_progress')`,
        [providerId]
      ) as any[];

      activeBookings += serviceActiveBookings[0]?.active_bookings || 0;
    }

    if (hasBookings) {
      const bookingsActiveBookings = await query(
        `SELECT COUNT(*) as active_bookings
         FROM bookings b
         WHERE b.provider_id = ? AND b.status IN ('pending', 'confirmed', 'in_progress')`,
        [providerId]
      ) as any[];

      activeBookings += bookingsActiveBookings[0]?.active_bookings || 0;
    }

    // 4. Get average rating (from reviews)
    // Get rating data (avgRating is already declared above)
    const ratingResultExtended = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE service_provider_id = ?`,
      [providerId]
    ) as any[];

    // Update the avgRating with the new value
    avgRating = parseFloat(ratingResultExtended[0]?.avg_rating || "0");

    // Get recent bookings from both tables if available
    // Note: recentBookings is already declared above
    recentBookings = [];

    if (hasServiceBookings) {
      try {
        const serviceRecentBookings = await query(
          `SELECT
            sb.booking_id as id, sb.status, sb.booking_date as scheduled_date,
            sb.booking_time as scheduled_time, sb.created_at,
            sb.special_requests, p.name as pet_name, p.species as pet_type, p.photo_path as pet_image_url,
            u.first_name, u.last_name,
            sp.name as service_name, sb.total_price as price
           FROM bookings sb
           JOIN users u ON sb.user_id = u.user_id
           LEFT JOIN pets p ON sb.pet_id = p.pet_id
           JOIN service_packages sp ON sb.package_id = sp.package_id
           WHERE sb.provider_id = ?
           ORDER BY sb.created_at DESC
           LIMIT 5`,
          [providerId]
        ) as any[];

        recentBookings = [...recentBookings, ...serviceRecentBookings];
      } catch (bookingError) {
      }
    }

    if (hasBookings && recentBookings.length < 5) {
      try {
        // This is a duplicate query, we'll just use the same one as above with a different limit
        const legacyRecentBookings = await query(
          `SELECT
            b.booking_id as id, b.status, b.booking_date as scheduled_date,
            b.booking_time as scheduled_time, b.created_at,
            b.special_requests, p.name as pet_name, p.species as pet_type, p.photo_path as pet_image_url,
            u.first_name, u.last_name,
            sp.name as service_name, b.total_price as price
           FROM bookings b
           JOIN users u ON b.user_id = u.user_id
           LEFT JOIN pets p ON b.pet_id = p.pet_id
           JOIN service_packages sp ON b.package_id = sp.package_id
           WHERE b.provider_id = ?
           ORDER BY b.created_at DESC
           LIMIT ${5 - recentBookings.length}`,
          [providerId]
        ) as any[];

        recentBookings = [...recentBookings, ...legacyRecentBookings];
      } catch (bookingError) {
      }
    }

    // Sort combined bookings by creation date
    recentBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Limit to 5 most recent
    recentBookings = recentBookings.slice(0, 5);

    // Get service packages
    // Note: servicePackages is already declared above
    servicePackages = await query(
      `SELECT package_id as id, name, description, price, processing_time, is_active
       FROM service_packages
       WHERE provider_id = ? AND is_active = 1
       LIMIT 3`,
      [providerId]
    ) as any[];

    // For each service package, get inclusions and images
    for (let pkg of servicePackages) {
      const inclusions = await query(
        `SELECT description
         FROM package_inclusions
         WHERE package_id = ?`,
        [pkg.id]
      ) as any[];

      const images = await query(
        `SELECT image_path
         FROM package_images
         WHERE package_id = ?
         ORDER BY display_order ASC`,
        [pkg.id]
      ) as any[];

      pkg.inclusions = inclusions.map((inc: any) => inc.description);

      // Process all images instead of just the first one
      pkg.images = [];

      if (images.length > 0) {
        // Process all images
        pkg.images = images.map((img: any) => {
          const imagePath = img.image_path;

          // Skip blob URLs - they won't work as server paths
          if (imagePath.startsWith('blob:')) {
            return null;
          }
          // Check if it's already a complete path
          else if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
            // Ensure it starts with a slash
            return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
          } else {
            // Otherwise assume it's in the packages directory
            return `/uploads/packages/${imagePath}`;
          }
        }).filter(Boolean); // Remove null values

        // Set the first image as the main image for backward compatibility
        if (pkg.images.length > 0) {
          pkg.image = pkg.images[0];
        } else {
          pkg.image = null;
        }

        // Log the image paths for debugging
      } else {
        pkg.images = [];
        pkg.image = null;
      }
    }

    // Calculate stats changes compared to previous period
    // This would normally involve more complex queries, but we'll simplify
    const previousRevenue = totalRevenue * 0.9; // Simplified, just for demonstration
    // Note: revenueChange is already declared above
    revenueChange = totalRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const previousClients = newClients - 2; // Simplified
    // Note: clientsChange is already declared above
    clientsChange = previousClients > 0 ? ((newClients - previousClients) / previousClients) * 100 : 0;

    const previousActive = activeBookings + 1; // Simplified
    // Note: bookingsChange is already declared above
    bookingsChange = previousActive > 0 ? ((activeBookings - previousActive) / previousActive) * 100 : 0;

    // Note: avgRating is already declared and updated above from ratingResultExtended
    const previousRating = avgRating - 0.2; // Simplified
    // Note: ratingChange is already declared above
    ratingChange = previousRating > 0 ? avgRating - previousRating : 0;

    // We already handle the dummy provider case at the beginning of the function

    // For real providers, return the actual data with stats matching the admin dashboard format
    return NextResponse.json({
      providerInfo: providerInfo[0],
      stats: [
        {
          name: 'Total Bookings',
          value: (activeBookings + newClients).toString(),
          change: `${bookingsChange > 0 ? '+' : ''}${bookingsChange.toFixed(0)}%`,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Pending Bookings',
          value: activeBookings.toString(),
          change: `${bookingsChange > 0 ? '+' : ''}${bookingsChange.toFixed(0)}%`,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Active Packages',
          value: servicePackages.length.toString(),
          change: '0%',
          changeType: 'increase',
        },
        {
          name: 'Monthly Revenue',
          value: `₱${monthlyRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(0)}%`,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
        },
      ],
      recentBookings: recentBookings.map((booking: any) => ({
        id: booking.id,
        petName: booking.pet_name || 'Unknown Pet',
        petType: booking.pet_type || 'Unknown',
        owner: `${booking.first_name} ${booking.last_name}`,
        service: booking.service_name,
        status: booking.status,
        scheduledDate: booking.scheduled_date ? formatDate(booking.scheduled_date) : 'Not scheduled',
        scheduledTime: booking.scheduled_time ? formatTime(booking.scheduled_time) : 'Not specified',
        createdAt: formatDate(booking.created_at),
        statusColor: getStatusColor(booking.status)
      })),
      servicePackages: servicePackages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        processingTime: pkg.processing_time,
        inclusions: pkg.inclusions || [],
        image: pkg.image || null,
        images: pkg.images || []
      }))
    });
  } catch (error) {
    console.error('Dashboard data fetch error:', error instanceof Error ? error.message : 'Unknown error');

    // Return a more detailed error response
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
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
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'scheduled':
    case 'confirmed':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}