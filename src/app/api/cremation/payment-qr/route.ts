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

async function ensureCompatibleStorage(): Promise<void> {
  if (process.env.ALLOW_DDL === 'true') {
    // Create service_providers table if missing so we have a durable store
    if (!(await tableExists('service_providers'))) {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS service_providers (
            provider_id INT PRIMARY KEY,
            qr_path MEDIUMTEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch {
        // best-effort
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerIdParam = url.searchParams.get('providerId');

    let providerId: number | null = null;
    if (providerIdParam && !Number.isNaN(Number(providerIdParam))) {
      providerId = Number(providerIdParam);
    } else {
      // Fallback: if no providerId provided, allow business-auth to fetch own QR
      try {
        const user = await verifySecureAuth(request);
        if (user && user.accountType === 'business') {
          const rows = await query(
            'SELECT provider_id FROM service_providers WHERE user_id = ? LIMIT 1',
            [user.userId]
          ) as any[];
          providerId = rows?.[0]?.provider_id || null;
        }
      } catch {}
    }

    if (!providerId) {
      return NextResponse.json({ success: true, qrPath: null });
    }

    // Prefer service_providers.qr_path if the column exists; else fallback to service_providers.payment_qr_path
    let qrPath: string | null = null;

    if (await tableExists('service_providers') && await columnExists('service_providers', 'qr_path')) {
      try {
        const qrRows = await query(
          'SELECT qr_path FROM service_providers WHERE provider_id = ? LIMIT 1',
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

    // If DDL is allowed, ensure a compatible storage exists
    await ensureCompatibleStorage();

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

    const hasQrTable = await tableExists('service_providers');
    const hasQrPathColumn = await columnExists('service_providers', 'qr_path');
    const hasSpColumn = await columnExists('service_providers', 'payment_qr_path');

    if (!hasQrTable && !hasSpColumn) {
      // No place to save. Return a clear, actionable error.
      return NextResponse.json({
        error: 'No storage schema for payment QR',
        code: 'MISSING_QR_STORAGE',
        message: 'Neither service_providers table nor service_providers.payment_qr_path column exists. Enable ALLOW_DDL=true and redeploy to auto-create service_providers, or add the column/table via migration.'
      }, { status: 409 });
    }

    // Best-effort: write to service_providers.qr_path if available
    if (hasQrTable && hasQrPathColumn) {
      try {
        const existing = await query(
          'SELECT provider_id FROM service_providers WHERE provider_id = ? LIMIT 1',
          [providerId]
        ) as any[];
        if (existing && existing.length > 0) {
          await query('UPDATE service_providers SET qr_path = ? WHERE provider_id = ?', [dataUrl, providerId]);
        } else {
          await query('INSERT INTO service_providers (provider_id, qr_path) VALUES (?, ?)', [providerId, dataUrl]);
        }
      } catch {}
    }

    // Denormalize onto service_providers.payment_qr_path if column exists
    if (hasSpColumn) {
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


