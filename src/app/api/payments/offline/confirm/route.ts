import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { processRefund } from '@/services/refundService';

async function ensureReceiptTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      receipt_path VARCHAR(500),
      notes TEXT,
      status ENUM('awaiting', 'confirmed', 'rejected') DEFAULT 'awaiting',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_by INT NULL,
      confirmed_at TIMESTAMP NULL,
      rejection_reason TEXT,
      INDEX idx_booking_id (booking_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [confirm] Starting payment confirmation process');

    const user = await verifySecureAuth(request);
    console.log('👤 [confirm] Auth result:', { userId: user?.userId, accountType: user?.accountType });

    if (!user || user.accountType !== 'business') {
      console.log('❌ [confirm] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bookingId = Number(body?.bookingId);
    const action = body?.action as 'confirm' | 'reject';
    const reason = (body?.reason as string | undefined) || null;

    console.log('📝 [confirm] Request params:', { bookingId, action, reason });

    if (!bookingId || !action || !['confirm','reject'].includes(action)) {
      console.log('❌ [confirm] Invalid parameters:', { bookingId, action });
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Try to ensure table exists, but don't fail if DDL is blocked
    try {
      await ensureReceiptTable();
    } catch {
      // Continue gracefully; we'll fallback to updating booking only
    }

    // Check if table exists; if not, we will operate directly on bookings as a fallback
    let tableExists = false;
    try {
      const t = await query("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'") as any[];
      tableExists = (t?.[0]?.c || 0) > 0;
      console.log('📊 [confirm] Payment receipts table exists:', tableExists);
    } catch (tableCheckError) {
      console.warn('⚠️ [confirm] Could not check payment_receipts table existence:', tableCheckError);
    }

    if (tableExists) {
      // Ensure receipt exists in payment_receipts
      console.log('🔍 [confirm] Checking for existing receipt');
      const rows = await query('SELECT id FROM payment_receipts WHERE booking_id = ? LIMIT 1', [bookingId]) as any[];
      console.log('📄 [confirm] Receipt lookup result:', { found: rows && rows.length > 0, count: rows?.length });
      if (!rows || rows.length === 0) {
        console.log('❌ [confirm] No receipt found for booking:', bookingId);
        return NextResponse.json({ error: 'No receipt to confirm' }, { status: 404 });
      }
    }

    if (action === 'confirm') {
      if (tableExists) {
        console.log('✅ [confirm] Updating payment_receipts table');
        await query(
          'UPDATE payment_receipts SET status = \"confirmed\", confirmed_by = ?, confirmed_at = NOW(), rejection_reason = NULL WHERE booking_id = ?',
          [parseInt(user.userId), bookingId]
        );
      }
      // Update booking payment_status regardless of receipts table existence
      console.log('✅ [confirm] Updating bookings table');
      try {
        await query('UPDATE bookings SET payment_status = \"paid\" WHERE id = ?', [bookingId]);
        console.log('✅ [confirm] Payment confirmed successfully');
      } catch (updateError) {
        console.error('❌ [confirm] Failed to UPDATE bookings:', updateError);
        throw updateError;
      }
      return NextResponse.json({ success: true });
    } else {
      // Capture current booking info before changing status
      let bookingInfo: any | null = null;
      try {
        const rows = await query(
          `SELECT id, user_id, COALESCE(total_price, base_price, 0) AS amount, 
                  COALESCE(payment_method, 'cash') AS payment_method,
                  COALESCE(payment_status, 'not_paid') AS payment_status
           FROM bookings WHERE id = ? LIMIT 1`,
          [bookingId]
        ) as any[];
        bookingInfo = rows && rows.length > 0 ? rows[0] : null;
      } catch {}

      if (tableExists) {
        console.log('❌ [confirm] Rejecting receipt in payment_receipts table');
        await query(
          'UPDATE payment_receipts SET status = \"rejected\", confirmed_by = ?, confirmed_at = NOW(), rejection_reason = ? WHERE booking_id = ?',
          [parseInt(user.userId), reason, bookingId]
        );
      }
      console.log('🔄 [confirm] Resetting booking payment status');
      try {
        await query('UPDATE bookings SET payment_status = \"awaiting_payment_confirmation\" WHERE id = ?', [bookingId]);
        console.log('✅ [confirm] Receipt rejected successfully');
      } catch (updateError) {
        console.error('❌ [confirm] Failed to UPDATE bookings:', updateError);
        throw updateError;
      }
      // If this booking had been marked paid via QR/manual, create a manual refund record for review
      try {
        const wasPaid = (bookingInfo?.payment_status || '').toLowerCase() === 'paid';
        const method = (bookingInfo?.payment_method || '').toLowerCase();
        const isQR = method.includes('qr') || method.includes('scan') || method.includes('manual');
        if (bookingInfo && wasPaid && isQR) {
          await processRefund({
            bookingId: bookingId,
            amount: Number(bookingInfo.amount || 0),
            reason: 'Receipt rejected - reversing QR payment',
            initiatedBy: parseInt(user.userId),
            initiatedByType: 'staff',
            notes: reason || undefined,
          });
        }
      } catch (refundErr) {
        console.warn('⚠️ [confirm] Failed to create refund after receipt rejection (non-fatal):', refundErr);
      }
      return NextResponse.json({ success: true });
    }
  } catch (e) {
    console.error('❌ [confirm] Critical error in payment confirmation:', e);
    console.error('❌ [confirm] Error stack:', e instanceof Error ? e.stack : 'No stack trace');

    // Check for specific database errors
    if (e && typeof e === 'object' && 'code' in e) {
      console.error('❌ [confirm] Database error code:', (e as any).code);
      console.error('❌ [confirm] Database error sqlMessage:', (e as any).sqlMessage);
    }

    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
    return NextResponse.json({
      error: 'Failed to update payment status',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: e instanceof Error ? e.constructor.name : typeof e,
        hasCode: e && typeof e === 'object' && 'code' in e,
        hasSqlMessage: e && typeof e === 'object' && 'sqlMessage' in e
      } : undefined
    }, { status: 500 });
  }
}


