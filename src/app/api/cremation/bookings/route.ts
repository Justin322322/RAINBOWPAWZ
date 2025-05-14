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
    let sql = `
      SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests as notes, b.created_at, 
             p.id as pet_id, p.name as pet_name, p.species as pet_type, p.breed, p.weight,
             u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number as phone,
             sp.id as package_id, sp.name as service_name, sp.price, sp.processing_time
      FROM bookings b
      JOIN pets p ON b.pet_id = p.id
      JOIN users u ON b.user_id = u.id
      JOIN service_packages sp ON b.business_service_id = sp.id
      WHERE b.business_service_id IN (?)
    `;
    
    const queryParams = [packageIds];
    
    // Add status filter if not 'all'
    if (statusFilter !== 'all') {
      sql += ' AND b.status = ?';
      queryParams.push(statusFilter);
    }
    
    // Add search term if provided
    if (searchTerm) {
      sql += ` AND (
        p.name LIKE ? OR 
        u.first_name LIKE ? OR 
        u.last_name LIKE ? OR 
        b.id LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // Add order by and limit
    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    // Execute the query
    const bookings = await query(sql, queryParams) as any[];
    
    // Get booking stats
    const statsQueries = {
      total: `SELECT COUNT(*) as count FROM bookings b WHERE b.business_service_id IN (?)`,
      pending: `SELECT COUNT(*) as count FROM bookings b WHERE b.business_service_id IN (?) AND b.status = 'pending'`,
      confirmed: `SELECT COUNT(*) as count FROM bookings b WHERE b.business_service_id IN (?) AND b.status = 'confirmed'`,
      completed: `SELECT COUNT(*) as count FROM bookings b WHERE b.business_service_id IN (?) AND b.status = 'completed'`,
      cancelled: `SELECT COUNT(*) as count FROM bookings b WHERE b.business_service_id IN (?) AND b.status = 'cancelled'`
    };
    
    const stats: Record<string, number> = {};
    
    for (const [key, sql] of Object.entries(statsQueries)) {
      const result = await query(sql, [packageIds]) as any[];
      stats[key] = result[0]?.count || 0;
    }
    
    // Calculate total revenue from the bookings (since the successful_bookings table may not be used yet)
    const totalRevenue = bookings.reduce((total: number, booking: any) => {
      if (booking.status === 'completed') {
        return total + (booking.price || 0);
      }
      return total;
    }, 0);
    
    // Format the bookings data for response
    const formattedBookings = bookings.map((booking: any) => ({
      id: booking.id,
      petName: booking.pet_name,
      petType: booking.pet_type,
      petSize: booking.weight ? `${getWeightCategory(booking.weight)} (${booking.weight} lbs)` : 'Unknown',
      owner: {
        name: `${booking.first_name} ${booking.last_name}`,
        email: booking.email,
        phone: booking.phone || 'Not provided'
      },
      service: booking.service_name,
      package: booking.service_name,
      status: booking.status,
      scheduledDate: formatDate(booking.booking_date),
      scheduledTime: formatTime(booking.booking_time),
      notes: booking.notes || 'No special notes',
      price: booking.price,
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

function getWeightCategory(weight: number): string {
  if (weight <= 10) return 'Small';
  if (weight <= 30) return 'Medium';
  if (weight <= 60) return 'Large';
  return 'X-Large';
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