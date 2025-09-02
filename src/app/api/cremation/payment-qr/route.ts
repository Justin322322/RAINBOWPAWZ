import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const rows = await query(
      `SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    ) as any[];
    return Number(rows?.[0]?.c || 0) > 0;
  } catch {
    return false;
  }
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const rows = await query(
      `SELECT COUNT(*) as c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [tableName, columnName]
    ) as any[];
    return Number(rows?.[0]?.c || 0) > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve provider_id from users
    const rows = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ? LIMIT 1',
      [user.userId]
    ) as any[];

    const providerId = rows?.[0]?.provider_id;
    if (!providerId) {
      return NextResponse.json({ success: true, qrPath: null });
    }

    // Prefer provider_payment_qr if the table exists, else fallback to service_providers.payment_qr_path
    let qrPath: string | null = null;

    if (await tableExists('provider_payment_qr')) {
      try {
        const qrRows = await query(
          'SELECT qr_path FROM provider_payment_qr WHERE provider_id = ? LIMIT 1',
          [providerId]
        ) as any[];
        qrPath = qrRows?.[0]?.qr_path || null;
      } catch {}
    }

    // Fallback to service_providers column if not found and column exists
    if (!qrPath && (await columnExists('service_providers', 'payment_qr_path'))) {
      try {
        const spRows = await query(
          'SELECT payment_qr_path FROM service_providers WHERE provider_id = ? LIMIT 1',
          [providerId]
        ) as any[];
        qrPath = spRows?.[0]?.payment_qr_path || null;
      } catch {}
    }

    return NextResponse.json({ success: true, qrPath });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch payment QR', details: e?.message }, { status: 500 });
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

    // Convert file to base64 for database storage
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch {
      return NextResponse.json({
        error: 'Failed to process file. Please try again.',
        code: 'FILE_READ_ERROR'
      }, { status: 400 });
    }

    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    // Best-effort: write to provider_payment_qr only if table exists (avoid DDL in production)
    if (await tableExists('provider_payment_qr')) {
      try {
        const existing = await query(
          'SELECT provider_id FROM provider_payment_qr WHERE provider_id = ? LIMIT 1',
          [providerId]
        ) as any[];
        if (existing && existing.length > 0) {
          await query('UPDATE provider_payment_qr SET qr_path = ? WHERE provider_id = ?', [dataUrl, providerId]);
        } else {
          await query('INSERT INTO provider_payment_qr (provider_id, qr_path) VALUES (?, ?)', [providerId, dataUrl]);
        }
      } catch {}
    }

    // Denormalize onto service_providers only if column exists
    if (await columnExists('service_providers', 'payment_qr_path')) {
      try {
        await query('UPDATE service_providers SET payment_qr_path = ? WHERE provider_id = ?', [dataUrl, providerId]);
      } catch (e: any) {
        return NextResponse.json({ error: 'Failed to save payment QR', details: e?.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, qrPath: dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to upload payment QR', details: e?.message }, { status: 500 });
  }
}


