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
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone as phone,
               sp.id as package_id, sp.name as service_name, sp.processing_time
        FROM service_bookings sb
        JOIN users u ON sb.user_id = u.id
        LEFT JOIN service_packages sp ON sb.package_id = sp.id
        WHERE (sb.package_id IN (?) OR sb.provider_id = ?)
      `;
      queryParams.push(packageIds, providerId);
    } else {
      // Using traditional bookings table
      sql = `
        SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes, 
               b.created_at, 'N/A' as pet_name, 'N/A' as pet_type,
               u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
               sp.id as package_id, sp.name as service_name, sp.price, sp.processing_time
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN service_packages sp ON b.business_service_id = sp.id
        WHERE b.business_service_id IN (?)
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
        completed: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'completed'`,
        cancelled: `SELECT COUNT(*) as count FROM service_bookings WHERE (package_id IN (?) OR provider_id = ?) AND status = 'cancelled'`
      };
    } else {
      statsQueries = {
        total: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?)`,
        pending: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'pending'`,
        confirmed: `SELECT COUNT(*) as count FROM bookings WHERE business_service_id IN (?) AND status = 'confirmed'`,
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
        inProgress: 0, // This status doesn't exist in the schema, mapping to 0
        completed: stats.completed,
        cancelled: stats.cancelled,
        pending: stats.pending,
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