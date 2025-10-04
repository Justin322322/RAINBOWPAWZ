import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Verify ownership
    const ownershipCheck = await query(
      'SELECT provider_id FROM service_providers WHERE provider_id = ? AND user_id = ?',
      [providerId, user.userId]
    ) as any[];

    if (!ownershipCheck || ownershipCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get booking counts per date for the week
    // Count all active and pending bookings (exclude only cancelled)
    const bookings = await query(
      `SELECT 
        DATE(booking_date) as date,
        COUNT(*) as count
      FROM bookings
      WHERE provider_id = ?
        AND booking_date BETWEEN ? AND ?
        AND status IN ('pending', 'confirmed', 'in_progress', 'completed')
      GROUP BY DATE(booking_date)
      ORDER BY booking_date`,
      [providerId, startDate, endDate]
    ) as any[];

    // Convert to a map for easy lookup (stable YYYY-MM-DD keys without TZ issues)
    const bookingCounts: Record<string, number> = {};
    bookings.forEach((booking: any) => {
      const dateStr = typeof booking.date === 'string'
        ? booking.date
        : new Date(booking.date).toISOString().split('T')[0];
      bookingCounts[dateStr] = parseInt(booking.count) || 0;
    });

    return NextResponse.json({
      success: true,
      bookingCounts,
      totalBookings: bookings.reduce((sum: number, b: any) => sum + (parseInt(b.count) || 0), 0)
    });

  } catch (error) {
    console.error('Error fetching weekly bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly bookings' },
      { status: 500 }
    );
  }
}

