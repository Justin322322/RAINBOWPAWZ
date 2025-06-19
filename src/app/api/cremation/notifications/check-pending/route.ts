import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

/**
 * API endpoint to check for pending bookings and create notifications
 * GET /api/cremation/notifications/check-pending
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    // Get the provider ID for this business user
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ?',
      [user.userId]
    ) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({ error: 'Service provider not found' }, { status: 404 });
    }

    const providerId = providerResult[0].provider_id;

    // Check for pending bookings for this provider
    const pendingBookings = await query(`
      SELECT COUNT(*) as count
      FROM service_bookings
      WHERE provider_id = ? AND status = 'pending'
    `, [providerId]) as any[];

    const pendingCount = pendingBookings[0]?.count || 0;

    return NextResponse.json({
      success: true,
      hasPending: pendingCount > 0,
      pendingCount
    });

  } catch (error) {
    console.error('Error checking pending bookings:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
