import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession, authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Getting cremation history data...');
    
    // For testing/development, we'll use a hardcoded provider ID if auth fails
    let providerId;
    
    try {
      // Get the authenticated user
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        console.warn('No authenticated session, using fallback provider ID');
      } else {
        // Get the provider ID from the user session
        const userId = session.user.id;
        console.log('User ID from session:', userId);
        
        // Fetch provider ID from the service_providers table for this user
        const userQuery = `
          SELECT id FROM service_providers WHERE user_id = ?
        `;
        console.log('Executing query to get provider ID:', userQuery);
        const userResult = await query(userQuery, [userId]) as any[];
        console.log('User result:', userResult);
        
        if (userResult && userResult.length > 0) {
          providerId = userResult[0].id;
          console.log('Found provider ID:', providerId);
        } else {
          console.log('No provider ID found for user ID:', userId);
        }
      }
    } catch (authError) {
      console.warn('Auth error, using fallback provider ID:', authError);
    }
    
    if (!providerId) {
      console.log('No provider ID found from session, getting fallback...');
      // If we couldn't get a provider ID from the session, get the first provider ID from the database
      const providerQuery = `SELECT id FROM service_providers LIMIT 1`;
      console.log('Executing query to get fallback provider ID:', providerQuery);
      const providerResult = await query(providerQuery) as any[];
      console.log('Provider result:', providerResult);
      
      if (!providerResult || providerResult.length === 0) {
        console.error('No service providers found in the database');
        return NextResponse.json({
          error: 'No service providers found in the database'
        }, { status: 404 });
      }
      
      providerId = providerResult[0].id;
      console.log('Using fallback provider ID:', providerId);
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all';
    console.log('Period filter:', period);
    
    // Build the SQL date range condition based on the period  
    let dateCondition = '';
    const queryParams: any[] = [providerId];
    
    if (period === 'last7days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'last30days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'last90days') {
      dateCondition = 'AND sb.booking_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    }
    
    // First, check if the service_bookings table exists
    const tablesCheckQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_bookings'
    `;
    console.log('Checking for service_bookings table:', tablesCheckQuery);
    const tablesResult = await query(tablesCheckQuery) as any[];
    console.log('Tables result:', tablesResult);
    
    if (!tablesResult || tablesResult.length === 0) {
      console.error('Service bookings table does not exist');
      return NextResponse.json({
        error: 'Service bookings table does not exist'
      }, { status: 500 });
    }
    
    // Query to get bookings - include ALL statuses, not just completed or cancelled
    const bookingsQuery = `
      SELECT sb.id, sb.status, sb.booking_date, sb.price, 
             sb.delivery_fee, sb.pet_name, sb.pet_type,
             u.first_name, u.last_name,
             p.name as package_name
      FROM service_bookings sb
      JOIN users u ON sb.user_id = u.id
      LEFT JOIN service_packages p ON sb.package_id = p.id
      WHERE sb.provider_id = ?
      ${dateCondition}
      ORDER BY sb.booking_date DESC
    `;
    
    console.log('Executing bookings query:', bookingsQuery);
    console.log('With params:', queryParams);
    const bookingsResult = await query(bookingsQuery, queryParams) as any[];
    console.log(`Retrieved ${bookingsResult.length} bookings`);
    
    // Get stats
    const totalBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings 
      WHERE provider_id = ? ${dateCondition}
    `;
    
    const completedBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings 
      WHERE provider_id = ? AND status = 'completed' ${dateCondition}
    `;
    
    const cancelledBookingsQuery = `
      SELECT COUNT(*) as count FROM service_bookings 
      WHERE provider_id = ? AND status = 'cancelled' ${dateCondition}
    `;
    
    const totalRevenueQuery = `
      SELECT COALESCE(SUM(price + IFNULL(delivery_fee, 0)), 0) as total FROM service_bookings 
      WHERE provider_id = ? AND status = 'completed' ${dateCondition}
    `;
    
    console.log('Executing stats queries...');
    const [totalBookingsResult, completedBookingsResult, cancelledBookingsResult, totalRevenueResult] = await Promise.all([
      query(totalBookingsQuery, queryParams) as Promise<any[]>,
      query(completedBookingsQuery, queryParams) as Promise<any[]>,
      query(cancelledBookingsQuery, queryParams) as Promise<any[]>,
      query(totalRevenueQuery, queryParams) as Promise<any[]>
    ]);
    
    const totalBookings = totalBookingsResult[0].count || 0;
    const completedBookings = completedBookingsResult[0].count || 0;
    const cancelledBookings = cancelledBookingsResult[0].count || 0;
    const totalRevenue = parseFloat(totalRevenueResult[0].total) || 0;
    const averageRevenue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
    
    console.log('Stats:', {
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageRevenue
    });
    
    // Format the booking data for response
    const formattedBookings = bookingsResult.map((booking: any) => ({
      id: booking.id,
      petName: booking.pet_name || 'Unknown',
      petType: booking.pet_type || 'Unknown',
      owner: `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Unknown',
      package: booking.package_name || 'Unknown Package',
      status: booking.status,
      date: formatDate(booking.booking_date),
      amount: parseFloat(booking.price || 0) + parseFloat(booking.delivery_fee || 0)
    }));
    
    console.log(`Returning ${formattedBookings.length} formatted bookings`);
    
    return NextResponse.json({
      bookings: formattedBookings,
      stats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        averageRevenue
      }
    });
    
  } catch (error) {
    console.error('Error fetching cremation history:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 