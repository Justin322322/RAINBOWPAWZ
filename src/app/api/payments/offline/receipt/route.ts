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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file') as unknown as File | null;
    const bookingIdRaw = form.get('bookingId') as string | null;
    const notes = (form.get('notes') as string | null) || null;

    if (!bookingIdRaw || isNaN(Number(bookingIdRaw))) {
      return NextResponse.json({ error: 'Missing or invalid bookingId' }, { status: 400 });
    }
    const bookingId = Number(bookingIdRaw);

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WEBP allowed' }, { status: 400 });
    }
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      return NextResponse.json({ error: 'File too large (10MB max)' }, { status: 413 });
    }

    // Resolve provider_id and provider user_id from booking (best-effort)
    let providerId: number | null = null;
    let providerUserId: number | null = null;
    try {
      const rows = await query(
        'SELECT provider_id FROM service_bookings WHERE id = ? LIMIT 1',
        [bookingId]
      ) as any[];
      providerId = rows?.[0]?.provider_id ?? null;
      if (providerId) {
        const prow = await query('SELECT user_id FROM service_providers WHERE provider_id = ? LIMIT 1', [providerId]) as any[];
        providerUserId = prow?.[0]?.user_id ?? null;
      }
    } catch {}

    // Upload to Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let putFn: any = null;
    if (typeof blobToken === 'string' && blobToken.length > 0) {
      try {
        const blob = await import('@vercel/blob');
        putFn = (blob as any)?.put;
      } catch {}
    }

    // Prepare file data once
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.type.split('/')[1] || 'png';

    // Prefer Blob storage; gracefully fallback to base64 data URL if not configured
    let path = '';
    if (putFn) {
      const key = `uploads/bookings/${bookingId}/payment_receipt_${Date.now()}.${ext}`;
      const result = await putFn(key, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType: file.type,
        token: blobToken,
      });
      path = result?.url || '';
    }
    if (!path) {
      // Fallback: store as base64 data URL so upload still works without blob config
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      path = `data:${file.type};base64,${base64}`;
    }

    await ensureReceiptTable();

    // Upsert by booking
    const existing = await query(
      'SELECT id FROM payment_receipts WHERE booking_id = ? LIMIT 1',
      [bookingId]
    ) as any[];

    if (existing && existing.length > 0) {
      await query(
        'UPDATE payment_receipts SET receipt_path = ?, status = \"awaiting\", notes = ?, user_id = ?, provider_id = ?, updated_at = NOW() WHERE booking_id = ?',
        [path, notes, Number(user.userId), providerId, bookingId]
      );
    } else {
      await query(
        'INSERT INTO payment_receipts (booking_id, user_id, provider_id, receipt_path, status, notes) VALUES (?, ?, ?, ?, \"awaiting\", ?)',
        [bookingId, Number(user.userId), providerId, path, notes]
      );
    }

    // Best-effort: notify provider
    try {
      if (providerUserId) {
        const { createBusinessNotification } = await import('@/utils/businessNotificationService');
        await createBusinessNotification({
          userId: providerUserId,
          title: 'Payment Receipt Submitted',
          message: `Booking #${bookingId} has a new receipt awaiting confirmation.`,
          type: 'info',
          link: '/cremation/dashboard',
          shouldSendEmail: false,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, receiptPath: path });
  } catch {
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const bookingIdRaw = url.searchParams.get('bookingId');
    if (!bookingIdRaw || isNaN(Number(bookingIdRaw))) {
      return NextResponse.json({ error: 'Missing or invalid bookingId' }, { status: 400 });
    }
    const bookingId = Number(bookingIdRaw);

    await ensureReceiptTable();

    const rows = await query(
      'SELECT booking_id, user_id, provider_id, receipt_path, status, notes, confirmed_by, confirmed_at, reject_reason, created_at, updated_at FROM payment_receipts WHERE booking_id = ? LIMIT 1',
      [bookingId]
    ) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, receipt: rows[0] });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}


