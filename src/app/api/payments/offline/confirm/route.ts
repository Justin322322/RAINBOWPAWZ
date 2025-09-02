import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

async function ensureReceiptTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NULL,
      provider_id INT NULL,
      receipt_path TEXT NOT NULL,
      status ENUM('awaiting','confirmed','rejected') NOT NULL DEFAULT 'awaiting',
      notes TEXT NULL,
      confirmed_by INT NULL,
      confirmed_at DATETIME NULL,
      reject_reason TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_booking (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bookingId = Number(body?.bookingId);
    const action = body?.action as 'confirm' | 'reject';
    const reason = (body?.reason as string | undefined) || null;
    if (!bookingId || !action || !['confirm','reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await ensureReceiptTable();

    // Check if table exists; if not, we will operate directly on service_bookings as a fallback
    let tableExists = false;
    try {
      const t = await query("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'") as any[];
      tableExists = (t?.[0]?.c || 0) > 0;
    } catch {}

    if (tableExists) {
      // Ensure receipt exists in payment_receipts
      const rows = await query('SELECT id FROM payment_receipts WHERE booking_id = ? LIMIT 1', [bookingId]) as any[];
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'No receipt to confirm' }, { status: 404 });
      }
    }

    if (action === 'confirm') {
      if (tableExists) {
        await query(
          'UPDATE payment_receipts SET status = \"confirmed\", confirmed_by = ?, confirmed_at = NOW(), reject_reason = NULL WHERE booking_id = ?',
          [Number(user.userId), bookingId]
        );
      }
      // Update booking payment_status regardless of receipts table existence
      try {
        await query('UPDATE service_bookings SET payment_status = \"paid\" WHERE id = ?', [bookingId]);
      } catch {}
      return NextResponse.json({ success: true });
    } else {
      if (tableExists) {
        await query(
          'UPDATE payment_receipts SET status = \"rejected\", confirmed_by = ?, confirmed_at = NOW(), reject_reason = ? WHERE booking_id = ?',
          [Number(user.userId), reason, bookingId]
        );
      }
      try {
        await query('UPDATE service_bookings SET payment_status = \"awaiting_payment_confirmation\" WHERE id = ?', [bookingId]);
      } catch {}
      return NextResponse.json({ success: true });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}


