import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db/query';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.accountType !== 'business') {
      return NextResponse.json({ 
        error: 'Access denied. Business account required.' 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const refundId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { action, rejection_reason, status } = body;

    // Get refund details
    const refundResult = await query(
      'SELECT * FROM refunds WHERE id = ?',
      [refundId]
    ) as any[];

    if (refundResult.length === 0) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    const refund = refundResult[0];

    // Verify the refund belongs to this business
    const bookingResult = await query(
      'SELECT provider_id FROM bookings WHERE id = ?',
      [refund.booking_id]
    ) as any[];

    if (bookingResult.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ?',
      [parseInt(authResult.userId)]
    ) as any[];

    if (providerResult.length === 0 || providerResult[0].provider_id !== bookingResult[0].provider_id) {
      return NextResponse.json({ 
        error: 'This refund does not belong to your business' 
      }, { status: 403 });
    }

    // Handle different actions
    switch (action) {
      case 'approve_refund':
        await query(
          `UPDATE refunds 
           SET status = 'completed', 
               processed_at = NOW(), 
               completed_at = NOW(),
               processed_by = ?
           WHERE id = ?`,
          [parseInt(authResult.userId), refundId]
        );

        // Update booking payment status
        await query(
          `UPDATE bookings 
           SET payment_status = 'refunded' 
           WHERE id = ?`,
          [refund.booking_id]
        );

        return NextResponse.json({ 
          success: true, 
          message: 'Refund approved successfully' 
        });

      case 'reject_refund':
        await query(
          `UPDATE refunds 
           SET status = 'failed', 
               notes = ?,
               processed_at = NOW(),
               processed_by = ?
           WHERE id = ?`,
          [rejection_reason || 'Rejected by business', parseInt(authResult.userId), refundId]
        );

        return NextResponse.json({ 
          success: true, 
          message: 'Refund rejected' 
        });

      case 'reset_refund':
        await query(
          `UPDATE refunds 
           SET status = ?, 
               processed_at = NULL,
               completed_at = NULL,
               notes = CONCAT(COALESCE(notes, ''), '\n[Reset by business]')
           WHERE id = ?`,
          [status || 'pending', refundId]
        );

        return NextResponse.json({ 
          success: true, 
          message: 'Refund reset to pending' 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing refund action:', error);
    return NextResponse.json({ 
      error: 'Failed to process refund action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
