/**
 * Cremation Business Booking Cancellation API
 * Allows cremation businesses to cancel bookings and initiate refunds
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db/query';
import { cancelBookingWithRefund } from '@/services/bookingCancellationService';
import { createBookingNotification } from '@/utils/comprehensiveNotificationService';
import { ensureCancellationReasonColumn } from '@/lib/db/migrations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business users can access this endpoint
    if (authResult.accountType !== 'business') {
      return NextResponse.json({ 
        error: 'Access denied. Business account required.' 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Ensure cancellation_reason column exists (auto-migration)
    await ensureCancellationReasonColumn();

    // Get the business provider ID
    const providerQuery = `
      SELECT sp.provider_id 
      FROM service_providers sp 
      WHERE sp.user_id = ?
    `;
    const providerResult = await query(providerQuery, [parseInt(authResult.userId)]) as any[];
    
    if (providerResult.length === 0) {
      return NextResponse.json({ 
        error: 'No cremation business found for this user' 
      }, { status: 404 });
    }

    const providerId = providerResult[0].provider_id;

    // Validate that the booking exists and belongs to this provider
    const bookingExistsQuery = `
      SELECT 
        id, 
        status, 
        COALESCE(payment_status, 'not_paid') as payment_status, 
        COALESCE(total_price, base_price, 0) as price, 
        pet_name,
        user_id
      FROM bookings
      WHERE id = ? AND provider_id = ?
    `;
    const existingBooking = await query(bookingExistsQuery, [bookingId, providerId]) as any[];

    if (!existingBooking || existingBooking.length === 0) {
      return NextResponse.json({
        error: 'Booking not found or does not belong to this provider'
      }, { status: 404 });
    }

    const bookingData = existingBooking[0];

    // Check if booking is already cancelled
    if (bookingData.status === 'cancelled') {
      return NextResponse.json({
        error: 'Booking is already cancelled'
      }, { status: 400 });
    }

    // Check if booking can be cancelled (only pending or confirmed bookings can be cancelled)
    if (!['pending', 'confirmed'].includes(bookingData.status)) {
      return NextResponse.json({
        error: `Cannot cancel booking with status: ${bookingData.status}`
      }, { status: 400 });
    }

    // Get request body for cancellation reason
    const body = await request.json();
    const { reason, notes } = body;

    if (!reason) {
      return NextResponse.json({
        error: 'Cancellation reason is required'
      }, { status: 400 });
    }

    // Store cancellation reason in the database
    await query(
      `UPDATE bookings SET cancellation_reason = ? WHERE id = ?`,
      [reason, bookingId]
    );

    // Get client IP for audit trail
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Use the booking cancellation service with refund processing
    const cancellationResult = await cancelBookingWithRefund({
      bookingId: parseInt(bookingId),
      reason: reason,
      cancelledBy: parseInt(authResult.userId),
      cancelledByType: 'provider',
      notes: notes || 'Cancelled by cremation business',
      ipAddress: clientIp
    });

    if (!cancellationResult.success) {
      return NextResponse.json({
        error: cancellationResult.message || 'Failed to cancel booking',
        details: cancellationResult.error
      }, { status: 400 });
    }

    // Send booking cancellation notifications
    try {
      await createBookingNotification(parseInt(bookingId), 'booking_cancelled', {
        reason: reason,
        refund_initiated: cancellationResult.refundInitiated,
        refund_type: cancellationResult.refundType,
        refund_id: cancellationResult.refundId,
        cancelled_by: 'business'
      });
    } catch (notificationError) {
      console.error('Error sending cancellation notifications:', notificationError);
      // Continue with the process even if notifications fail
    }

    // Return success response with refund information
    return NextResponse.json({
      success: true,
      message: cancellationResult.message,
      booking: {
        id: bookingId,
        status: 'cancelled'
      },
      refund_initiated: cancellationResult.refundInitiated,
      refund_id: cancellationResult.refundId,
      refund_type: cancellationResult.refundType,
      refund_instructions: cancellationResult.refundInstructions
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
