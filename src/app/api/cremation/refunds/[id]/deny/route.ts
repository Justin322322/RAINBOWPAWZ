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

    const { reason } = await request.json().catch(() => ({ reason: 'Refund denied by provider' }));

    const rows = await query(`SELECT booking_id FROM refunds WHERE id = ?`, [refundId]) as any[];
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    const bookingId: number = rows[0].booking_id;

    await query(`
      UPDATE refunds
      SET status = 'failed', notes = CONCAT(COALESCE(notes, ''), '\nDenied: ', ?), updated_at = NOW()
      WHERE id = ?
    `, [reason || 'Refund denied', refundId]);

    // Optional: notify user of denial
    try {
      await createPaymentNotification(bookingId, 'payment_failed');
    } catch (e) {
      console.error('Failed to send refund denial notification:', e);
    }

    return NextResponse.json({ success: true, message: 'Refund request denied.' });
  } catch (error) {
    console.error('Error denying refund:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


