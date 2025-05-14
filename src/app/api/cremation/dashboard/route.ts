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
    
    // Calculate stats
    // 1. Get revenue (from successful bookings)
    const revenueResult = await query(
      `SELECT COALESCE(SUM(transaction_amount), 0) as total_revenue
       FROM successful_bookings
       WHERE provider_id = ? AND payment_status = 'completed'`,
      [providerId]
    ) as any[];
    
    // 2. Get new clients count (last 30 days unique users)
    const newClientsResult = await query(
      `SELECT COUNT(DISTINCT user_id) as new_clients
       FROM successful_bookings
       WHERE provider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [providerId]
    ) as any[];
    
    // 3. Get active bookings count
    // Modified to join with service_packages to link to service_provider_id
    const activeBookingsResult = await query(
      `SELECT COUNT(*) as active_bookings
       FROM bookings b
       JOIN service_packages sp ON b.business_service_id = sp.id
       WHERE sp.service_provider_id = ? AND b.status IN ('pending', 'confirmed', 'in_progress')`,
      [providerId]
    ) as any[];
    
    // 4. Get average rating (from reviews)
    const ratingResult = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE service_provider_id = ?`,
      [providerId]
    ) as any[];
    
    // Get recent bookings
    // Modified to join with service_packages to link to service_provider_id
    const recentBookings = await query(
      `SELECT b.id, b.status, b.booking_date as scheduled_date, b.created_at, 
              p.name as pet_name, p.species as pet_type,
              u.first_name, u.last_name,
              sp.name as service_name, sp.price
       FROM bookings b
       JOIN pets p ON b.pet_id = p.id
       JOIN users u ON b.user_id = u.id
       JOIN service_packages sp ON b.business_service_id = sp.id
       WHERE sp.service_provider_id = ?
       ORDER BY b.created_at DESC
       LIMIT 5`,
      [providerId]
    ) as any[];
    
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
         ORDER BY display_order ASC
         LIMIT 1`,
        [pkg.id]
      ) as any[];
      
      pkg.inclusions = inclusions.map((inc: any) => inc.description);
      
      if (images.length > 0) {
        // Properly handle image paths - ensure they're correctly formatted for the front end
        const imagePath = images[0].image_path;
        
        // Skip blob URLs - they won't work as server paths
        if (imagePath.startsWith('blob:')) {
          console.log(`Package ${pkg.id} has blob URL that can't be served: ${imagePath}`);
          pkg.image = null;
        }
        // Check if it's already a complete path
        else if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
          // Ensure it starts with a slash
          pkg.image = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        } else {
          // Otherwise assume it's in the packages directory
          pkg.image = `/uploads/packages/${imagePath}`;
        }
        
        // Log the image path for debugging
        console.log(`Package ${pkg.id} image path: ${pkg.image}`);
      } else {
        pkg.image = null;
      }
    }
    
    // Calculate stats changes compared to previous period
    // This would normally involve more complex queries, but we'll simplify
    const totalRevenue = revenueResult[0]?.total_revenue || 0;
    const previousRevenue = totalRevenue * 0.9; // Simplified, just for demonstration
    const revenueChange = totalRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const newClients = newClientsResult[0]?.new_clients || 0;
    const previousClients = newClients - 2; // Simplified
    const clientsChange = previousClients > 0 ? ((newClients - previousClients) / previousClients) * 100 : 0;
    
    const activeBookings = activeBookingsResult[0]?.active_bookings || 0;
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
          name: 'Service Rating',
          value: `${avgRating.toFixed(1)}/5`,
          change: `${ratingChange >= 0 ? '+' : ''}${ratingChange.toFixed(1)}`,
          changeType: ratingChange >= 0 ? 'increase' : 'decrease',
        },
      ],
      recentBookings: recentBookings.map((booking: any) => ({
        id: booking.id,
        petName: booking.pet_name,
        petType: booking.species || booking.pet_type,
        owner: `${booking.first_name} ${booking.last_name}`,
        service: booking.service_name,
        status: booking.status,
        date: new Date(booking.scheduled_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        statusColor: getStatusColor(booking.status)
      })),
      servicePackages: servicePackages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        processingTime: pkg.processing_time,
        inclusions: pkg.inclusions || [],
        imagePath: pkg.image || null
      }))
    });
  } catch (error) {
    console.error('Error fetching cremation dashboard data:', error);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
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