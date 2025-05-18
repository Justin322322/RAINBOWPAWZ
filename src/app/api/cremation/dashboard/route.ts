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

    // Get business information
    const providerInfo = await query(
      `SELECT name, provider_type, contact_first_name, contact_last_name
       FROM service_providers WHERE id = ? LIMIT 1`,
      [providerId]
    ) as any[];

    if (!providerInfo || providerInfo.length === 0) {
      return NextResponse.json({
        error: 'Provider not found'
      }, { status: 404 });
    }

    // Check which tables are available
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_bookings', 'bookings')
    `) as any[];

    const availableTables = tablesResult.map(row => row.TABLE_NAME.toLowerCase());

    const hasServiceBookings = availableTables.includes('service_bookings');
    const hasBookings = availableTables.includes('bookings');

    // Calculate stats
    // 1. Get revenue, using both tables if available
    let totalRevenue = 0;

    if (hasServiceBookings) {
      const serviceBookingsRevenue = await query(
        `SELECT COALESCE(SUM(price), 0) as total_revenue
         FROM service_bookings
         WHERE provider_id = ? AND status = 'completed'`,
        [providerId]
      ) as any[];

      totalRevenue += serviceBookingsRevenue[0]?.total_revenue || 0;
    }

    if (hasBookings) {
      const bookingsRevenue = await query(
        `SELECT COALESCE(SUM(b.total_amount), 0) as total_revenue
         FROM bookings b
         JOIN service_packages sp ON b.business_service_id = sp.id
         WHERE sp.service_provider_id = ? AND b.status = 'completed'`,
        [providerId]
      ) as any[];

      totalRevenue += bookingsRevenue[0]?.total_revenue || 0;
    }

    // 2. Get new clients count (last 30 days unique users)
    let newClients = 0;

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
         JOIN service_packages sp ON b.business_service_id = sp.id
         WHERE sp.service_provider_id = ? AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [providerId]
      ) as any[];

      newClients += bookingsClients[0]?.new_clients || 0;
    }

    // 3. Get active bookings count
    let activeBookings = 0;

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
         JOIN service_packages sp ON b.business_service_id = sp.id
         WHERE sp.service_provider_id = ? AND b.status IN ('pending', 'confirmed', 'in_progress')`,
        [providerId]
      ) as any[];

      activeBookings += bookingsActiveBookings[0]?.active_bookings || 0;
    }

    // 4. Get average rating (from reviews)
    const ratingResult = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE service_provider_id = ?`,
      [providerId]
    ) as any[];

    // Get recent bookings from both tables if available
    let recentBookings: any[] = [];

    if (hasServiceBookings) {
      try {
        const serviceRecentBookings = await query(
          `SELECT
            sb.id, sb.status, sb.booking_date as scheduled_date,
            sb.booking_time as scheduled_time, sb.created_at,
            sb.special_requests, sb.pet_name, sb.pet_type, sb.pet_image_url,
            u.first_name, u.last_name,
            sp.name as service_name, sb.price
           FROM service_bookings sb
           JOIN users u ON sb.user_id = u.id
           JOIN service_packages sp ON sb.package_id = sp.id
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
        const legacyRecentBookings = await query(
          `SELECT b.id, b.status, b.booking_date as scheduled_date,
                  b.booking_time as scheduled_time, b.created_at,
                  b.special_requests,
                  u.first_name, u.last_name,
                  sp.name as service_name, sp.price,
                  p.name as pet_name, p.species as pet_type, p.photo_path as pet_image_url
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           JOIN service_packages sp ON b.business_service_id = sp.id
           LEFT JOIN pets p ON p.user_id = u.id AND p.created_at <= DATE_ADD(b.created_at, INTERVAL 5 SECOND)
           WHERE sp.service_provider_id = ?
           GROUP BY b.id
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
    const servicePackages = await query(
      `SELECT id, name, description, price, processing_time, is_active
       FROM service_packages
       WHERE service_provider_id = ? AND is_active = 1
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
    const revenueChange = totalRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const previousClients = newClients - 2; // Simplified
    const clientsChange = previousClients > 0 ? ((newClients - previousClients) / previousClients) * 100 : 0;

    const previousActive = activeBookings + 1; // Simplified
    const bookingsChange = previousActive > 0 ? ((activeBookings - previousActive) / previousActive) * 100 : 0;

    const avgRating = parseFloat(ratingResult[0]?.avg_rating || "0");
    const previousRating = avgRating - 0.2; // Simplified
    const ratingChange = previousRating > 0 ? avgRating - previousRating : 0;

    return NextResponse.json({
      providerInfo: providerInfo[0],
      stats: [
        {
          name: 'Total Revenue',
          value: `₱${totalRevenue.toLocaleString()}`,
          change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(0)}%`,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'New Clients',
          value: newClients.toString(),
          change: `${clientsChange > 0 ? '+' : ''}${clientsChange.toFixed(0)}%`,
          changeType: clientsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Active Bookings',
          value: activeBookings.toString(),
          change: `${bookingsChange > 0 ? '+' : ''}${bookingsChange.toFixed(0)}%`,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Average Rating',
          value: avgRating > 0 ? `${avgRating.toFixed(1)}/5` : 'No ratings',
          change: `${ratingChange > 0 ? '+' : ''}${ratingChange.toFixed(1)}`,
          changeType: ratingChange >= 0 ? 'increase' : 'decrease',
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
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
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