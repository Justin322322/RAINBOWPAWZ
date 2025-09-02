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

    // Upload to Blob with proper error handling
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken || typeof blobToken !== 'string') {
      return NextResponse.json({
        error: 'Storage service not configured. Please contact support.',
        code: 'STORAGE_CONFIG_ERROR'
      }, { status: 500 });
    }

    let putFn: ((key: string, data: Buffer, options: any) => Promise<any>) | null = null;
    try {
      const { put } = await import('@vercel/blob');
      putFn = put;
    } catch (importError) {
      console.error('Failed to import blob storage:', importError);
      return NextResponse.json({
        error: 'Storage service unavailable. Please try again later.',
        code: 'STORAGE_IMPORT_ERROR'
      }, { status: 500 });
    }

    if (!putFn) {
      return NextResponse.json({
        error: 'Storage service not available. Please contact support.',
        code: 'STORAGE_FUNCTION_ERROR'
      }, { status: 500 });
    }

    // Convert file to buffer
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

    const ext = file.type.split('/')[1] || 'png';
    const key = `uploads/businesses/${user.userId}/payment_qr_${Date.now()}.${ext}`;

    let result;
    try {
      result = await putFn(key, Buffer.from(arrayBuffer), {
        access: 'public',
        contentType: file.type,
        token: blobToken,
      });
    } catch (uploadError) {
      console.error('Failed to upload to blob storage:', uploadError);
      return NextResponse.json({
        error: 'Failed to upload file. Please check your connection and try again.',
        code: 'UPLOAD_ERROR'
      }, { status: 500 });
    }

    const qrPath = result?.url || '';
    if (!qrPath) {
      return NextResponse.json({
        error: 'Upload completed but file URL is missing. Please try again.',
        code: 'UPLOAD_URL_MISSING'
      }, { status: 500 });
    }

    await ensurePaymentQrTable();

    const existing = await query(
      'SELECT provider_id FROM provider_payment_qr WHERE provider_id = ? LIMIT 1',
      [providerId]
    ) as any[];
    if (existing && existing.length > 0) {
      await query('UPDATE provider_payment_qr SET qr_path = ? WHERE provider_id = ?', [qrPath, providerId]);
    } else {
      await query('INSERT INTO provider_payment_qr (provider_id, qr_path) VALUES (?, ?)', [providerId, qrPath]);
    }

    // Also denormalize onto service_providers if column exists (best-effort)
    try {
      await query('UPDATE service_providers SET payment_qr_path = ? WHERE provider_id = ?', [qrPath, providerId]);
    } catch {}

    return NextResponse.json({ success: true, qrPath });
  } catch {
    return NextResponse.json({ error: 'Failed to upload payment QR' }, { status: 500 });
  }
}


