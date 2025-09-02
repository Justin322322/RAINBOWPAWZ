import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

async function ensurePaymentQrTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS provider_payment_qr (
      provider_id INT PRIMARY KEY,
      qr_path TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Ensure qr_path can hold larger base64 data (auto-migrate to MEDIUMTEXT if needed)
  const colInfo = await query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_payment_qr' AND COLUMN_NAME = 'qr_path'`
  ) as any[];
  const columnType = (colInfo?.[0]?.COLUMN_TYPE || '').toUpperCase();
  if (columnType && !columnType.includes('MEDIUMTEXT') && !columnType.includes('LONGTEXT')) {
    try {
      await query(`ALTER TABLE provider_payment_qr MODIFY COLUMN qr_path MEDIUMTEXT NULL`);
    } catch {
      // best-effort; ignore if no permission
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensurePaymentQrTable();

    // Resolve provider_id from users
    const rows = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ? LIMIT 1',
      [user.userId]
    ) as any[];

    const providerId = rows?.[0]?.provider_id;
    if (!providerId) {
      return NextResponse.json({ success: true, qrPath: null });
    }

    const qrRows = await query(
      'SELECT qr_path FROM provider_payment_qr WHERE provider_id = ? LIMIT 1',
      [providerId]
    ) as any[];

    return NextResponse.json({ success: true, qrPath: qrRows?.[0]?.qr_path || null });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payment QR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file') as unknown as File | null;
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

    // Resolve provider
    const rows = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ? LIMIT 1',
      [user.userId]
    ) as any[];
    const providerId = rows?.[0]?.provider_id;
    if (!providerId) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Convert file to base64 for database storage (similar to profile picture upload)
    console.log('Converting QR file to base64...');
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      console.error('Failed to read file buffer:', bufferError);
      return NextResponse.json({
        error: 'Failed to process file. Please try again.',
        code: 'FILE_READ_ERROR'
      }, { status: 400 });
    }

    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Data}`;
    console.log('QR file converted to base64, size:', base64Data.length);

    await ensurePaymentQrTable();

    // Store QR code in database
    console.log('Storing QR code in database...');
    const existing = await query(
      'SELECT provider_id FROM provider_payment_qr WHERE provider_id = ? LIMIT 1',
      [providerId]
    ) as any[];

    if (existing && existing.length > 0) {
      await query('UPDATE provider_payment_qr SET qr_path = ? WHERE provider_id = ?', [dataUrl, providerId]);
      console.log('QR code updated in database');
    } else {
      await query('INSERT INTO provider_payment_qr (provider_id, qr_path) VALUES (?, ?)', [providerId, dataUrl]);
      console.log('QR code inserted into database');
    }

    // Also denormalize onto service_providers if column exists (best-effort)
    try {
      await query('UPDATE service_providers SET payment_qr_path = ? WHERE provider_id = ?', [dataUrl, providerId]);
    } catch {
      console.log('Could not update service_providers table (column may not exist)');
    }

    return NextResponse.json({
      success: true,
      qrPath: dataUrl,
      message: 'Payment QR code uploaded successfully'
    });
  } catch (e: any) {
    console.error('[payment-qr] Upload failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to upload payment QR', details: e?.message }, { status: 500 });
  }
}


