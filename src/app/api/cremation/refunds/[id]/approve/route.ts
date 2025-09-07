import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const refundId = parseInt(params.id);
    if (!Number.isFinite(refundId)) {
      return NextResponse.json({ error: 'Invalid refund id' }, { status: 400 });
    }

    // Get refund + booking context
    const refundRowQuery = `
      SELECT r.id as refund_id, r.booking_id, r.amount, r.status as refund_status,
             sb.status as booking_status, sb.payment_status, sb.payment_method
      FROM refunds r
      JOIN service_bookings sb ON sb.id = r.booking_id
      WHERE r.id = ?
      LIMIT 1
    `;
    const rows = await query(refundRowQuery, [refundId]) as any[];
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    const ctx = rows[0];
    const bookingId: number = ctx.booking_id;

    // Validate booking is cancelled and receipt is confirmed paid for manual QR
    // Check payment_receipts status
    const receiptRows = await query(
      `SELECT status FROM payment_receipts WHERE booking_id = ? ORDER BY uploaded_at DESC LIMIT 1`,
      [bookingId]
    ) as any[];
    const receiptStatus: string | null = receiptRows?.[0]?.status || null;

    if (ctx.booking_status !== 'cancelled') {
      return NextResponse.json({ error: 'Booking is not cancelled' }, { status: 400 });
    }

    if (receiptStatus !== 'confirmed') {
      return NextResponse.json({ error: 'Payment receipt not confirmed' }, { status: 400 });
    }

    // Proceed to mark refunded (manual QR path). Use refunds.amount if present, else fallback to booking price
    const amount = parseFloat(ctx.amount || 0);
    const manualRefundId = `qr_refund_${bookingId}_${Date.now()}`;

    // Update booking payment_status and insert manual refund transaction
    await query(`
      UPDATE service_bookings SET payment_status = 'refunded' WHERE id = ?
    `, [bookingId]);

    await query(`
      INSERT INTO payment_transactions (
        booking_id, amount, currency, payment_method, status, provider,
        paymongo_refund_id, created_at
      ) VALUES (?, ?, 'PHP', 'qr_manual', 'refunded', 'manual', ?, NOW())
    `, [bookingId, amount, manualRefundId]);

    // Update refund record
    await query(`
      UPDATE refunds SET status = 'processed', processed_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [user.userId, refundId]);

    // Notify user
    try {
      await createPaymentNotification(bookingId, 'payment_refunded');
    } catch (e) {
      console.error('Failed to send refund notification:', e);
    }

    return NextResponse.json({ success: true, message: 'Refund approved and processed.' });
  } catch (error) {
    console.error('Error approving refund:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


