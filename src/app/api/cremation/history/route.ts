import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Cremation history API called');
    
    // Get auth token and validate
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      console.error('Unauthorized: No auth token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log(`User ID: ${userId}, Account Type: ${accountType}`);
    
    // Only cremation businesses should have access
    if (accountType !== 'business') {
      console.error(`Unauthorized access: account type ${accountType} is not business`);
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Get business ID
    const businessResult = await query(
      'SELECT id FROM service_providers WHERE user_id = ? AND provider_type = "cremation"',
      [userId]
    ) as any[];
    
    if (!businessResult || businessResult.length === 0) {
      console.error(`Business not found for user ID: ${userId}`);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    const businessId = businessResult[0].id;
    console.log(`Business ID: ${businessId}`);
    
    // Get URL parameters for filtering
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all';
    const status = url.searchParams.get('status') || 'all';
    
    console.log(`Filtering by period: ${period}, status: ${status}`);
    
    // Build query based on filters
    let dateCondition = '';
    if (period !== 'all') {
      const now = new Date();
      let daysToSubtract = 30; // default to last 30 days
      
      if (period === 'last7days') daysToSubtract = 7;
      else if (period === 'last90days') daysToSubtract = 90;
      
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysToSubtract);
      
      const formattedDate = startDate.toISOString().split('T')[0];
      dateCondition = ` AND b.booking_date >= '${formattedDate}'`;
      console.log(`Date filter applied: ${formattedDate}`);
    }
    
    // Status filter
    let statusCondition = '';
    if (status !== 'all') {
      statusCondition = ` AND b.status = '${status}'`;
      console.log(`Status filter applied: ${status}`);
    }
    
    // Get bookings with their details
    console.log('Executing booking query...');
    try {
      // First, check if the bookings table exists
      const tableCheck = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'bookings'
      `);
      
      if (!tableCheck || tableCheck[0].count === 0) {
        console.error('Bookings table does not exist');
        return NextResponse.json({
          bookings: [],
          stats: {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            totalRevenue: 0,
            averageRevenue: 0
          }
        });
      }
      
      // Check for required columns
      const columnCheck = await query(`
        SELECT 
          COUNT(*) as has_booking_date,
          SUM(CASE WHEN COLUMN_NAME = 'booking_time' THEN 1 ELSE 0 END) as has_booking_time,
          SUM(CASE WHEN COLUMN_NAME = 'completed_at' THEN 1 ELSE 0 END) as has_completed_at
        FROM information_schema.columns
        WHERE table_schema = DATABASE() 
        AND table_name = 'bookings'
        AND COLUMN_NAME IN ('booking_date', 'booking_time', 'completed_at')
      `);
      
      if (!columnCheck || columnCheck[0].has_booking_date === 0) {
        console.error('Required columns missing in bookings table');
        return NextResponse.json({
          error: 'Database schema mismatch',
          message: 'The database structure does not match the expected schema',
          code: 'SCHEMA_ERROR'
        }, { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
      
      const bookings = await query(`
        SELECT 
          b.id, 
          b.status, 
          b.booking_date, 
          b.booking_time,
          b.created_at,
          b.updated_at AS completed_at,
          'N/A' AS pet_name, 
          'N/A' AS pet_type,
          u.first_name, 
          u.last_name,
          sp.name AS service_name, 
          sp.price
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN service_packages sp ON b.business_service_id = sp.id
        WHERE sp.service_provider_id = ?${dateCondition}${statusCondition}
        ORDER BY b.booking_date DESC, b.booking_time DESC
      `, [businessId]) as any[];
      
      console.log(`Found ${bookings.length} bookings`);
      
      // Format dates and calculate stats
      const formattedBookings = bookings.map(booking => {
        const bookingDate = new Date(booking.booking_date);
        const completedDate = booking.completed_at ? new Date(booking.completed_at) : null;
        
        // Use the service package price as the revenue for completed bookings
        const revenue = booking.status === 'completed' ? parseFloat(booking.price) || 0 : 0;
        
        return {
          id: booking.id,
          petName: booking.pet_name,
          petType: booking.pet_type,
          owner: `${booking.first_name} ${booking.last_name}`,
          service: booking.service_name,
          package: booking.service_name,
          status: booking.status,
          bookingDate: bookingDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          completedDate: completedDate ? completedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : null,
          revenue: revenue,
          paymentStatus: booking.status === 'completed' ? 'paid' : 'pending'
        };
      });
      
      // Calculate statistics
      const totalRevenue = formattedBookings.reduce((sum, booking) => sum + booking.revenue, 0);
      const completedBookings = formattedBookings.filter(booking => booking.status === 'completed').length;
      const cancelledBookings = formattedBookings.filter(booking => booking.status === 'cancelled').length;
      const averageRevenue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
      
      console.log('Successfully processed booking data');
      
      // Set cache headers to prevent caching
      return NextResponse.json({
        bookings: formattedBookings,
        stats: {
          totalBookings: formattedBookings.length,
          completedBookings,
          cancelledBookings,
          totalRevenue,
          averageRevenue
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (sqlError) {
      console.error('SQL query error:', sqlError);
      
      // Detect connection issues
      let errorMessage = 'Database query failed';
      if (sqlError.code === 'ECONNREFUSED' || sqlError.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection error - server may be unavailable';
      } else if (sqlError.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database authentication failed';
      } else if (sqlError.code === 'PROTOCOL_CONNECTION_LOST') {
        errorMessage = 'Database connection was lost during query';
      }
      
      return NextResponse.json({
        error: 'Failed to fetch booking history',
        message: errorMessage,
        code: sqlError.code || 'UNKNOWN_ERROR'
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching cremation history:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
} 