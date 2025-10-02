import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, amount, reason } = body;

    if (!bookingId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify booking belongs to user
    const bookings = await query(
      'SELECT id, user_id, payment_status, payment_method, total_price, provider_id FROM bookings WHERE id = ?',
      [bookingId]
    ) as any[];

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    if (booking.user_id !== Number(user.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Only paid bookings can be refunded' },
        { status: 400 }
      );
    }

    // Check if refund already exists
    const existingRefunds = await query(
      'SELECT id, status FROM refunds WHERE booking_id = ? AND status NOT IN ("cancelled", "failed")',
      [bookingId]
    ) as any[];

    if (existingRefunds && existingRefunds.length > 0) {
      return NextResponse.json(
        { error: 'A refund request already exists for this booking' },
        { status: 400 }
      );
    }

    // Create refund request
    const result = await query(
      `INSERT INTO refunds (
        booking_id, user_id, amount, reason, status, 
        refund_type, payment_method, initiated_at
      ) VALUES (?, ?, ?, ?, 'pending', 'manual', ?, NOW())`,
      [bookingId, Number(user.userId), amount, reason, booking.payment_method || 'qr_code']
    ) as any;

    const refundId = result.insertId;

    // Update booking with refund_id
    await query('UPDATE bookings SET refund_id = ? WHERE id = ?', [
      refundId,
      bookingId
    ]);

    // Notify provider
    try {
      const providerData = await query(
        'SELECT user_id FROM service_providers WHERE provider_id = ?',
        [booking.provider_id]
      ) as any[];

      if (providerData && providerData.length > 0) {
        const { createBusinessNotification } = await import(
          '@/utils/businessNotificationService'
        );
        await createBusinessNotification({
          userId: providerData[0].user_id,
          title: 'Refund Request Received',
          message: `Booking #${bookingId} has a refund request for ₱${amount}`,
          type: 'warning',
          link: `/cremation/refunds`,
          shouldSendEmail: true
        });
      }
    } catch (error) {
      console.error('Failed to notify provider:', error);
    }

    return NextResponse.json({
      success: true,
      refundId,
      message: 'Refund request submitted successfully'
    });
  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit refund request' },
      { status: 500 }
    );
  }
}
