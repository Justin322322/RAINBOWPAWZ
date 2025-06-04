import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      accountType = parts.length === 2 ? parts[1] : null;
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({
        error: 'Invalid booking ID'
      }, { status: 400 });
    }

    // Fetch booking details with user information
    const bookingResult = await query(`
      SELECT
        b.*,
        u.first_name,
        u.last_name,
        u.email as user_email,
        u.phone as user_phone,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        sp.name as provider_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN service_providers sp ON b.provider_id = sp.provider_id
      WHERE b.booking_id = ?
      LIMIT 1
    `, [id]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found'
      }, { status: 404 });
    }

    const booking = bookingResult[0];

    return NextResponse.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Error fetching booking details:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
