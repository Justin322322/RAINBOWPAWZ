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
       FROM service_providers WHERE provider_id = ? LIMIT 1`,
      [providerId]
    ) as any[];

    if (!providerInfo || providerInfo.length === 0) {
      return NextResponse.json({
        error: 'Provider not found'
      }, { status: 404 });
    }

    // Check which tables are available in the database
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('bookings', 'bookings', 'service_packages', 'payments', 'reviews')
    `) as any[];

    const availableTables = tablesResult.map(row => row.TABLE_NAME.toLowerCase());
    const hasServiceBookings = availableTables.includes('bookings');

    // 1. Calculate revenue using the same method as history endpoint
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let revenueChange = 0;

    if (hasServiceBookings) {
      // Get total revenue from completed bookings
      const totalRevenueResult = await query(`
        SELECT COALESCE(SUM(price + IFNULL(delivery_fee, 0)), 0) as total 
        FROM bookings
        WHERE provider_id = ? AND status = 'completed'`,
        [providerId]
      ) as any[];

      totalRevenue = parseFloat(totalRevenueResult[0]?.total || '0');

      // Get monthly revenue (current month)
      const monthlyRevenueResult = await query(`
        SELECT COALESCE(SUM(price + IFNULL(delivery_fee, 0)), 0) as monthly 
        FROM bookings
        WHERE provider_id = ? AND status = 'completed'
        AND MONTH(booking_date) = MONTH(CURDATE()) 
        AND YEAR(booking_date) = YEAR(CURDATE())`,
        [providerId]
      ) as any[];

      monthlyRevenue = parseFloat(monthlyRevenueResult[0]?.monthly || '0');

      // Get previous month revenue for comparison
      const previousMonthRevenueResult = await query(`
        SELECT COALESCE(SUM(price + IFNULL(delivery_fee, 0)), 0) as previous 
        FROM bookings
        WHERE provider_id = ? AND status = 'completed'
        AND MONTH(booking_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND YEAR(booking_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`,
        [providerId]
      ) as any[];

      const previousMonthRevenue = parseFloat(previousMonthRevenueResult[0]?.previous || '0');
      
      // Calculate percentage change
      if (previousMonthRevenue > 0) {
        revenueChange = ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
      } else if (monthlyRevenue > 0) {
        revenueChange = 100; // 100% increase if previous was 0
      }
    }

    // 2. Get booking statistics using the same method as history endpoint
    let totalBookings = 0;
    let activeBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let bookingsChange = 0;

    if (hasServiceBookings) {
      // Get all booking counts
      const [totalResult, activeResult, completedResult, cancelledResult] = await Promise.all([
        query(`SELECT COUNT(*) as count FROM bookings WHERE provider_id = ?`, [providerId]),
        query(`SELECT COUNT(*) as count FROM bookings WHERE provider_id = ? AND status IN ('pending', 'confirmed', 'in_progress')`, [providerId]),
        query(`SELECT COUNT(*) as count FROM bookings WHERE provider_id = ? AND status = 'completed'`, [providerId]),
        query(`SELECT COUNT(*) as count FROM bookings WHERE provider_id = ? AND status = 'cancelled'`, [providerId])
      ]) as any[][];

      totalBookings = totalResult[0]?.count || 0;
      activeBookings = activeResult[0]?.count || 0;
      completedBookings = completedResult[0]?.count || 0;
      cancelledBookings = cancelledResult[0]?.count || 0;

      // Calculate bookings change (current month vs previous month)
      const thisMonthBookingsResult = await query(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE provider_id = ? 
        AND MONTH(created_at) = MONTH(CURDATE()) 
        AND YEAR(created_at) = YEAR(CURDATE())`,
        [providerId]
      ) as any[];

      const prevMonthBookingsResult = await query(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE provider_id = ? 
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`,
        [providerId]
      ) as any[];

      const thisMonthBookings = thisMonthBookingsResult[0]?.count || 0;
      const prevMonthBookings = prevMonthBookingsResult[0]?.count || 0;

      if (prevMonthBookings > 0) {
        bookingsChange = ((thisMonthBookings - prevMonthBookings) / prevMonthBookings) * 100;
      } else if (thisMonthBookings > 0) {
        bookingsChange = 100;
      }
    }

    // 3. Get unique clients count (new clients this month)
    let newClients = 0;
    let _clientsChange = 0;

    if (hasServiceBookings) {
      const newClientsResult = await query(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM bookings
        WHERE provider_id = ? 
        AND MONTH(created_at) = MONTH(CURDATE()) 
        AND YEAR(created_at) = YEAR(CURDATE())`,
        [providerId]
      ) as any[];

      const prevClientsResult = await query(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM bookings
        WHERE provider_id = ? 
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`,
        [providerId]
      ) as any[];

      newClients = newClientsResult[0]?.count || 0;
      const prevClients = prevClientsResult[0]?.count || 0;

      if (prevClients > 0) {
        _clientsChange = ((newClients - prevClients) / prevClients) * 100;
      } else if (newClients > 0) {
        _clientsChange = 100;
      }
    }

    // 4. Get average rating
    let avgRating = 0;
    let _ratingChange = 0;

    const ratingResult = await query(`
      SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
      FROM reviews
      WHERE service_provider_id = ?`,
      [providerId]
    ) as any[];

    avgRating = parseFloat(ratingResult[0]?.avg_rating || "0");

    // 5. Get recent bookings using the same format as history endpoint
    let recentBookings: any[] = [];

    if (hasServiceBookings) {
      recentBookings = await query(`
        SELECT sb.id, sb.status, sb.booking_date, sb.booking_time, sb.special_requests as notes,
               sb.created_at, sb.pet_name, sb.pet_type, sb.cause_of_death,
               sb.pet_image_url, sb.payment_method, sb.delivery_option, sb.delivery_distance,
               sb.delivery_fee, sb.price,
               u.user_id as user_id, u.first_name, u.last_name, u.email, u.phone as phone,
               sp.package_id as package_id, sp.name as service_name, sp.processing_time
        FROM bookings sb
        JOIN users u ON sb.user_id = u.user_id
        LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
        WHERE sb.provider_id = ?
        ORDER BY sb.created_at DESC
        LIMIT 5`,
        [providerId]
      ) as any[];
    }

    // 6. Get active service packages count
    const servicePackagesResult = await query(`
      SELECT COUNT(*) as count
      FROM service_packages
      WHERE provider_id = ? AND is_active = 1`,
      [providerId]
    ) as any[];

    const activePackagesCount = servicePackagesResult[0]?.count || 0;

    // Get service packages details
    const servicePackages = await query(`
      SELECT package_id as id, name, description, price, processing_time, is_active
      FROM service_packages
      WHERE provider_id = ? AND is_active = 1
      ORDER BY price ASC`,
      [providerId]
    ) as any[];

    // For each service package, get inclusions and images
    for (let pkg of servicePackages) {
      const inclusions = await query(
        `SELECT description
         FROM service_packages sp, JSON_TABLE(sp.inclusions, '$[*]' COLUMNS (name VARCHAR(255) PATH '$.name', description TEXT PATH '$.description', is_included BOOLEAN PATH '$.is_included')) as inclusions
         WHERE package_id = ?`,
        [pkg.id]
      ) as any[];

      const images = await query(
        `SELECT image_path, image_data
         FROM service_packages sp, JSON_TABLE(sp.images, '$[*]' COLUMNS (url VARCHAR(500) PATH '$.url', alt_text VARCHAR(255) PATH '$.alt_text', is_primary BOOLEAN PATH '$.is_primary')) as images
         WHERE package_id = ?
         ORDER BY display_order ASC`,
        [pkg.id]
      ) as any[];

      pkg.inclusions = inclusions.map((inc: any) => inc.description);

      // Process images
      pkg.images = [];

      if (images.length > 0) {
        pkg.images = images.map((img: any) => {
          // If we have base64 image data, use it directly
          if (img.image_data && img.image_data.startsWith('data:image/')) {
            return img.image_data;
          }
          
          // Fallback to file path processing for backward compatibility
          const imagePath = img.image_path;
          if (!imagePath || imagePath.startsWith('blob:')) {
            return null;
          }
          
          // Ensure all package images use the API route
          if (imagePath.startsWith('/api/image/')) {
            return imagePath; // Already correct
          }
          if (imagePath.startsWith('/uploads/packages/')) {
            return `/api/image/packages/${imagePath.substring('/uploads/packages/'.length)}`;
          }
          if (imagePath.startsWith('uploads/packages/')) {
            return `/api/image/packages/${imagePath.substring('uploads/packages/'.length)}`;
          }
          if (imagePath.includes('packages/')) {
            const parts = imagePath.split('packages/');
            if (parts.length > 1) {
              return `/api/image/packages/${parts[1]}`;
            }
          }
          // For legacy paths, try to convert to API route
          if (imagePath.startsWith('/uploads/')) {
            return `/api/image/${imagePath.substring('/uploads/'.length)}`;
          }
          if (imagePath.startsWith('uploads/')) {
            return `/api/image/${imagePath}`;
          }
          
          // Default fallback to API route
          return `/api/image/packages/${imagePath}`;
        }).filter(Boolean);

        if (pkg.images.length > 0) {
          pkg.image = pkg.images[0];
        } else {
          pkg.image = null;
        }
      } else {
        pkg.images = [];
        pkg.image = null;
      }
    }

    // Return consistent stats format matching the history endpoint structure
    return NextResponse.json({
      providerInfo: providerInfo[0],
      stats: [
        {
          name: 'Total Bookings',
          value: totalBookings.toString(),
          change: `${bookingsChange > 0 ? '+' : ''}${bookingsChange.toFixed(0)}%`,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Active Bookings',
          value: activeBookings.toString(),
          change: `${bookingsChange > 0 ? '+' : ''}${bookingsChange.toFixed(0)}%`,
          changeType: bookingsChange >= 0 ? 'increase' : 'decrease',
        },
        {
          name: 'Active Packages',
          value: activePackagesCount.toString(),
          change: '0%',
          changeType: 'increase',
        },
        {
          name: 'Monthly Revenue',
          value: `₱${monthlyRevenue.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(0)}%`,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
        },
      ],
      // Include the same detailed stats as history endpoint for compatibility
      detailedStats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        monthlyRevenue,
        averageRevenue: completedBookings > 0 ? totalRevenue / completedBookings : 0,
        newClients,
        avgRating: avgRating.toFixed(1)
      },
      recentBookings: recentBookings.map((booking: any) => ({
        id: booking.id,
        petName: booking.pet_name || 'Unknown Pet',
        petType: booking.pet_type || 'Unknown',
        owner: `${booking.first_name} ${booking.last_name}`,
        service: booking.service_name,
        status: booking.status,
        scheduledDate: booking.booking_date ? formatDate(booking.booking_date) : 'Not scheduled',
        scheduledTime: booking.booking_time ? formatTime(booking.booking_time) : 'Not specified',
        createdAt: formatDate(booking.created_at),
        statusColor: getStatusColor(booking.status),
        amount: parseFloat(booking.price || 0) + parseFloat(booking.delivery_fee || 0)
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
